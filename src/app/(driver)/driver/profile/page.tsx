"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import StatusBadge from "@/components/ui/StatusBadge";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";
import { MapPin, Mail, Phone, Car, LogOut, Gift, User } from "lucide-react";
import { formatCOP } from "@/lib/whatsapp";
import AccessRequiredAlert from "@/components/driver/AccessRequiredAlert";

// const FREE_RIDES_TOTAL = 2;

const DRIVER_NAV = [
  { href: "/driver/dashboard", label: "Carreras", icon: "🏍️" },
  { href: "/driver/profile", label: "Perfil", icon: "👤" },
];

export default function DriverProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuthGuard("DRIVER");
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const FREE_RIDES_TOTAL = user?.maxFreeRides ?? 2;

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
    router.push("/login");
  }

  const profile = user?.driverProfile;
  const passActive = profile?.passExpiresAt && new Date(profile.passExpiresAt) > new Date();
  const ridesUsed = profile?.freeRidesUsed ?? 0;
  const ridesLeft = Math.max(0, FREE_RIDES_TOTAL - ridesUsed);
  const freeUsedUp = ridesUsed >= FREE_RIDES_TOTAL;
  console.log('freeUsedUp', freeUsedUp)

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
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

            {/* Avatar + nombre */}
            <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
              <div style={{
                width: 76, height: 76, borderRadius: "var(--r-full)",
                overflow: "hidden", border: "3px solid var(--primary)",
                margin: "0 auto 10px", boxShadow: "var(--shadow-primary)"
              }}>
                <Image
                  src={profile?.profilePhotoUrl || "/default-avatar.png"}
                  alt="Foto de perfil" width={76} height={76}
                  style={{ objectFit: "cover" }}
                />
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "4px" }}>{user.fullName}</h2>
              {profile && <StatusBadge status={profile.status as never} />}

              {/* Ciudad */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                marginTop: "8px", fontSize: "13px", color: "var(--text-muted)",
                background: "var(--surface-2)", borderRadius: "var(--r-full)",
                padding: "3px 10px"
              }}>
                <MapPin size={12} strokeWidth={2.5} />
                <span>Valledupar</span>
              </div>
            </div>

            {/* Viajes y plan */}
            {freeUsedUp && passActive && profile?.passExpiresAt ? (
              // Caso especial: ya no tiene viajes gratis pero SÍ tiene pase activo —
              // el pase es la información relevante aquí, los viajes gratuitos usados pasan a un segundo plano.
              <div className="card" style={{ padding: "16px" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  background: "var(--success-pale)", borderRadius: "var(--r-sm)",
                  padding: "14px", marginBottom: "14px"
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%", background: "var(--success)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                  }}>
                    <MapPin size={20} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: "16px", color: "var(--success)" }}>Pase activo</p>
                    <p style={{ fontSize: "13px", color: "var(--text)" }}>
                      Hasta el{" "}
                      <strong>
                        {new Date(profile.passExpiresAt).toLocaleString("es-CO", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </strong>
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6, marginBottom: user?.commissionOwed ? "6px" : 0 }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Viajes gratuitos usados</span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{ridesUsed} de {FREE_RIDES_TOTAL}</span>
                </div>
                {!!user?.commissionOwed && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Comisión pendiente</span>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{formatCOP(user.commissionOwed)}</span>
                  </div>
                )}
              </div>
            ) : freeUsedUp ? (
              <AccessRequiredAlert
                commissionOwed={user?.commissionOwed}
                unpaidRideCount={user?.unpaidRideCount}
                userId={user?.id}
              />
            ) : (
              <div className="card" style={{ padding: "16px" }}>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                  Tus viajes
                </p>

                <div style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                    <span style={{ fontSize: "28px", fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>
                      {ridesUsed}
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                      de {FREE_RIDES_TOTAL} gratuitos usados
                    </span>
                  </div>
                  <div style={{ height: "6px", background: "var(--surface-3)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, (ridesUsed / FREE_RIDES_TOTAL) * 100)}%`,
                      background: "var(--primary)",
                      borderRadius: "var(--r-full)",
                      transition: "width 0.4s ease"
                    }} />
                  </div>
                </div>

                <div style={{
                  display: "flex", alignItems: "flex-start", gap: "10px",
                  background: "var(--primary-xpale)", borderRadius: "var(--r-sm)",
                  padding: "10px 12px", fontSize: "13px"
                }}>
                  <Gift size={16} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "1px" }} />
                  <div>
                    <p style={{ fontWeight: 600, color: "var(--primary-dark)", marginBottom: "2px" }}>
                      Te quedan <strong>{ridesLeft}</strong> {ridesLeft === 1 ? "viaje gratuito" : "viajes gratuitos"}
                    </p>
                    <p style={{ color: "var(--text-muted)" }}>
                      Al completar tus viajes gratuitos, se cobrará una comisión por cada carrera para continuar operando.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Contacto */}
            <div className="card" style={{ padding: "16px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                Contacto
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Row icon={<Mail size={14} />} label="Correo" value={user.email} />
                <div style={{ borderTop: "1px solid var(--border)" }} />
                <Row icon={<Phone size={14} />} label="Teléfono" value={user.phone} />
              </div>
            </div>

            {/* Vehículo */}
            {profile && (
              <div className="card" style={{ padding: "16px" }}>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                  Vehículo
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <Row icon={<Car size={14} />} label="Placa" value={profile.vehiclePlate} bold />
                  <div style={{ borderTop: "1px solid var(--border)" }} />
                  <Row icon={<Car size={14} />} label="Modelo" value={profile.vehicleModel} />
                </div>
              </div>
            )}

            {/* Cerrar sesión — discreto */}
            <div style={{ textAlign: "center", paddingTop: "4px", paddingBottom: "8px" }}>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "13px", color: "var(--text-muted)",
                  padding: "6px 12px", borderRadius: "var(--r-full)",
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  transition: "color var(--t-fast)"
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--danger)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                <LogOut size={13} />
                {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
              </button>
            </div>

          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><User size={32} /></div>
            <p>No se pudo cargar el perfil.</p>
          </div>
        )}
      </div>

      <BottomNav items={DRIVER_NAV} />
    </div>
  );
}

function Row({ icon, label, value, bold }: { icon: React.ReactNode; label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
        {icon}
        <span style={{ fontSize: "13px" }}>{label}</span>
      </div>
      <span style={{ fontSize: "13px", fontWeight: bold ? 700 : 500, letterSpacing: bold ? "0.06em" : undefined }}>
        {value}
      </span>
    </div>
  );
}
