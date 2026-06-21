"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Configure Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

interface MapPin {
  lat: number;
  lng: number;
  label?: string;
  color?: "blue" | "red" | "green";
  icon?: "moto";
}

interface MapViewProps {
  center?: [number, number]; // [lat, lng]
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

const PIN_HEX = {
  green: "#22c55e",
  red:   "#ef4444",
  blue:  "#2563eb",
};

function createMarkerElement(pin: MapPin) {
  const el = document.createElement("div");
  if (pin.icon === "moto") {
    el.style.fontSize = "26px";
    el.style.lineHeight = "1";
    el.style.filter = "drop-shadow(0 2px 6px rgba(0,0,0,0.5))";
    el.style.cursor = "pointer";
    el.innerText = "🏍️";
  } else {
    const hex = PIN_HEX[pin.color ?? "blue"] ?? PIN_HEX.blue;
    el.style.width = "22px";
    el.style.height = "22px";
    el.style.backgroundColor = hex;
    el.style.border = "3px solid #fff";
    el.style.borderRadius = "50%";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.35)";
    el.style.cursor = "pointer";
  }
  return el;
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const prevRouteKeyRef = useRef<string>("");

  const heightVal = typeof height === "number" ? `${height}px` : height;

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [center[1], center[0]],
      zoom: zoom,
      attributionControl: false,
    });

    mapRef.current = map;

    let removed = false;
    const safeRemove = () => {
      if (removed) return;
      removed = true;
      map.remove();
    };

    if (onMapClick) {
      map.on("click", (e) => {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      });
    }

    if (onCenterChange) {
      map.on("moveend", () => {
        const c = map.getCenter();
        onCenterChange(c.lat, c.lng);
      });
    }

    map.on("style.load", () => {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#2563eb",
          "line-width": 4.5,
          "line-opacity": 0.85,
        },
      });
    });

    return () => {
      if (map.loaded()) {
        safeRemove();
      } else {
        map.once("load", safeRemove);
      }
      mapRef.current = null;
    };
  }, []); // Run once on mount

  // 2. Handle center and zoom updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentCenter = map.getCenter();
    const targetLng = center[1];
    const targetLat = center[0];

    const dist = Math.sqrt(
      Math.pow(currentCenter.lng - targetLng, 2) +
        Math.pow(currentCenter.lat - targetLat, 2)
    );

    // Only center-fly if coordinates have shifted significantly
    if (dist > 0.0001) {
      map.flyTo({
        center: [targetLng, targetLat],
        zoom: zoom ?? map.getZoom(),
        duration: 1000,
      });
    }
  }, [center[0], center[1], zoom]);

  // 3. Handle markers/pins updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add new markers
    pins.forEach((pin) => {
      const el = createMarkerElement(pin);
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([
        pin.lng,
        pin.lat,
      ]);

      if (pin.label) {
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div style="color:var(--text);font-weight:600;font-size:12px;padding:2px 4px">${pin.label}</div>`
        );
        marker.setPopup(popup);
      }

      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [pins]);

  // 4. Handle route rendering updates (Directions API)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const green = pins.find((p) => p.color === "green");
    const red = pins.find((p) => p.color === "red");
    const moto = pins.find((p) => p.icon === "moto");

    let startPoint: { lat: number; lng: number } | undefined;
    let endPoint: { lat: number; lng: number } | undefined;

    // Determine route terminals
    if (green && red) {
      startPoint = green;
      endPoint = red;
    } else if (moto && green) {
      startPoint = moto;
      endPoint = green;
    }

    if (!startPoint || !endPoint) {
      // Clear route source if incomplete
      const clearRoute = () => {
        const source = map.getSource("route") as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData({
            type: "FeatureCollection",
            features: [],
          });
        }
      };

      if (map.isStyleLoaded()) {
        clearRoute();
      } else {
        map.once("style.load", clearRoute);
      }
      prevRouteKeyRef.current = "";
      return;
    }

    const routeKey = `${startPoint.lat},${startPoint.lng};${endPoint.lat},${endPoint.lng}`;
    if (prevRouteKeyRef.current === routeKey) return;
    prevRouteKeyRef.current = routeKey;

    const fetchRoute = async () => {
      try {
        const token = mapboxgl.accessToken;
        if (!token) return;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startPoint!.lng},${startPoint!.lat};${endPoint!.lng},${endPoint!.lat}?geometries=geojson&overview=full&access_token=${token}`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.routes && data.routes.length > 0) {
          const routeGeometry = data.routes[0].geometry;

          const updateRouteSource = () => {
            const source = map.getSource("route") as mapboxgl.GeoJSONSource;
            if (source) {
              source.setData({
                type: "Feature",
                properties: {},
                geometry: routeGeometry,
              });
            }

            // Adjust bounds to fit route
            const coords = routeGeometry.coordinates as [number, number][];
            if (coords.length > 0) {
              const bounds = coords.reduce(
                (acc, coord) => acc.extend(coord),
                new mapboxgl.LngLatBounds(coords[0], coords[0])
              );
              map.fitBounds(bounds, { padding: 40, duration: 1500 });
            }
          };

          if (map.isStyleLoaded()) {
            updateRouteSource();
          } else {
            map.once("style.load", updateRouteSource);
          }
        }
      } catch (err) {
        console.error("Error fetching route from Mapbox Directions:", err);
      }
    };

    fetchRoute();
  }, [pins]);

  return (
    <div
      className={`map-container ${className}`}
      style={{ height: heightVal, position: "relative", width: "100%" }}
    >
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

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
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--primary)",
                border: "3px solid white",
                boxShadow: "0 3px 12px rgba(0,0,0,0.4)",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                width: 3,
                height: 14,
                background: "var(--primary)",
                borderRadius: "0 0 2px 2px",
                flexShrink: 0,
              }}
            />
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
