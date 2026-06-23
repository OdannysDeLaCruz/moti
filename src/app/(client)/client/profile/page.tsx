"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import Button from "@/components/ui/Button";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/lib/auth-context";
import { User } from "lucide-react";

interface UserData {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
}

const CLIENT_NAV = [
  { href: "/client/dashboard", label: "Inicio",   icon: "🏠" },
  { href: "/client/history",   label: "Historial", icon: "📋" },
  { href: "/client/profile",   label: "Perfil",    icon: "👤" },
];

export default function ClientProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuthGuard('CLIENT') as { user: UserData, loading: boolean };
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
    router.push("/login");
  }

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
                  width: 80, height: 80,
                  background: "var(--primary)",
                  borderRadius: "var(--r-full)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 12px",
                  boxShadow: "var(--shadow-primary)",
                }}
              >
                <User size={36} color="#fff" />
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 800 }}>{user.fullName}</h2>
              <span className="badge badge-active mt-2">Cliente</span>
            </div>

            <div className="card mb-4">
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>
                Información
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="text-muted text-sm">Correo</span>
                  <span className="font-medium text-sm">{user.email}</span>
                </div>
                <div style={{ borderTop: "1px solid var(--border)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="text-muted text-sm">Teléfono</span>
                  <span className="font-medium text-sm">{user.phone}</span>
                </div>
                <div style={{ borderTop: "1px solid var(--border)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="text-muted text-sm">Miembro desde</span>
                  <span className="font-medium text-sm">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "long" })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            <Button variant="danger" fullWidth loading={signingOut} onClick={handleSignOut}>
              Cerrar sesión
            </Button>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><User size={32} /></div>
            <p>No se pudo cargar el perfil.</p>
          </div>
        )}
      </div>

      <BottomNav items={CLIENT_NAV} />
    </div>
  );
}
