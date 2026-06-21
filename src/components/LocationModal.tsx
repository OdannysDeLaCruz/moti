"use client";

import { useState, useEffect, useRef } from "react";
import { SearchBox } from "@mapbox/search-js-react";

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
  const [gpsError,   setGpsError]   = useState("");

  const [originCoords,  setOriginCoords]  = useState<{ lat: number; lng: number } | null>(null);
  const [originAddress, setOriginAddress] = useState("");

  const [destText, setDestText] = useState("");
  const [destPin,  setDestPin]  = useState<{ lat: number; lng: number } | null>(null);

  // Separate ref per mode — prevents stale ref after remount
  const searchBoxRef = useRef<any>(null);

  // Sync state when modal opens for a specific mode
  useEffect(() => {
    if (!isOpen) return;
    setGpsError("");
    if (mode === "origin") {
      setOriginCoords(originPoint ? { lat: originPoint.lat, lng: originPoint.lng } : null);
      setOriginAddress(originPoint?.address ?? "");
    } else {
      setDestPin(destPoint ? { lat: destPoint.lat, lng: destPoint.lng } : null);
      setDestText(destPoint?.address ?? "");
    }
  }, [isOpen, mode]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <button onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", padding: "4px 8px", color: "var(--text)" }}>
          ←
        </button>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "17px" }}>
          {mode === "origin" ? "¿Desde dónde sales?" : "¿A dónde vas?"}
        </span>
      </div>

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
        ) : (
          <div key={mode} style={{ position: "relative", width: "100%" }}>
            <SearchBox
              ref={searchBoxRef}
              accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""}
              options={{ language: "es", country: "co", types: "address,poi,neighborhood,postcode,district,place" }}
              placeholder={mode === "origin" ? "Escribe tu dirección de origen..." : "Escribe la dirección de destino..."}
              theme={searchBoxTheme}
              onChange={(val) => {
                if (mode === "origin") { setOriginAddress(val); setOriginCoords(null); }
                else                   { setDestText(val);      setDestPin(null); }
              }}
              onRetrieve={(result) => {
                const feature = result?.features?.[0];
                if (!feature) return;
                const [lng, lat] = feature.geometry.coordinates;
                const name = feature.properties.full_address || feature.properties.place_formatted || feature.properties.name || "";
                if (mode === "origin") { setOriginAddress(name); setOriginCoords({ lat, lng }); }
                else                   { setDestText(name);      setDestPin({ lat, lng }); }
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
      </div>
    </div>
  );
}
