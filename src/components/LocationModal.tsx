"use client";

import { useState, useEffect, useRef } from "react";
import { SearchBox } from "@mapbox/search-js-react";
import { MapPin as PinIcon, Map as MapIcon } from "lucide-react";
import MapView from "./MapView";

interface ReverseFeature {
  properties: {
    name: string;
    feature_type: "poi" | "address" | "street" | "place" | string;
    address: string;
    full_address?: string;
    place_formatted?: string;
  };
  geometry: { coordinates: [number, number] };
}

export interface LocationPoint { lat: number; lng: number; address: string; }

interface LocationModalProps {
  mode: "origin" | "dest" | null;
  originPoint?: LocationPoint | null;
  destPoint?: LocationPoint | null;
  onConfirmOrigin: (point: LocationPoint) => void;
  onConfirmDest: (text: string, pin: { lat: number; lng: number } | null) => void;
  onClose: () => void;
}

function getNombreLegible(features: ReverseFeature[]): string {
  if (!features.length) return "";
  for (const f of features) {
    const s = f.properties.full_address || f.properties.address || f.properties.name;
    if (s) return s;
  }
  return "";
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
  if (!token) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  try {
    const res = await fetch(
      `https://api.mapbox.com/search/searchbox/v1/reverse?longitude=${lng}&latitude=${lat}&access_token=${token}&language=es&limit=3`
    );
    const data = await res.json();
    const name = getNombreLegible(data.features ?? []);
    return name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// Used only by the "drag pin on map" flow. Unlike the Search Box /reverse
// endpoint above (tuned to also surface nearby POIs, e.g. business names),
// the Geocoding v6 /reverse endpoint never returns POIs — per Mapbox's docs,
// "the Geocoding v6 API no longer provides POI data" — and orders results by
// spatial hierarchy (most granular address first), so the first feature is
// already the precise address at that exact point.
function getPreciseAddress(features: ReverseFeature[]): string {
  if (!features.length) return "";
  const f = features[0];
  return f.properties.full_address || f.properties.place_formatted || f.properties.name || "";
}

// Straight-line distance in meters — good enough at the sub-100m scale we use
// this for (deciding whether a nearby POI is "at" the dragged pin or just close).
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// v6 never returns a place name (it's address-only by design), but the user
// wants the place's name when the pin lands right on one (e.g. a mall or a
// landmark), not just the bare street address. Only the Search Box API knows
// place names, so we ask it separately for the nearest POI and only trust its
// name if that POI is essentially under the pin — otherwise a POI merely
// "nearby" would misleadingly look like the pin is on top of it.
const POI_NEAR_THRESHOLD_METERS = 30;

async function fetchNearbyPoiName(lat: number, lng: number, token: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/search/searchbox/v1/reverse?longitude=${lng}&latitude=${lat}&access_token=${token}&language=es&limit=5&types=poi`
    );
    const data = await res.json();
    const features: ReverseFeature[] = data.features ?? [];
    // The reverse endpoint doesn't reliably honor `types=poi` — it can still
    // return a plain address feature, which would otherwise look identical
    // to the v6 result and defeat the whole point of this lookup.
    const feature = features.find((f) => f.properties.feature_type === "poi");
    if (!feature) return null;
    const [flng, flat] = feature.geometry.coordinates;
    if (distanceMeters(lat, lng, flat, flng) > POI_NEAR_THRESHOLD_METERS) return null;
    return feature.properties.name || feature.properties.address || feature.properties.full_address || null;
  } catch {
    return null;
  }
}

async function reverseGeocodePrecise(lat: number, lng: number): Promise<string> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
  if (!token) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  try {
    const [addressData, poiName] = await Promise.all([
      fetch(
        `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&access_token=${token}&language=es&limit=1`
      ).then((r) => r.json()),
      fetchNearbyPoiName(lat, lng, token),
    ]);
    const address = getPreciseAddress(addressData.features ?? []);
    return poiName || address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

const searchBoxTheme = {
  variables: {
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    borderRadius: "14px",
    border: "1.5px solid var(--border-strong)",
    background: "var(--bg)",
    colorText: "var(--text)",
    colorPlaceholder: "var(--text-dim)",
    boxShadow: "none",
  },
};

export default function LocationModal({
  mode,
  originPoint,
  destPoint,
  onConfirmOrigin,
  onConfirmDest,
  onClose,
}: LocationModalProps) {
  const isOpen = mode !== null;

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [originAddress, setOriginAddress] = useState("");

  const [destText, setDestText] = useState("");
  const [destPin, setDestPin] = useState<{ lat: number; lng: number } | null>(null);
  const [destFromMap, setDestFromMap] = useState(false);

  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapPickerCenter, setMapPickerCenter] = useState<[number, number] | undefined>(undefined);
  const [mapPickerPending, setMapPickerPending] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [mapPickerResolving, setMapPickerResolving] = useState(false);
  const pickerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Separate ref per mode — prevents stale ref after remount
  const searchBoxRef = useRef(null);

  // Sync state when modal opens for a specific mode
  // Sync state when modal opens for a specific mode (render-time reset, no effect)
  const lastOpenedModeRef = useRef<"origin" | "dest" | null>(null);

  useEffect(() => {
    if (isOpen && lastOpenedModeRef.current !== mode) {
      lastOpenedModeRef.current = mode;
      setGpsError("");
      if (mode === "origin") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOriginCoords(originPoint ? { lat: originPoint.lat, lng: originPoint.lng } : null);
        setOriginAddress(originPoint?.address ?? "");
      } else {
        setDestPin(destPoint ? { lat: destPoint.lat, lng: destPoint.lng } : null);
        setDestText(destPoint?.address ?? "");
        setDestFromMap(false);
        setMapPickerOpen(false);
      }
    } else if (!isOpen && lastOpenedModeRef.current !== null) {
      lastOpenedModeRef.current = null;
    }
  }, [isOpen, mode, originPoint, destPoint]);

  async function handleGps() {
    if (!navigator.geolocation) { setGpsError("Geolocalización no disponible."); return; }
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        const address = await reverseGeocode(lat, lng);
        setOriginCoords({ lat, lng });
        setOriginAddress(address);
        setGpsLoading(false);
      },
      () => { setGpsError("No se pudo obtener la ubicación. Verifica los permisos."); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function openMapPicker() {
    const start = destPin ?? originCoords ?? null;
    setMapPickerCenter(start ? [start.lat, start.lng] : undefined);
    setMapPickerPending(null);
    setMapPickerResolving(true);
    if (start) {
      reverseGeocodePrecise(start.lat, start.lng).then((address) => {
        setMapPickerPending({ lat: start.lat, lng: start.lng, address });
        setMapPickerResolving(false);
      });
    } else {
      setMapPickerResolving(false);
    }
    setMapPickerOpen(true);
  }

  function handlePickerCenterChange(lat: number, lng: number) {
    setMapPickerResolving(true);
    if (pickerDebounceRef.current) clearTimeout(pickerDebounceRef.current);
    pickerDebounceRef.current = setTimeout(async () => {
      const address = await reverseGeocodePrecise(lat, lng);
      setMapPickerPending({ lat, lng, address });
      setMapPickerResolving(false);
    }, 500);
  }

  function handlePickerConfirm() {
    if (!mapPickerPending) return;
    setDestText(mapPickerPending.address);
    setDestPin({ lat: mapPickerPending.lat, lng: mapPickerPending.lng });
    setDestFromMap(true);
    setMapPickerOpen(false);
  }

  function handlePickerCancel() {
    setMapPickerOpen(false);
  }

  function handleConfirm() {
    if (mode === "origin" && originCoords) {
      onConfirmOrigin({
        lat: originCoords.lat, lng: originCoords.lng,
        address: originAddress || `${originCoords.lat.toFixed(5)}, ${originCoords.lng.toFixed(5)}`,
      });
    } else if (mode === "dest") {
      onConfirmDest(destText.trim(), destPin);
    }
  }

  const canConfirm = mode === "origin"
    ? !!originCoords
    : destText.trim().length > 0 && !!destPin;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "var(--bg)", display: "flex", flexDirection: "column",
      transform: isOpen ? "translateY(0)" : "translateY(100%)",
      transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
      willChange: "transform",
    }}>
      {/* Header */}
      <div className="screen-header" style={{ flexShrink: 0 }}>
        <button onClick={mapPickerOpen ? handlePickerCancel : onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", padding: "4px 8px", color: "var(--text)" }}>
          ←
        </button>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "17px" }}>
          {mapPickerOpen ? "Ubica tu destino en el mapa" : mode === "origin" ? "¿Desde dónde sales?" : "¿A dónde vas?"}
        </span>
      </div>

      {mapPickerOpen ? (
        <div style={{ flex: 1, position: "relative" }}>
          <MapView center={mapPickerCenter} zoom={16} height="100%" crosshair onCenterChange={handlePickerCenterChange} />
          <div style={{
            position: "absolute", left: 16, right: 16, bottom: 16,
            display: "flex", flexDirection: "column", gap: "10px",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "13px 14px", borderRadius: "var(--r-md)",
              border: "1.5px solid var(--border-strong)", background: "var(--surface)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}>
              {mapPickerResolving
                ? <span className="spinner spinner-sm" />
                : <span style={{ fontSize: "1rem", flexShrink: 0 }}>📍</span>}
              <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {mapPickerResolving ? "Buscando dirección..." : mapPickerPending?.address ?? "Arrastra el mapa para ubicar el punto"}
              </span>
            </div>
            <button type="button" onClick={handlePickerConfirm} disabled={!mapPickerPending || mapPickerResolving}
              style={{
                width: "100%", padding: "15px", borderRadius: "var(--r-md)",
                border: "none", background: "var(--primary)", color: "white",
                fontSize: "15px", fontWeight: 700, fontFamily: "inherit",
                cursor: (!mapPickerPending || mapPickerResolving) ? "default" : "pointer",
                opacity: (!mapPickerPending || mapPickerResolving) ? 0.4 : 1,
                transition: "opacity var(--t-fast)",
              }}>
              Confirmar ubicación
            </button>
          </div>
        </div>
      ) : (
      <div style={{ padding: "24px 16px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
        {mode === "origin" && (
          <button type="button" onClick={handleGps} disabled={gpsLoading}
            style={{
              width: "100%", padding: "12px", borderRadius: "var(--r-md)",
              border: "1.5px solid var(--primary)", background: "var(--primary-xpale)",
              color: "var(--primary)", display: "flex", alignItems: "center",
              justifyContent: "center", gap: "10px",
              cursor: gpsLoading ? "default" : "pointer",
              fontFamily: "inherit", fontSize: "14px", fontWeight: 600,
            }}>
            {gpsLoading ? <span className="spinner spinner-sm" /> : <span>📍</span>}
            {gpsLoading ? "Obteniendo ubicación..." : "Usar mi ubicación actual"}
          </button>
        )}
        {gpsError && <p className="form-error" style={{ margin: 0 }}>{gpsError}</p>}
        {mode === "origin" && <p style={{ fontSize: "14px", textAlign: "center", margin: 0 }}>o busca tu dirección:</p>}

        {/*
          key={mode} forces a full remount when switching between "origin" and "dest".
          When GPS resolves (originCoords set via GPS), we show a readonly native input
          instead of SearchBox — Mapbox SearchBox is a web component that cannot be
          updated programmatically via .value.
        */}
        {mode === "origin" && originCoords && originAddress ? (
          <div style={{ position: "relative" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "13px 14px", borderRadius: "var(--r-md)",
              border: "1.5px solid var(--success)", background: "var(--success-pale)",
            }}>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>📍</span>
              <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {originAddress}
              </span>
              <button type="button"
                onClick={() => { setOriginCoords(null); setOriginAddress(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "var(--text-muted)", lineHeight: 1, padding: "2px", flexShrink: 0 }}>
                ×
              </button>
            </div>
          </div>
        ) : mode === "dest" && destFromMap && destPin && destText ? (
          <div style={{ position: "relative" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "13px 14px", borderRadius: "var(--r-md)",
              border: "1.5px solid var(--danger)", background: "var(--danger-pale)",
            }}>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>📍</span>
              <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {destText}
              </span>
              <button type="button" onClick={openMapPicker}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "var(--danger)", flexShrink: 0 }}>
                Cambiar
              </button>
              <button type="button"
                onClick={() => { setDestPin(null); setDestText(""); setDestFromMap(false); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "var(--text-muted)", lineHeight: 1, padding: "2px", flexShrink: 0 }}>
                ×
              </button>
            </div>
          </div>
        ) : (
          <div key={mode} style={{ position: "relative", width: "100%" }}>
            <SearchBox
              ref={searchBoxRef}
              accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""}
              options={{ language: "es", country: "co", types: "address,poi,neighborhood,postcode,district,place" }}
              placeholder={mode === "origin" ? "Escribe tu dirección de origen..." : "Escribe la dirección de destino..."}
              theme={searchBoxTheme}
              // Must stay controlled: SearchBox's internal effects key off `ref.current`
              // in their dependency arrays, which flips from undefined to the DOM node
              // on the render right after the first keystroke — re-running the value-sync
              // effect and wiping the input back to `value` at that moment. Uncontrolled
              // (value always undefined), that wipe drops the first character; controlled,
              // it just re-applies the character that was already typed.
              value={mode === "origin" ? originAddress : destText}
              onChange={(val) => {
                if (mode === "origin") { setOriginAddress(val); setOriginCoords(null); }
                else { setDestText(val); setDestPin(null); }
              }}
              onRetrieve={(result) => {
                const feature = result?.features?.[0];
                if (!feature) return;
                console.log(feature)
                const [lng, lat] = feature.geometry.coordinates;
                const name = `${feature.properties.name} ${feature.properties.full_address}` || feature.properties.place_formatted;
                if (mode === "origin") { setOriginAddress(name); setOriginCoords({ lat, lng }); }
                else { setDestText(name); setDestPin({ lat, lng }); }
              }}
            />
          </div>
        )}

        <button type="button" onClick={handleConfirm} disabled={!canConfirm}
          style={{
            width: "100%", padding: "15px", borderRadius: "var(--r-md)",
            border: "none", background: "var(--primary)", color: "white",
            fontSize: "15px", fontWeight: 700, fontFamily: "inherit",
            cursor: canConfirm ? "pointer" : "default",
            opacity: canConfirm ? 1 : 0.4,
            transition: "opacity var(--t-fast)",
          }}>
          {mode === "origin" ? "Confirmar origen" : "Confirmar destino"}
        </button>

        {mode === "dest" && (
          <button type="button" onClick={openMapPicker}
            style={{
              width: "100%", padding: "4px", border: "none", background: "none",
              cursor: "pointer", fontFamily: "inherit", fontSize: "13px",
              color: "var(--text-muted)", display: "flex", alignItems: "center",
              justifyContent: "center", gap: "6px",
            }}>
            <PinIcon size={14} /> ¿No encuentras tu dirección? Búscala en el mapa <MapIcon size={14} />
          </button>
        )}
      </div>
      )}
    </div>
  );
}
