"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { Toast } from "@/components/ui/Toast";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { playStatusNegative } from "@/lib/sounds";
import { useRideSocket } from "@/hooks/useRideSocket";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { MapPin, Navigation, Flag, FileText, Radio, ChevronLeft } from "lucide-react";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface Ride {
  id: string;
  originAddress: string;
  destAddress: string;
  originLat: number;
  originLng: number;
  destLat?: number | null;
  destLng?: number | null;
  finalPrice: string | null;
  cashbackApplied?: number;
  status: string;
  rideType: "TRANSPORT" | "DELIVERY";
  client: { fullName: string; phone: string };
  notes?: string | null;
}

type UpdatableStatus = "HEADING_TO_PICKUP" | "AT_PICKUP" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export default function OngoingRidePage() {
  const router = useRouter();
  useAuthGuard("DRIVER");
  const { id } = useParams<{ id: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelledByClient, setCancelledByClient] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const locationChannelRef = useRef<RealtimeChannel | null>(null);

  // Sheet: expanded by default, collapsed when IN_PROGRESS
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const dragStartY = useRef(0);
  function onDragStart(y: number) { dragStartY.current = y; }
  function onDragEnd(y: number) {
    const delta = y - dragStartY.current;
    if (delta > 40) setSheetExpanded(false);
    if (delta < -40) setSheetExpanded(true);
  }

  useEffect(() => {
    api.get<Ride>(`/api/rides/${id}`)
      .then(({ data }) => {
        setRide(data);
        setSheetExpanded(data.status !== "IN_PROGRESS");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const supabase = getSupabaseClient();
    const ch = supabase.channel(`driver-location-${id}`);
    ch.subscribe(() => { locationChannelRef.current = ch; });
    return () => { supabase.removeChannel(ch); locationChannelRef.current = null; };
  }, [id]);

  const sharingLocation = ride?.status === "HEADING_TO_PICKUP" || ride?.status === "IN_PROGRESS";

  useEffect(() => {
    if (!sharingLocation) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverLocation(coords);
        locationChannelRef.current?.send({ type: "broadcast", event: "driver:location", payload: coords });
      });
    }
    const interval = setInterval(() => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverLocation(coords);
        locationChannelRef.current?.send({ type: "broadcast", event: "driver:location", payload: coords });
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [sharingLocation]);

  useRideSocket(id, {
    onStatus: ({ status }) => {
      setRide((prev) => {
        if (status === "CANCELLED" && prev?.status !== "CANCELLED") {
          setCancelledByClient(true);
          playStatusNegative();
        }
        return prev ? { ...prev, status } : prev;
      });
      if (status === "IN_PROGRESS") setSheetExpanded(false);
    },
  });

  async function updateStatus(newStatus: UpdatableStatus) {
    setUpdating(true);
    try {
      await api.patch(`/api/rides/${id}`, { status: newStatus });
      setRide((prev) => (prev ? { ...prev, status: newStatus } : prev));
      if (newStatus === "IN_PROGRESS") setSheetExpanded(false);
      if (newStatus === "COMPLETED") setTimeout(() => router.push("/driver/dashboard"), 2000);
    } catch {}
    setUpdating(false);
  }

  async function startRoute() {
    setUpdating(true);
    try {
      await api.patch(`/api/rides/${id}`, { status: "IN_PROGRESS" });
      // Reload after the status update completes so the map re-mounts with
      // the destination route — Mapbox sometimes fails to redraw the route
      // on a pure state transition to IN_PROGRESS.
      window.location.reload();
    } catch {
      setUpdating(false);
    }
  }

  async function cancelRide() {
    setCancelling(true);
    try {
      await api.patch(`/api/rides/${id}`, { status: "CANCELLED" });
      router.push("/driver/dashboard");
    } catch { setCancelling(false); setConfirmCancel(false); }
  }

  if (loading) return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100dvh" }}>
        <div className="spinner spinner-lg" style={{ color: "var(--primary)" }} />
      </div>
    </div>
  );

  if (!ride) return (
    <div className="page">
      <div className="page-content">
        <div className="empty-state">
          <p>Carrera no encontrada</p>
          <Button variant="primary" onClick={() => router.push("/driver/dashboard")}>Volver</Button>
        </div>
      </div>
    </div>
  );

  const isAccepted   = ride.status === "ACCEPTED";
  const isHeading    = ride.status === "HEADING_TO_PICKUP";
  const isAtPickup   = ride.status === "AT_PICKUP";
  const isInProgress = ride.status === "IN_PROGRESS";
  const isCompleted  = ride.status === "COMPLETED";
  const isCancelled  = ride.status === "CANCELLED";
  const isDone       = isCompleted || isCancelled;
  const canCancel    = isAccepted || isHeading || isAtPickup;

  const originPin = { lat: ride.originLat, lng: ride.originLng };
  const destPin = ride.destLat != null && ride.destLng != null && (ride.destLat !== 0 || ride.destLng !== 0)
    ? { lat: ride.destLat, lng: ride.destLng } : null;

  const mapPins = [
    { lat: originPin.lat, lng: originPin.lng, label: "Recogida", color: "green" as const },
    ...(isInProgress && destPin ? [{ lat: destPin.lat, lng: destPin.lng, label: "Destino", color: "red" as const }] : []),
    ...(driverLocation ? [{ lat: driverLocation.lat, lng: driverLocation.lng, label: "Tú", icon: "moto" as const }] : []),
  ];

  const mapCenter: [number, number] = driverLocation
    ? [driverLocation.lat, driverLocation.lng]
    : [originPin.lat, originPin.lng];

  return (
    <>
      {cancelledByClient && (
        <Toast
          type="error" icon="x" message="Carrera cancelada"
          subMessage="El cliente canceló la carrera"
          actionLabel="Volver al panel"
          onAction={() => router.push("/driver/dashboard")}
          onDismiss={() => setCancelledByClient(false)}
        />
      )}

      {/* Fullscreen map */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <MapView center={mapCenter} zoom={15} height="100%" pins={mapPins} />
      </div>

      {/* Floating top bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)",
        pointerEvents: "none",
      }}>
        <button onClick={() => router.push("/driver/dashboard")}
          style={{ pointerEvents: "auto", background: "var(--surface)", border: "none", cursor: "pointer", borderRadius: "50%", width: 38, height: 38, fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
          <ChevronLeft />
        </button>
        <span style={{ pointerEvents: "none", flex: 1, fontWeight: 700, fontSize: "16px", color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
          {ride.rideType === "DELIVERY" ? "Domicilio en curso" : "Carrera en curso"}
        </span>
        <span style={{ pointerEvents: "auto" }}><StatusBadge status={ride.status as never} /></span>
      </div>

      {/* Bottom sheet */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{
          width: "100%", maxWidth: 480,
          background: "var(--surface)", borderRadius: "var(--r-xl) var(--r-xl) 0 0",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
          transform: sheetExpanded ? "translateY(0)" : "translateY(calc(100% - 160px))",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          maxHeight: "85vh", overflowY: sheetExpanded ? "auto" : "hidden",
          pointerEvents: "auto",
        }}>
          {/* Drag handle */}
          <div
            onClick={() => setSheetExpanded(v => !v)}
            onMouseDown={(e) => onDragStart(e.clientY)} onMouseUp={(e) => onDragEnd(e.clientY)}
            onTouchStart={(e) => onDragStart(e.touches[0].clientY)} onTouchEnd={(e) => onDragEnd(e.changedTouches[0].clientY)}
            style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px", cursor: "pointer", userSelect: "none" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-strong)" }} />
          </div>

          <div style={{ padding: "4px 16px 32px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Route info */}
            <div className="card" style={{ margin: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <MapPin size={16} style={{ color: "var(--success)", marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Origen</div>
                    <div style={{ fontSize: "14px", fontWeight: 500 }}>{ride.originAddress}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <Navigation size={16} style={{ color: "var(--danger)", marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Destino</div>
                    <div style={{ fontSize: "14px", fontWeight: 500 }}>{ride.destAddress}</div>
                  </div>
                </div>
              </div>
              {ride.finalPrice && (
                <div style={{ borderTop: "1px solid var(--border)", marginTop: "14px", paddingTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{ride.cashbackApplied ? "Valor acordado" : "Tarifa acordada"}</span>
                  <span className="price-tag-primary">{formatCOP(Number(ride.finalPrice))}</span>
                </div>
              )}

              {ride.finalPrice && !!ride.cashbackApplied && ride.cashbackApplied > 0 && (
                <>
                  <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Cashback del cliente</span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--danger)" }}>-{formatCOP(ride.cashbackApplied)}</span>
                  </div>
                  <div style={{ marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>Total a cobrar en efectivo</span>
                    <span className="price-tag-accent">{formatCOP(Number(ride.finalPrice) - ride.cashbackApplied)}</span>
                  </div>
                </>
              )}
            </div>

            {ride.notes && (
              <div className="card" style={{ margin: 0, background: "var(--primary-xpale)", border: "1.5px solid rgba(37,99,235,0.15)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <FileText size={14} style={{ color: "var(--primary)" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase" }}>Nota del cliente</span>
                </div>
                <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.5, margin: 0 }}>{ride.notes}</p>
              </div>
            )}

            {/* Client info */}
            <div className="card" style={{ margin: 0 }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Cliente</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "15px" }}>{ride.client.fullName}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>{ride.client.phone}</div>
                </div>
                <a href={`tel:${ride.client.phone}`} className="btn btn-ghost btn-sm">Llamar</a>
              </div>
            </div>

            {sharingLocation && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px", color: "var(--primary)", fontWeight: 600 }}>
                <Radio size={14} />
                Compartiendo ubicación con el cliente
              </div>
            )}

            {isCompleted && (
              <div className="card" style={{ background: "var(--success-pale)", border: "1.5px solid rgba(22,163,74,0.25)", textAlign: "center", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                  <Flag size={28} color="var(--success)" />
                </div>
                <p style={{ fontWeight: 700, fontSize: "16px", color: "var(--success)" }}>Carrera completada</p>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>Volviendo al panel...</p>
              </div>
            )}
            {isCancelled && <div className="alert alert-error">Esta carrera fue cancelada.</div>}

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {isAccepted  && <Button variant="primary" fullWidth size="lg" loading={updating} onClick={() => updateStatus("HEADING_TO_PICKUP")}>Voy en camino</Button>}
              {isHeading   && <Button variant="primary" fullWidth size="lg" loading={updating} onClick={() => updateStatus("AT_PICKUP")}>Ya estoy aquí</Button>}
              {isAtPickup  && <Button variant="primary" fullWidth size="lg" loading={updating} onClick={startRoute}>Empezar ruta</Button>}
              {isInProgress && <Button variant="success" fullWidth size="lg" loading={updating} onClick={() => updateStatus("COMPLETED")}>Terminar ruta</Button>}

              {canCancel && (!confirmCancel ? (
                <Button variant="ghost" fullWidth onClick={() => setConfirmCancel(true)}>Cancelar carrera</Button>
              ) : (
                <div className="card animate-slide-down" style={{ border: "1.5px solid rgba(239,68,68,0.3)", padding: "16px" }}>
                  <p style={{ fontWeight: 600, fontSize: "14px", marginBottom: "12px", textAlign: "center" }}>¿Confirmar cancelación?</p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Button variant="ghost" fullWidth size="sm" onClick={() => setConfirmCancel(false)}>No, volver</Button>
                    <Button variant="danger" fullWidth size="sm" loading={cancelling} onClick={cancelRide}>Sí, cancelar</Button>
                  </div>
                </div>
              ))}

              {isDone && !isCompleted && (
                <Button variant="ghost" fullWidth onClick={() => router.push("/driver/dashboard")}>Volver al panel</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
