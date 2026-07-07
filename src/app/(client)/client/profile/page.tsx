"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import Button from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/lib/auth-context";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { User, Wallet, ChevronRight, Bell } from "lucide-react";

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
  const [cashbackBalance, setCashbackBalance] = useState<number | null>(null);
  const { supported: pushSupported, subscribed: pushSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const [pushBusy, setPushBusy] = useState(false);
  const [pushErrorToast, setPushErrorToast] = useState(false);

  useEffect(() => {
    api.get<{ balance: number }>("/api/cashback/me")
      .then(({ data }) => setCashbackBalance(data.balance))
      .catch(() => {});
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
    router.push("/login");
  }

  async function handleTogglePush() {
    setPushBusy(true);
    try {
      if (pushSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch {
      setPushErrorToast(true);
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="page">
      {pushErrorToast && (
        <Toast
          type="error"
          icon="x"
          message="No se pudieron activar las notificaciones"
          subMessage="Revisa tu conexión o el antivirus/firewall e intenta de nuevo"
          onDismiss={() => setPushErrorToast(false)}
        />
      )}

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

            <div
              className="card-ghost mb-4 pointer"
              onClick={() => router.push("/client/cashback")}
              style={{ display: "flex", alignItems: "center", gap: "12px" }}
            >
              <div
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "var(--accent-pale)", display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <Wallet size={18} color="var(--accent-dark)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-semibold text-sm">Mi cashback</p>
                <p className="text-muted text-xs">
                  {cashbackBalance !== null ? `Saldo disponible: ${formatCOP(cashbackBalance)}` : "Ver saldo e historial"}
                </p>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>

            <div className="card-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "var(--primary-pale)", display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <Bell size={18} color="var(--primary-dark)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-semibold text-sm">Notificaciones push</p>
                <p className="text-muted text-xs">
                  {!pushSupported
                    ? "No disponibles en este navegador"
                    : pushSubscribed
                      ? "Activadas"
                      : "Desactivadas"}
                </p>
              </div>
              <Button
                variant={pushSubscribed ? "ghost" : "primary"}
                size="sm"
                loading={pushBusy}
                disabled={!pushSupported}
                onClick={handleTogglePush}
              >
                {pushSubscribed ? "Desactivar" : "Activar"}
              </Button>
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
