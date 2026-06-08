"use client";

import { useState, useEffect, useRef } from "react";

interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
}

interface LocationSearchModalProps {
  isOpen: boolean;
  fieldLabel: string;
  isLoaded: boolean;
  onSelect: (point: LocationPoint) => void;
  onClose: () => void;
}

async function geocodeReverseLocal(
  geocoder: google.maps.Geocoder,
  lat: number,
  lng: number,
): Promise<string> {
  return new Promise((resolve) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const a = results[0].address_components;
        const road = a.find((c) => c.types.includes("route"))?.short_name;
        const area = a.find(
          (c) =>
            c.types.includes("neighborhood") || c.types.includes("sublocality"),
        )?.short_name;
        resolve(
          [road, area].filter(Boolean).join(", ") ||
            results[0].formatted_address.split(",")[0],
        );
      } else {
        resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    });
  });
}

export default function LocationSearchModal({
  isOpen,
  fieldLabel,
  isLoaded,
  onSelect,
  onClose,
}: LocationSearchModalProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] =
    useState<google.maps.places.AutocompletePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLocating, setGpsLocating] = useState(false);
  const [gpsError, setGpsError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    autocompleteRef.current = new google.maps.places.AutocompleteService();
    geocoderRef.current = new google.maps.Geocoder();
  }, [isLoaded]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setPredictions([]);
      setGpsError("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim() || !autocompleteRef.current) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      autocompleteRef.current!.getPlacePredictions(
        {
          input: value,
          componentRestrictions: { country: "co" },
          types: ["geocode", "establishment"],
        },
        (results, status) => {
          setSearching(false);
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            results
          ) {
            setPredictions(results);
          } else {
            setPredictions([]);
          }
        },
      );
    }, 300);
  }

  async function handleSelectPrediction(
    pred: google.maps.places.AutocompletePrediction,
  ) {
    if (!geocoderRef.current) return;
    const result = await new Promise<google.maps.GeocoderResult | null>(
      (resolve) => {
        geocoderRef.current!.geocode(
          { placeId: pred.place_id },
          (results, status) => {
            resolve(status === "OK" && results?.[0] ? results[0] : null);
          },
        );
      },
    );
    if (!result) return;
    const main = pred.structured_formatting.main_text;
    const secondary = pred.structured_formatting.secondary_text;
    onSelect({
      lat: result.geometry.location.lat(),
      lng: result.geometry.location.lng(),
      address: secondary ? `${main}, ${secondary}` : main,
    });
    onClose();
  }

  async function handleGps() {
    if (!navigator.geolocation || !geocoderRef.current) {
      setGpsError("Geolocalización no disponible.");
      return;
    }
    setGpsLocating(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const address = await geocodeReverseLocal(geocoderRef.current!, lat, lng);
        setGpsLocating(false);
        onSelect({ lat, lng, address });
        onClose();
      },
      () => {
        setGpsError("No se pudo obtener la ubicación. Verifica los permisos.");
        setGpsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const isOrigen = fieldLabel === "origen";

  return (
    <div
      className="bottom-sheet-overlay"
      style={{
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? "auto" : "none",
        transition: "opacity var(--t-base)",
      }}
      onClick={onClose}
    >
      <div
        className="bottom-sheet-panel"
        style={{ transform: isOpen ? "translateY(0)" : "translateY(100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bottom-sheet-handle" />

        <p
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "12px",
          }}
        >
          {isOrigen ? "¿Desde dónde sales?" : "¿A dónde vas?"}
        </p>

        {/* GPS — only for origin */}
        {isOrigen && (
          <button
            type="button"
            onClick={handleGps}
            disabled={gpsLocating}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "var(--r-md)",
              border: "1.5px solid var(--primary)",
              background: "var(--primary-xpale)",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
              cursor: gpsLocating ? "default" : "pointer",
              fontFamily: "inherit",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {gpsLocating ? (
              <span className="spinner spinner-sm" />
            ) : (
              <span>📍</span>
            )}
            {gpsLocating ? "Obteniendo ubicación..." : "Usar mi ubicación actual"}
          </button>
        )}
        {gpsError && (
          <p className="form-error" style={{ marginBottom: "8px" }}>
            {gpsError}
          </p>
        )}

        {/* Search input */}
        <div style={{ position: "relative", marginBottom: "8px" }}>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={isOrigen ? "Buscar origen..." : "Buscar destino..."}
            style={{ paddingLeft: "38px" }}
          />
          <span
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "1rem",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
        </div>

        {/* Results */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {searching && (
            <div
              style={{ display: "flex", justifyContent: "center", padding: "20px" }}
            >
              <span className="spinner spinner-sm" />
            </div>
          )}
          {!searching &&
            predictions.map((pred) => (
              <button
                key={pred.place_id}
                type="button"
                onClick={() => handleSelectPrediction(pred)}
                style={{
                  width: "100%",
                  padding: "12px 8px",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}
                >
                  {pred.structured_formatting.main_text}
                </span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {pred.structured_formatting.secondary_text}
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
