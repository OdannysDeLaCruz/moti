"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";

interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
}

interface GoogleMapViewProps {
  isLoaded: boolean;
  origin: LocationPoint | null;
  dest: LocationPoint | null;
  routeData: google.maps.DirectionsResult | null;
  height?: number | string;
  readOnly?: boolean;
  onOriginDragEnd?: (lat: number, lng: number) => void;
  onDestDragEnd?: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER = { lat: 4.711, lng: -74.0721 };

const MAP_OPTIONS = {
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: "greedy",
} satisfies google.maps.MapOptions;

const ORIGIN_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><circle cx="13" cy="13" r="10" fill="#22c55e" stroke="white" stroke-width="3"/></svg>')}`;
const DEST_SVG   = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><circle cx="13" cy="13" r="10" fill="#ef4444" stroke="white" stroke-width="3"/></svg>')}`;

export default function GoogleMapView({
  isLoaded,
  origin,
  dest,
  routeData,
  height = 280,
  readOnly = false,
  onOriginDragEnd,
  onDestDragEnd,
}: GoogleMapViewProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const heightVal = typeof height === "number" ? `${height}px` : height;

  const originIcon = useMemo<google.maps.Icon | undefined>(() => {
    if (!isLoaded) return undefined;
    return {
      url: ORIGIN_SVG,
      scaledSize: new google.maps.Size(26, 26),
      anchor: new google.maps.Point(13, 13),
    };
  }, [isLoaded]);

  const destIcon = useMemo<google.maps.Icon | undefined>(() => {
    if (!isLoaded) return undefined;
    return {
      url: DEST_SVG,
      scaledSize: new google.maps.Size(26, 26),
      anchor: new google.maps.Point(13, 13),
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!map) return;
    if (routeData) {
      map.fitBounds(routeData.routes[0].bounds, 60);
    } else if (origin && !dest) {
      map.panTo({ lat: origin.lat, lng: origin.lng });
      map.setZoom(15);
    } else if (dest && !origin) {
      map.panTo({ lat: dest.lat, lng: dest.lng });
      map.setZoom(15);
    }
  }, [origin, dest, routeData, map]);

  const handleOriginDrag = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng && onOriginDragEnd) onOriginDragEnd(e.latLng.lat(), e.latLng.lng());
    },
    [onOriginDragEnd],
  );

  const handleDestDrag = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng && onDestDragEnd) onDestDragEnd(e.latLng.lat(), e.latLng.lng());
    },
    [onDestDragEnd],
  );

  if (!isLoaded) {
    return (
      <div
        style={{
          height: heightVal,
          background: "var(--surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="spinner" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: heightVal }}
      center={DEFAULT_CENTER}
      zoom={13}
      options={MAP_OPTIONS}
      onLoad={setMap}
    >
      {origin && (
        <Marker
          position={{ lat: origin.lat, lng: origin.lng }}
          icon={originIcon}
          draggable={!readOnly}
          onDragEnd={readOnly ? undefined : handleOriginDrag}
        />
      )}
      {dest && (
        <Marker
          position={{ lat: dest.lat, lng: dest.lng }}
          icon={destIcon}
          draggable={!readOnly}
          onDragEnd={readOnly ? undefined : handleDestDrag}
        />
      )}
      {routeData && (
        <DirectionsRenderer
          directions={routeData}
          options={{ suppressMarkers: true }}
        />
      )}
    </GoogleMap>
  );
}
