"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { SearchBox } from "@mapbox/search-js-react";

interface ReverseFeature {
  properties: {
    name: string;
    feature_type: "poi" | "address" | "street" | "place" | string;
    address: string;
    full_address?: string;
    place_formatted?: string;
  };
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface ReverseGeocodeResponse {
  type: "FeatureCollection";
  features: ReverseFeature[];
  attribution: string;
}

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div style={{
      height: "100%", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--surface)",
    }}>
      <span className="spinner spinner-lg" style={{ color: "var(--primary)" }} />
    </div>
  ),
});

export interface LocationPoint { lat: number; lng: number; address: string; }

interface LocationModalProps {
  mode: "origin" | "dest" | null;
  /** Origin point shown as green reference pin on the destination map */
  originPoint?: LocationPoint | null;
  onConfirmOrigin: (point: LocationPoint) => void;
  onConfirmDest: (text: string, pin: { lat: number; lng: number } | null) => void;
  onClose: () => void;
}

function getNombreLegible(features: ReverseFeature[]): string {
  // 1. Busca el primer POI (nombre real de lugar/negocio)
  const poi = features.find((f) => f.properties.feature_type === "poi");
  if (poi) return poi.properties.full_address || poi.properties.address ||poi.properties.name;

  // 2. Si no hay POI, usa la dirección
  const address = features.find((f) => f.properties.feature_type === "address");
  if (address) return address.properties.full_address || address.properties.address;

  // 3. Fallback al primero que venga
  return features[0]?.properties.name || "";
}

// async function reverseGeocode(lat: number, lng: number, limit = 1): Promise<string> {
//   const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
//   if (!token) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
//   try {
//     const res = await fetch(
//       // `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=es&limit=1&types=address` // sessions
//       `https://api.mapbox.com/search/searchbox/v1/reverse?longitude=${lng}&latitude=${lat}&access_token=${token}&language=es&limit=${limit}&types=address`
//     );
//     const data = await res.json();
//     if (data.features && data.features.length > 0) {
//       const feat = data.features[0];
//       return feat.place_name || feat.text || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
//     }
//     return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
//   } catch {
//     return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
//   }
// }

async function reverseGeocode(lat: number, lng: number, limit = 5): Promise<string> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
  if (!token) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  try {
    const res = await fetch(
      // `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=es&limit=1&types=address` // sessions
      `https://api.mapbox.com/search/searchbox/v1/reverse?longitude=${lng}&latitude=${lat}&access_token=${token}&language=es&limit=${limit}`
    );

    const data: ReverseGeocodeResponse = await res.json();

    if (!data.features || data.features.length === 0) {
    return "";
  }

    return getNombreLegible(data.features);
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
  }
};

export default function LocationModal({
  mode,
  originPoint,
  onConfirmOrigin,
  onConfirmDest,
  onClose,
}: LocationModalProps) {
  const isOpen = mode !== null;

  const [mapCenter, setMapCenter] = useState<[number, number]>([10.4631, -73.2532]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Origin state
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [originAddress, setOriginAddress] = useState("");

  // Destination state
  const [destText, setDestText] = useState("");
  const [destPin, setDestPin] = useState<{ lat: number; lng: number } | null>(null);
  // Controls whether the map is visible in dest mode
  const [showDestMap, setShowDestMap] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchBoxTextRef = useRef<any>(null);
  const searchBoxMapRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Skip the first moveend that fires from the initial flyTo animation
  const skipInitialMoveEndRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    // Always skip the first moveend (from the MapCenter flyTo on open)
    skipInitialMoveEndRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (mode === "origin") {
      setOriginCoords(null);
      setOriginAddress("");
      setGpsLoading(true);
      setGeocoding(false);
      navigator.geolocation?.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setMapCenter([lat, lng]);
          setGpsLoading(false);
          // Geocode immediately — don't wait for moveend/flyTo
          setOriginCoords({ lat, lng });
          setGeocoding(true);
          const address = await reverseGeocode(lat, lng, 1);
          setGeocoding(false);
          setOriginAddress(address);
        },
        () => setGpsLoading(false),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } else {
      // dest mode — start with text-only view
      setDestText("");
      setDestPin(null);
      setGeocoding(false);
      setShowDestMap(false);
      setMapCenter(originPoint ? [originPoint.lat, originPoint.lng] : [10.4631, -73.2532]);
      setTimeout(() => {
        inputRef.current?.focus();
        if (searchBoxTextRef.current) {
          searchBoxTextRef.current.focus();
        }
      }, 150);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isOpen, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fires when the map stops moving — used by BOTH origin and dest modes
  function handleCenterChange(lat: number, lng: number) {
    // Skip the first event (triggered by the initial flyTo animation on open)
    if (skipInitialMoveEndRef.current) {
      skipInitialMoveEndRef.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (mode === "origin") {
      setOriginCoords({ lat, lng });
      setOriginAddress("");
      debounceRef.current = setTimeout(async () => {
        setGeocoding(true);
        const address = await reverseGeocode(lat, lng, 1);
        setGeocoding(false);
        setOriginAddress(address);
      }, 500);
    } else if (mode === "dest") {
      setDestPin({ lat, lng });
      debounceRef.current = setTimeout(async () => {
        setGeocoding(true);
        const address = await reverseGeocode(lat, lng, 5);
        setGeocoding(false);
        setDestText(address);
        if (searchBoxTextRef.current) searchBoxTextRef.current.value = address;
        if (searchBoxMapRef.current) searchBoxMapRef.current.value = address;
      }, 500);
    }
  }

  function handleConfirm() {
    if (mode === "origin" && originCoords) {
      onConfirmOrigin({
        lat: originCoords.lat,
        lng: originCoords.lng,
        address: originAddress || `${originCoords.lat.toFixed(5)}, ${originCoords.lng.toFixed(5)}`,
      });
    } else if (mode === "dest") {
      onConfirmDest(destText.trim(), destPin);
    }
  }

  const canConfirm = mode === "origin"
    ? (!!originCoords && !gpsLoading)
    : destText.trim().length > 0;

  // Origin map: crosshair only, no pins
  // Dest map: crosshair + green reference pin for origin
  const mapPins = mode === "dest" && originPoint
    ? [{ lat: originPoint.lat, lng: originPoint.lng, label: "Origen", color: "green" as const }]
    : [];

  const originAddressLabel = geocoding
    ? "Buscando dirección..."
    : originAddress
      ? originAddress
      : originCoords
        ? `${originCoords.lat.toFixed(5)}, ${originCoords.lng.toFixed(5)}`
        : "Arrastra el mapa para posicionar el pin";

  const destAddressLabel = geocoding
    ? "Buscando dirección..."
    : destPin && destText
      ? destText
      : "Arrastra el mapa para posicionar el pin";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        willChange: "transform",
      }}
    >
      {/* Header */}
      <div className="screen-header" style={{ flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "20px", padding: "4px 8px", color: "var(--text)",
          }}
        >
          ←
        </button>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "17px" }}>
          {mode === "origin" ? "¿A donde pasamos por ti?" : "¿A dónde vas?"}
        </span>
      </div>

      {/* DESTINATION — text-only view (no map yet) */}
      {mode === "dest" && !showDestMap && (
        <div style={{ padding: "24px 16px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <SearchBox
              ref={searchBoxTextRef}
              accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""}
              options={{
                language: "es",
                country: "co",
                types: "address,poi,neighborhood,postcode,district,place",
              }}
              placeholder="Escribe la dirección de destino..."
              theme={searchBoxTheme}
              onChange={(val) => setDestText(val)}
              onRetrieve={(result) => {
                if (result && result.features && result.features.length > 0) {
                  const feature = result.features[0];
                  const [lng, lat] = feature.geometry.coordinates;
                  const addressName = feature.properties.name || feature.properties.place_formatted || feature.properties.full_address || "";
                  setDestText(addressName);
                  setDestPin({ lat, lng });
                  setMapCenter([lat, lng]);
                  setShowDestMap(true);
                }
              }}
            />
          </div>

          <p style={{ fontSize: "14px", textAlign: "center" }}>o también puedes:</p>

          <button
            type="button"
            onClick={() => {
              setShowDestMap(true);
              skipInitialMoveEndRef.current = true;
            }}
            style={{
              width: "100%", padding: "13px", borderRadius: "var(--r-md)",
              border: "1.5px solid var(--primary)", background: "var(--primary-xpale)",
              color: "var(--primary)", fontSize: "14px", fontWeight: 600,
              fontFamily: "inherit", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            <span>🗺️</span> Buscar en el mapa
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              width: "100%", padding: "15px", borderRadius: "var(--r-md)",
              border: "none", background: "var(--primary)", color: "white",
              fontSize: "15px", fontWeight: 700, fontFamily: "inherit",
              cursor: canConfirm ? "pointer" : "default",
              opacity: canConfirm ? 1 : 0.4,
              transition: "opacity var(--t-fast)",
            }}
          >
            Confirmar destino
          </button>
        </div>
      )}

      {/* ORIGIN or DESTINATION with map */}
      {(mode === "origin" || (mode === "dest" && showDestMap)) && (
        <>
          {/* Destination text input shown above map */}
          {mode === "dest" && (
            <div style={{ padding: "10px 16px 4px", flexShrink: 0 }}>
              <div style={{ position: "relative", width: "100%" }}>
                <SearchBox
                  ref={searchBoxMapRef}
                  accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""}
                  options={{
                    language: "es",
                    country: "co",
                    types: "address,poi,neighborhood,postcode,district,place",
                  }}
                  placeholder="O escribe la dirección directamente..."
                  theme={searchBoxTheme}
                  onChange={(val) => setDestText(val)}
                  onRetrieve={(result) => {
                    if (result && result.features && result.features.length > 0) {
                      const feature = result.features[0];
                      const [lng, lat] = feature.geometry.coordinates;
                      const addressName = feature.properties.name || feature.properties.place_formatted || feature.properties.full_address || "";
                      setDestText(addressName);
                      setDestPin({ lat, lng });
                      setMapCenter([lat, lng]);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Drag hint */}
          {!gpsLoading && (
            <div style={{
              padding: "5px 16px 2px", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <p style={{
                fontSize: "12px", color: "var(--text-muted)",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--r-full)", padding: "4px 14px",
                display: "inline-block", margin: 0,
              }}>
                Arrastra el mapa para posicionar el pin
                {mode === "dest" && originPoint && " · 📍 pin verde = tu origen"}
              </p>
            </div>
          )}

          {/* Map */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {gpsLoading ? (
              <div style={{
                height: "100%", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "16px",
                background: "var(--surface)",
              }}>
                <span className="spinner spinner-lg" style={{ color: "var(--primary)" }} />
                <p style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: 500 }}>
                  Detectando tu ubicación...
                </p>
              </div>
            ) : (
              <MapView
                center={mapCenter}
                zoom={15}
                height="100%"
                crosshair
                onCenterChange={handleCenterChange}
                pins={mapPins}
              />
            )}

            {/* Geocoding badge */}
            {geocoding && !gpsLoading && (
              <div style={{
                position: "absolute", top: "10px", left: "50%",
                transform: "translateX(-50%)",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--r-full)", padding: "5px 14px",
                fontSize: "12px", fontWeight: 600, color: "var(--text-muted)",
                zIndex: 600, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}>
                Buscando dirección...
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div style={{
            padding: "12px 16px 28px", flexShrink: 0,
            background: "var(--bg)", borderTop: "1px solid var(--border)",
          }}>
            {/* Address chip */}
            {!gpsLoading && (
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 14px", marginBottom: "10px",
                background: canConfirm ? (mode === "origin" ? "var(--success-pale)" : "var(--danger-pale)") : "var(--surface)",
                border: `1.5px solid ${canConfirm ? (mode === "origin" ? "var(--success)" : "var(--danger)") : "var(--border)"}`,
                borderRadius: "var(--r-md)", minHeight: "44px",
                transition: "all var(--t-fast)",
              }}>
                <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>
                  {mode === "origin" ? "📍" : "🎯"}
                </span>
                <span style={{
                  fontSize: "13px", fontWeight: 500, flex: 1,
                  color: canConfirm ? "var(--text)" : "var(--text-muted)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {mode === "origin" ? originAddressLabel : destAddressLabel}
                </span>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={{
                width: "100%", padding: "15px", borderRadius: "var(--r-md)",
                border: "none", background: "var(--primary)", color: "white",
                fontSize: "15px", fontWeight: 700, fontFamily: "inherit",
                cursor: canConfirm ? "pointer" : "default",
                opacity: canConfirm ? 1 : 0.4,
                transition: "opacity var(--t-fast)",
              }}
            >
              {mode === "origin" ? "Confirmar origen" : "Confirmar destino"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
