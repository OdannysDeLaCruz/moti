"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

export interface MapPin {
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
  crosshair?: boolean;
  onCenterChange?: (lat: number, lng: number) => void;
}

const PIN_HEX = { green: "#22c55e", red: "#ef4444", blue: "#2563eb" };

// Below this deviation from the drawn route, GPS jitter is ignored — only an
// actual detour off the road triggers a new Directions API call.
const REROUTE_THRESHOLD_METERS = 70;
const EARTH_RADIUS_M = 6371000;

function toLocalXY(lng: number, lat: number, refLat: number): [number, number] {
  const x = lng * Math.cos((refLat * Math.PI) / 180) * (Math.PI / 180) * EARTH_RADIUS_M;
  const y = lat * (Math.PI / 180) * EARTH_RADIUS_M;
  return [x, y];
}

function distancePointToSegmentMeters(
  point: [number, number], // [lng, lat]
  a: [number, number],
  b: [number, number]
): number {
  const refLat = point[1];
  const [px, py] = toLocalXY(point[0], point[1], refLat);
  const [ax, ay] = toLocalXY(a[0], a[1], refLat);
  const [bx, by] = toLocalXY(b[0], b[1], refLat);

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function distanceToRouteMeters(point: [number, number], coords: [number, number][]): number {
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = distancePointToSegmentMeters(point, coords[i], coords[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

// Distancia mínima (en grados de longitud) para considerar que hubo un
// movimiento real y no ruido de GPS. ~3m en el ecuador.
const MOTO_DIRECTION_EPSILON = 0.00003;

// La imagen debe venir en vista lateral, mirando hacia la izquierda por
// defecto, para que el flip (scaleX) la oriente hacia la derecha cuando
// corresponda.
const MOTO_ICON_SRC = "/pin-top-lateral-50x40.png";

function createMarkerElement(pin: MapPin, flip = false) {
  const el = document.createElement("div");
  if (pin.icon === "moto") {
    el.style.cssText = `width:50px;height:50px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.5));cursor:pointer;${flip ? "transform:scaleX(-1);" : ""}`;
    const img = document.createElement("img");
    img.src = MOTO_ICON_SRC;
    img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:contain;";
    el.appendChild(img);
  } else {
    const hex = PIN_HEX[pin.color ?? "blue"];
    el.style.cssText = `width:22px;height:22px;background:${hex};border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);cursor:pointer`;
  }
  return el;
}

/** Wait until the map's style is fully loaded and the "route" source exists */
function whenReady(map: mapboxgl.Map, cb: () => void) {
  if (map.isStyleLoaded() && map.getSource("route")) {
    cb();
  } else {
    map.once("idle", () => {
      if (map.getSource("route")) cb();
      else map.once("style.load", cb);
    });
  }
}

export default function MapView({
  center = [10.4631, -73.2532],
  zoom = 14,
  pins = [],
  height = 200,
  className = "",
  onMapClick,
  crosshair = false,
  onCenterChange,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const prevRouteKeyRef = useRef("");
  const prevEndKeyRef = useRef("");
  const routeCoordsRef = useRef<[number, number][] | null>(null);
  const prevMotoLngRef = useRef<number | null>(null);
  const motoFacingRightRef = useRef(false);
  const readyRef = useRef(false);

  const h = typeof height === "number" ? `${height}px` : height;

  // ── 1. Init map (once) ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [center[1], center[0]],
      zoom,
      attributionControl: false,
    });
    mapRef.current = map;

    if (onMapClick) map.on("click", (e) => onMapClick(e.lngLat.lat, e.lngLat.lng));
    if (onCenterChange) map.on("moveend", () => { const c = map.getCenter(); onCenterChange(c.lat, c.lng); });

    // Use "load" (not "style.load") — fires once when style + tiles are fully ready
    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#2563eb", "line-width": 4.5, "line-opacity": 0.85 },
      });
      readyRef.current = true;
    });

    return () => {
      readyRef.current = false;
      prevRouteKeyRef.current = "";
      prevEndKeyRef.current = "";
      routeCoordsRef.current = null;
      prevMotoLngRef.current = null;
      motoFacingRightRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Fly to new center ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const cur = map.getCenter();
    const dist = Math.hypot(cur.lng - center[1], cur.lat - center[0]);
    if (dist > 0.0001) map.flyTo({ center: [center[1], center[0]], zoom, duration: 1000 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom]);

  // ── 3. Update markers ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const moto = pins.find((p) => p.icon === "moto");
    if (moto) {
      const prevLng = prevMotoLngRef.current;
      if (prevLng !== null) {
        const delta = moto.lng - prevLng;
        if (delta > MOTO_DIRECTION_EPSILON) motoFacingRightRef.current = true;
        else if (delta < -MOTO_DIRECTION_EPSILON) motoFacingRightRef.current = false;
        // |delta| <= epsilon -> ruido de GPS, se mantiene la dirección previa
      }
      prevMotoLngRef.current = moto.lng;
    }

    pins.forEach((pin) => {
      const flip = pin.icon === "moto" && motoFacingRightRef.current;
      const el = createMarkerElement(pin, flip);
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([pin.lng, pin.lat]);
      if (pin.label) marker.setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<div style="font-weight:600;font-size:12px;padding:2px 4px">${pin.label}</div>`));
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [pins]);

  // ── 4. Fetch & draw route ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const green = pins.find((p) => p.color === "green");
    const red = pins.find((p) => p.color === "red");
    const moto = pins.find((p) => p.icon === "moto");

    const start = green && red ? green : (moto && green ? moto : undefined);
    const end   = green && red ? red   : (moto && green ? green : undefined);

    const clearRoute = () => {
      whenReady(map, () => {
        (map.getSource("route") as mapboxgl.GeoJSONSource)?.setData({ type: "FeatureCollection", features: [] });
      });
      prevRouteKeyRef.current = "";
      prevEndKeyRef.current = "";
      routeCoordsRef.current = null;
    };

    if (!start || !end) { clearRoute(); return; }

    const key = `${start.lat},${start.lng};${end.lat},${end.lng}`;
    if (prevRouteKeyRef.current === key) return;

    // Same destination as before + still close to the route already drawn ->
    // this is just GPS jitter, not a real detour. Skip the API call.
    const endKey = `${end.lat},${end.lng}`;
    if (prevEndKeyRef.current === endKey && routeCoordsRef.current) {
      const deviation = distanceToRouteMeters([start.lng, start.lat], routeCoordsRef.current);
      if (deviation < REROUTE_THRESHOLD_METERS) {
        prevRouteKeyRef.current = key;
        return;
      }
    }

    prevRouteKeyRef.current = key;
    prevEndKeyRef.current = endKey;

    const token = mapboxgl.accessToken;
    if (!token) return;

    const controller = new AbortController();

    fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full&access_token=${token}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (!data.routes?.length) return;
        const geom = data.routes[0].geometry;
        routeCoordsRef.current = geom.coordinates;
        whenReady(map, () => {
          (map.getSource("route") as mapboxgl.GeoJSONSource)?.setData({
            type: "Feature", properties: {}, geometry: geom,
          });
          const coords = geom.coordinates as [number, number][];
          if (coords.length > 1) {
            const bounds = coords.reduce(
              (b, c) => b.extend(c),
              new mapboxgl.LngLatBounds(coords[0], coords[0])
            );
            map.fitBounds(bounds, { padding: { top: 80, bottom: 420, left: 60, right: 60 }, duration: 1200, maxZoom: 16 });
          }
        });
      })
      .catch((err) => { if (err.name !== "AbortError") console.error(err); });

    return () => controller.abort();
  }, [pins]);

  return (
    <div className={`map-container ${className}`} style={{ position: "relative", width: "100%", height: h }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {crosshair && (
        <>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -100%)", zIndex: 1001,
            pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--primary)", border: "3px solid white", boxShadow: "0 3px 12px rgba(0,0,0,.4)" }} />
            <div style={{ width: 3, height: 14, background: "var(--primary)", borderRadius: "0 0 2px 2px" }} />
          </div>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, 2px)", zIndex: 1000,
            pointerEvents: "none", width: 14, height: 7,
            background: "rgba(0,0,0,.22)", borderRadius: "50%",
          }} />
        </>
      )}
    </div>
  );
}
