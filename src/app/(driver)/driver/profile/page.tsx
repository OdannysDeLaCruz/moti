"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { useAuth } from "@/lib/auth-context";

interface DriverData {
  fullName: string;
  email: string;
  phone: string;
  driverProfile: {
    status: string;
    vehiclePlate: string;
    vehicleModel: string;
    freeRidesUsed: number;
    passExpiresAt: string | null;
    createdAt: string;
  } | null;
}

const DRIVER_NAV = [
  { href: "/driver/dashboard", label: "Carreras", icon: "🏍️" },
  { href: "/driver/profile",   label: "Perfil",   icon: "👤" },
];

export default function DriverProfilePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
    router.push("/login");
  }

  const profile = user?.driverProfile;
  const passActive = profile?.passExpiresAt && new Date(profile.passExpiresAt) > new Date();

  return (
    <div className="page">
      <div className="screen-header">
        <span style={{ flex: 1, fontWeight: 700, fontSize: "17px" }}>Mi perfil</span>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
            <div className="spinner" style={{ color: "var(--primary)" }} />
          </div>
        ) : user ? (
          <div className="animate-fade-in">
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  background: "var(--success)",
                  borderRadius: "var(--r-full)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                  margin: "0 auto 12px",
                  boxShadow: "0 4px 16px rgba(22,163,74,0.3)",
                }}
              >
                🏍️
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 800 }}>{user.fullName}</h2>
              {profile && <StatusBadge status={profile.status as never} />}
            </div>

            <div className="card mb-4">
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>
                Contacto
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted text-sm">Correo</span>
                  <span className="font-medium text-sm">{user.email}</span>
                </div>
                <div style={{ borderTop: "1px solid var(--border)" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted text-sm">Teléfono</span>
                  <span className="font-medium text-sm">{user.phone}</span>
                </div>
              </div>
            </div>

            {profile && (
              <div className="card mb-4">
                <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>
                  Vehículo
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="text-muted text-sm">Placa</span>
                    <span className="font-bold text-sm" style={{ letterSpacing: "0.05em" }}>
                      {profile.vehiclePlate}
                    </span>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="text-muted text-sm">Modelo</span>
                    <span className="font-medium text-sm">{profile.vehicleModel}</span>
                  </div>
                </div>
              </div>
            )}

            {profile && (
              <div className="grid-2 mb-4">
                <div className="card" style={{ padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--primary)" }}>
                    {profile.freeRidesUsed}
                  </div>
                  <div className="text-xs text-muted mt-1">Viajes realizados</div>
                </div>
                <div className="card" style={{ padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: passActive ? "var(--success)" : "var(--text-dim)" }}>
                    {passActive ? "Activo" : "—"}
                  </div>
                  <div className="text-xs text-muted mt-1">Pase diario</div>
                </div>
              </div>
            )}

            {passActive && profile?.passExpiresAt && (
              <div className="alert alert-success mb-4">
                ✅ Pase activo hasta{" "}
                {new Date(profile.passExpiresAt).toLocaleTimeString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}

            <Button variant="danger" fullWidth loading={signingOut} onClick={handleSignOut}>
              Cerrar sesión
            </Button>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <p>No se pudo cargar el perfil.</p>
          </div>
        )}
      </div>

      <BottomNav items={DRIVER_NAV} />
    </div>
  );
}
