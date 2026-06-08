"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { Toast } from "@/components/ui/Toast";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { playStatusNegative } from "@/lib/sounds";
import { useRideSocket } from "@/hooks/useRideSocket";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface Ride {
  id: string;
  originAddress: string;
  destAddress: string;
  originLat: number;
  originLng: number;
  finalPrice: string | null;
  status: string;
  rideType: "TRANSPORT" | "DELIVERY";
  client: { fullName: string; phone: string };
  notes?: string | null;
}

type UpdatableStatus = "HEADING_TO_PICKUP" | "AT_PICKUP" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export default function OngoingRidePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelledByClient, setCancelledByClient] = useState(false);
  const locationChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    api.get<Ride>(`/api/rides/${id}`)
      .then(({ data }) => setRide(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Subscribe to broadcast channel for sending location
  useEffect(() => {
    if (!id) return;
    const supabase = getSupabaseClient();
    const ch = supabase.channel(`driver-location-${id}`);
    ch.subscribe(() => { locationChannelRef.current = ch; });
    return () => {
      supabase.removeChannel(ch);
      locationChannelRef.current = null;
    };
  }, [id]);

  const sharingLocation =
    ride?.status === "HEADING_TO_PICKUP" || ride?.status === "IN_PROGRESS";

  // Share location while heading to pickup and during the trip
  useEffect(() => {
    if (!sharingLocation) return;
    const interval = setInterval(() => {
      if (!navigator.geolocation || !locationChannelRef.current) return;
      navigator.geolocation.getCurrentPosition((pos) => {
        locationChannelRef.current?.send({
          type: "broadcast",
          event: "driver:location",
          payload: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [sharingLocation]);

  useRideSocket(id, {
    onStatus: ({ status }) => {
      setRide((prev) => {
        // Show toast if client cancelled while driver hadn't initiated it
        if (status === "CANCELLED" && prev?.status !== "CANCELLED") {
          setCancelledByClient(true);
          playStatusNegative();
        }
        return prev ? { ...prev, status } : prev;
      });
    },
  });

  async function updateStatus(newStatus: UpdatableStatus) {
    setUpdating(true);
    try {
      await api.patch(`/api/rides/${id}`, { status: newStatus });
      setRide((prev) => (prev ? { ...prev, status: newStatus } : prev));
      if (newStatus === "COMPLETED") {
        setTimeout(() => router.push("/driver/dashboard"), 2000);
      }
    } catch {}
    setUpdating(false);
  }

  async function cancelRide() {
    setCancelling(true);
    try {
      await api.patch(`/api/rides/${id}`, { status: "CANCELLED" });
      router.push("/driver/dashboard");
    } catch {
      setCancelling(false);
      setConfirmCancel(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100dvh" }}>
          <div className="spinner spinner-lg" style={{ color: "var(--primary)" }} />
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="empty-state">
            <p>Carrera no encontrada</p>
            <Button variant="primary" onClick={() => router.push("/driver/dashboard")}>Volver</Button>
          </div>
        </div>
      </div>
    );
  }

  const isAccepted        = ride.status === "ACCEPTED";
  const isHeading         = ride.status === "HEADING_TO_PICKUP";
  const isAtPickup        = ride.status === "AT_PICKUP";
  const isInProgress      = ride.status === "IN_PROGRESS";
  const isCompleted       = ride.status === "COMPLETED";
  const isCancelled       = ride.status === "CANCELLED";
  const isDone            = isCompleted || isCancelled;
  const canCancel         = isAccepted || isHeading || isAtPickup;

  return (
    <div className="page">
      {cancelledByClient && (
        <Toast
          type="error"
          icon="❌"
          message="Carrera cancelada"
          subMessage="El cliente canceló la carrera"
          actionLabel="Volver al panel"
          onAction={() => router.push("/driver/dashboard")}
          onDismiss={() => setCancelledByClient(false)}
        />
      )}

      <div className="screen-header">
        <button
          onClick={() => router.push("/driver/dashboard")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", padding: "4px 8px" }}
        >
          ←
        </button>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "17px" }}>
          {ride.rideType === "DELIVERY" ? "Domicilio en curso" : "Carrera en curso"}
        </span>
        <StatusBadge status={ride.status as never} />
      </div>

      <div className="page-content" style={{ paddingBottom: "32px" }}>
        <MapView
          center={[ride.originLat ?? 4.711, ride.originLng ?? -74.072]}
          zoom={15}
          height={220}
          pins={[
            { lat: ride.originLat ?? 4.711, lng: ride.originLng ?? -74.072, label: "Recogida", color: "green" as const },
          ]}
        />

        {/* Route info */}
        <div className="card mt-3 mb-3">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1rem", marginTop: "2px" }}>📍</span>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Origen
                </div>
                <div style={{ fontSize: "14px", fontWeight: 500, marginTop: "1px" }}>{ride.originAddress}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1rem", marginTop: "2px" }}>🎯</span>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Destino
                </div>
                <div style={{ fontSize: "14px", fontWeight: 500, marginTop: "1px" }}>{ride.destAddress}</div>
              </div>
            </div>
          </div>

          {ride.finalPrice && (
            <div
              style={{
                borderTop: "1px solid var(--border)",
                marginTop: "14px",
                paddingTop: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Tarifa acordada</span>
              <span className="price-tag-primary">{formatCOP(Number(ride.finalPrice))}</span>
            </div>
          )}
        </div>

        {/* Note from client */}
        {ride.notes && (
          <div className="card mb-3" style={{ background: "var(--primary-xpale)", border: "1.5px solid rgba(37,99,235,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "1rem" }}>📝</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Nota del cliente
              </span>
            </div>
            <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>{ride.notes}</p>
          </div>
        )}

        {/* Client info */}
        <div className="card mb-4">
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
            Cliente
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px" }}>{ride.client.fullName}</div>
              <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>{ride.client.phone}</div>
            </div>
            <a href={`tel:${ride.client.phone}`} className="btn btn-ghost btn-sm">
              Llamar
            </a>
          </div>
        </div>

        {/* Location sharing indicator */}
        {sharingLocation && (
          <div
            style={{
              fontSize: "12px",
              color: "var(--primary)",
              textAlign: "center",
              fontWeight: 600,
              padding: "6px 0 10px",
            }}
          >
            📡 Compartiendo ubicación con el cliente
          </div>
        )}

        {/* Status messages */}
        {isCompleted && (
          <div className="card mb-4" style={{ background: "var(--success-pale)", border: "1.5px solid rgba(22,163,74,0.25)", textAlign: "center", padding: "20px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🏁</div>
            <p style={{ fontWeight: 700, fontSize: "16px", color: "var(--success)" }}>Carrera completada</p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>Volviendo al panel...</p>
          </div>
        )}

        {isCancelled && (
          <div className="alert alert-error mb-4">Esta carrera fue cancelada.</div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {isAccepted && (
            <Button
              variant="primary"
              fullWidth
              size="lg"
              loading={updating}
              onClick={() => updateStatus("HEADING_TO_PICKUP")}
            >
              🏍️ Voy en camino
            </Button>
          )}

          {isHeading && (
            <Button
              variant="primary"
              fullWidth
              size="lg"
              loading={updating}
              onClick={() => updateStatus("AT_PICKUP")}
            >
              📍 Ya estoy aquí
            </Button>
          )}

          {isAtPickup && (
            <Button
              variant="primary"
              fullWidth
              size="lg"
              loading={updating}
              onClick={() => updateStatus("IN_PROGRESS")}
            >
              🚀 Empezar ruta
            </Button>
          )}

          {isInProgress && (
            <Button
              variant="success"
              fullWidth
              size="lg"
              loading={updating}
              onClick={() => updateStatus("COMPLETED")}
            >
              🏁 Terminar ruta
            </Button>
          )}

          {canCancel && (
            !confirmCancel ? (
              <Button variant="ghost" fullWidth onClick={() => setConfirmCancel(true)}>
                Cancelar carrera
              </Button>
            ) : (
              <div
                className="card animate-slide-down"
                style={{ border: "1.5px solid rgba(239,68,68,0.3)", padding: "16px" }}
              >
                <p style={{ fontWeight: 600, fontSize: "14px", marginBottom: "12px", textAlign: "center" }}>
                  ¿Confirmar cancelación?
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Button variant="ghost" fullWidth size="sm" onClick={() => setConfirmCancel(false)}>
                    No, volver
                  </Button>
                  <Button variant="danger" fullWidth size="sm" loading={cancelling} onClick={cancelRide}>
                    Sí, cancelar
                  </Button>
                </div>
              </div>
            )
          )}

          {isDone && !isCompleted && (
            <Button variant="ghost" fullWidth onClick={() => router.push("/driver/dashboard")}>
              Volver al panel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
