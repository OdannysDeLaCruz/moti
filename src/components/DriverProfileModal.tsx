"use client";

import { useEffect, useRef, useState } from "react";
import { Bike } from "lucide-react";
import Image from "next/image";
import api from "@/lib/api-client";

interface DriverPublicProfile {
  id: string;
  fullName: string;
  phone: string;
  driverProfile: {
    profilePhotoUrl?: string | null;
    vehiclePlate?: string | null;
    vehicleModel?: string | null;
    vehicleType?: string | null;
  } | null;
  completedRides: number;
}

interface Props {
  rideId: string;
  driverId: string;
  fallbackName?: string;
  fallbackPhotoUrl?: string | null;
  onClose: () => void;
}

export default function DriverProfileModal({
  rideId,
  driverId,
  fallbackName,
  fallbackPhotoUrl,
  onClose,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);

  const [profile, setProfile] = useState<DriverPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    api
      .get<DriverPublicProfile>(`/api/rides/${rideId}/driver/${driverId}`)
      .then(({ data }) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar el perfil del conductor.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rideId, driverId]);

  function onDragStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = 0;
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }

  function onDragMove(e: React.TouchEvent) {
    const delta = Math.max(0, e.touches[0].clientY - dragStartY.current);
    dragCurrentY.current = delta;
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`;
  }

  function onDragEnd() {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.style.transition = "transform 0.3s cubic-bezier(0.4,0,0.2,1)";
    if (dragCurrentY.current > 100) {
      sheet.style.transform = "translateY(100%)";
      setTimeout(onClose, 300);
    } else {
      sheet.style.transform = "translateY(0)";
    }
  }

  const name = profile?.fullName ?? fallbackName ?? "Conductor";
  const photo = profile?.driverProfile?.profilePhotoUrl ?? fallbackPhotoUrl ?? undefined;
  const plate = profile?.driverProfile?.vehiclePlate;
  const model = profile?.driverProfile?.vehicleModel;
  const vehicleType = profile?.driverProfile?.vehicleType;

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.5)",
          zIndex: 400,
          animation: "fadeIn 200ms ease both",
        }}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: 480,
          margin: "0 auto",
          minHeight: "50dvh",
          background: "var(--bg)",
          borderRadius: "var(--r-xl) var(--r-xl) 0 0",
          zIndex: 401,
          display: "flex",
          flexDirection: "column",
          padding: "12px 20px max(32px, env(safe-area-inset-bottom))",
          animation: "slideUp 280ms cubic-bezier(0.4,0,0.2,1) both",
          boxShadow: "0 -8px 40px rgba(15,23,42,0.15)",
          willChange: "transform",
        }}
      >
        {/* Handle — drag area */}
        <div
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "4px 0 20px",
            margin: "-12px -20px 0",
            touchAction: "none",
            cursor: "grab",
            userSelect: "none",
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border-strong)" }} />
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div className="spinner spinner-lg" style={{ color: "var(--primary)" }} />
          </div>
        ) : (
          <>
            {/* Avatar + name */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 20 }}>
              {photo ? (
                <Image
                  src={photo}
                  alt={name}
                  width={88}
                  height={88}
                  style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary-light)" }}
                />
              ) : (
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    background: "var(--primary-pale)",
                    border: "3px solid var(--primary-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 30,
                    fontWeight: 700,
                    color: "var(--primary)",
                  }}
                >
                  {initials || "👤"}
                </div>
              )}
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", textAlign: "center" }}>
                {name}
              </div>
              {vehicleType && (
                <span
                  className={`badge ${vehicleType === "BICI" ? "badge-accent" : "badge-active"}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Bike size={12} />
                  {vehicleType === "BICI" ? "Bicicleta" : "Moto"}
                </span>
              )}
            </div>

            <div style={{ height: 1, background: "var(--border)", marginBottom: 20 }} />

            {/* Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              {plate && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="text-sm text-muted">Placa</span>
                  <span className="chip">{plate}</span>
                </div>
              )}
              {model && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="text-sm text-muted">Vehículo</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{model}</span>
                </div>
              )}
              {profile && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="text-sm text-muted">Carreras completadas</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                    {profile.completedRides}
                  </span>
                </div>
              )}
            </div>

            {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

            <button className="btn btn-ghost btn-full" onClick={onClose}>
              Cerrar
            </button>
          </>
        )}
      </div>
    </>
  );
}
