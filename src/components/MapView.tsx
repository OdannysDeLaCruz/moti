"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const fixLeafletIcons = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

const PIN_HEX: Record<string, string> = {
  green: "#22c55e",
  red:   "#ef4444",
  blue:  "#2563eb",
};

function makePinIcon(color: "green" | "red" | "blue" = "blue") {
  const hex = PIN_HEX[color] ?? PIN_HEX.blue;
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;background:${hex};border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function makeMotoIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))">🏍️</div>`,
    iconSize: [30, 26],
    iconAnchor: [15, 13],
  });
}

interface MapPin {
  lat: number;
  lng: number;
  label?: string;
  color?: "blue" | "red" | "green";
  icon?: "moto";
}

interface MapViewProps {
  center?: LatLngTuple;
  zoom?: number;
  pins?: MapPin[];
  height?: number | string;
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
  /** Show a fixed crosshair pin at the map center (for drag-to-select UX) */
  crosshair?: boolean;
  /** Fires with the map center coordinates when the map stops moving */
  onCenterChange?: (lat: number, lng: number) => void;
}

function MapCenter({ center }: { center: LatLngTuple }) {
  const map = useMap();
  const prevCenter = useRef<LatLngTuple | null>(null);

  useEffect(() => {
    if (
      prevCenter.current?.[0] !== center[0] ||
      prevCenter.current?.[1] !== center[1]
    ) {
      map.flyTo(center, map.getZoom(), { duration: 1 });
      prevCenter.current = center;
    }
  }, [center, map]);

  return null;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MoveEndHandler({ onCenterChange }: { onCenterChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    moveend(e) {
      const c = (e.target as L.Map).getCenter();
      onCenterChange(c.lat, c.lng);
    },
  });
  return null;
}

export default function MapView({
  center = [4.711, -74.0721],
  zoom = 14,
  pins = [],
  height = 200,
  className = "",
  onMapClick,
  crosshair = false,
  onCenterChange,
}: MapViewProps) {
  useEffect(() => { fixLeafletIcons(); }, []);

  const heightVal = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`map-container ${className}`}
      style={{ height: heightVal, position: "relative", width: "100%" }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap"
        />
        {pins.map((pin, i) => (
          <Marker
            key={i}
            position={[pin.lat, pin.lng]}
            icon={pin.icon === "moto" ? makeMotoIcon() : makePinIcon(pin.color)}
          >
            {pin.label && <Popup>{pin.label}</Popup>}
          </Marker>
        ))}
        <MapCenter center={center} />
        {onMapClick && <MapClickHandler onClick={onMapClick} />}
        {onCenterChange && <MoveEndHandler onCenterChange={onCenterChange} />}
      </MapContainer>

      {/* Fixed crosshair pin at map center */}
      {crosshair && (
        <>
          {/* Pin body: circle + tail, bottom of tail = map center */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -100%)",
              zIndex: 1001,
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "var(--primary)",
              border: "3px solid white",
              boxShadow: "0 3px 12px rgba(0,0,0,0.4)",
              flexShrink: 0,
            }} />
            <div style={{
              width: 3,
              height: 14,
              background: "var(--primary)",
              borderRadius: "0 0 2px 2px",
              flexShrink: 0,
            }} />
          </div>

          {/* Shadow at the pin tip (map surface) */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, 2px)",
              zIndex: 1000,
              pointerEvents: "none",
              width: 14,
              height: 7,
              background: "rgba(0,0,0,0.22)",
              borderRadius: "50%",
            }}
          />
        </>
      )}
    </div>
  );
}
