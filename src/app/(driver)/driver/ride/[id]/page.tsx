"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
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
}

export default function DriverRidePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const locationChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    api.get<Ride>(`/api/rides/${id}`)
      .then(({ data }) => setRide(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Subscribe to broadcast channel so we can send location updates from it
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

  useEffect(() => {
    if (ride?.status !== "IN_PROGRESS") return;
    const interval = setInterval(() => {
      if (!navigator.geolocation || !locationChannelRef.current) return;
      navigator.geolocation.getCurrentPosition((pos) => {
        locationChannelRef.current?.send({
          type: 'broadcast',
          event: 'driver:location',
          payload: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [ride?.status]);

  useRideSocket(id, {
    onStatus: ({ status }) => setRide((prev) => (prev ? { ...prev, status } : prev)),
  });

  async function updateStatus(newStatus: "IN_PROGRESS" | "COMPLETED") {
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

  const isCompleted = ride.status === "COMPLETED";
  const isInProgress = ride.status === "IN_PROGRESS";
  const isAccepted = ride.status === "ACCEPTED";

  return (
    <div className="page">
      <div className="screen-header">
        <button
          onClick={() => router.push("/driver/dashboard")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", padding: "4px 8px" }}
        >
          ←
        </button>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "17px" }}>
          {ride.rideType === "DELIVERY" ? "Domicilio activo" : "Carrera activa"}
        </span>
        <StatusBadge status={ride.status as never} />
      </div>

      <div className="page-content">
        <MapView
          center={[ride.originLat ?? 4.711, ride.originLng ?? -74.072]}
          zoom={15}
          height={220}
          pins={[{ lat: ride.originLat ?? 4.711, lng: ride.originLng ?? -74.072, label: "Recogida", color: "green" as const }]}
        />

        <div className="card mt-3 mb-4">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Origen</div>
              <div style={{ fontSize: "15px", fontWeight: 500 }}>{ride.originAddress}</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Destino</div>
              <div style={{ fontSize: "15px", fontWeight: 500 }}>{ride.destAddress}</div>
            </div>
          </div>

          {ride.finalPrice && (
            <div style={{ borderTop: "1px solid var(--border)", marginTop: "12px", paddingTop: "12px", display: "flex", justifyContent: "space-between" }}>
              <span className="text-muted text-sm">Tarifa acordada</span>
              <span className="price-tag-primary">{formatCOP(Number(ride.finalPrice))}</span>
            </div>
          )}
        </div>

        <div className="card mb-4">
          <p className="text-xs text-muted mb-1">Cliente</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-semibold">{ride.client.fullName}</span>
            <a href={`tel:${ride.client.phone}`} className="btn btn-ghost btn-sm">Llamar</a>
          </div>
        </div>

        {isCompleted && (
          <div className="card card-success mb-4">
            <p className="font-semibold" style={{ color: "var(--success)" }}>Carrera completada</p>
          </div>
        )}

        {isAccepted && (
          <Button variant="primary" fullWidth size="lg" loading={updating} onClick={() => updateStatus("IN_PROGRESS")}>
            Llegué al origen — Iniciar viaje
          </Button>
        )}

        {isInProgress && (
          <Button variant="success" fullWidth size="lg" loading={updating} onClick={() => updateStatus("COMPLETED")}>
            Llegué al destino — Finalizar viaje
          </Button>
        )}

        {isCompleted && (
          <Button variant="ghost" fullWidth onClick={() => router.push("/driver/dashboard")}>
            Volver al panel
          </Button>
        )}
      </div>
    </div>
  );
}
