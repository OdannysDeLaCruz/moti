"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api-client";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/lib/auth-context";

interface Stats {
  pendingVerifications: number;
  totalRides: number;
  activeRides: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  useAuthGuard('ADMIN');
  const { logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>("/api/admin/stats")
      .then(({ data }) => setStats(data))
      .catch(() => setStats({ pendingVerifications: 0, totalRides: 0, activeRides: 0 }));
  }, []);

  return (
    <div className="page">
      <div className="screen-header">
        <span style={{ fontSize: "1.2rem" }}>⚙️</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "17px" }}>Panel Admin</span>
        <button
          onClick={async () => { await logout(); router.push("/login"); }}
          style={{
            background: "none",
            border: "1.5px solid var(--border-strong)",
            borderRadius: "var(--r-sm)",
            padding: "5px 12px",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          Salir
        </button>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="grid-3 mb-6 animate-slide-down">
          <div className="card" style={{ padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--warning)" }}>
              {stats?.pendingVerifications ?? "—"}
            </div>
            <div className="text-xs text-muted mt-1">Por verificar</div>
          </div>
          <div className="card" style={{ padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--primary)" }}>
              {stats?.activeRides ?? "—"}
            </div>
            <div className="text-xs text-muted mt-1">Carreras activas</div>
          </div>
          <div className="card" style={{ padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--success)" }}>
              {stats?.totalRides ?? "—"}
            </div>
            <div className="text-xs text-muted mt-1">Total carreras</div>
          </div>
        </div>

        {/* Quick links */}
        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
          Gestión
        </h3>

        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            className="card pointer"
            style={{ textAlign: "left", width: "100%", background: "none", border: "1px solid var(--border)", cursor: "pointer" }}
            onClick={() => router.push("/admin/verify")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  background: "var(--warning-pale)",
                  borderRadius: "var(--r-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  flexShrink: 0,
                }}
              >
                🔍
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "15px" }}>Verificar Conductores</div>
                <div className="text-muted text-sm">Aprobar o rechazar perfiles pendientes</div>
              </div>
              <span style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: "18px" }}>›</span>
            </div>
          </button>

          <button
            className="card pointer"
            style={{ textAlign: "left", width: "100%", background: "none", border: "1px solid var(--border)", cursor: "pointer" }}
            onClick={() => router.push("/admin/config")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  background: "var(--primary-xpale)",
                  borderRadius: "var(--r-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  flexShrink: 0,
                }}
              >
                ⚙️
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "15px" }}>Configuración</div>
                <div className="text-muted text-sm">Precios, pases y parámetros del sistema</div>
              </div>
              <span style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: "18px" }}>›</span>
            </div>
          </button>

          <button
            className="card pointer"
            style={{ textAlign: "left", width: "100%", background: "none", border: "1px solid var(--border)", cursor: "pointer" }}
            onClick={() => {
              setStats(null);
              api.get<Stats>("/api/admin/stats")
                .then(({ data }) => setStats(data))
                .catch(() => setStats({ pendingVerifications: 0, totalRides: 0, activeRides: 0 }));
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  background: "var(--success-pale)",
                  borderRadius: "var(--r-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  flexShrink: 0,
                }}
              >
                🔄
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "15px" }}>Actualizar estadísticas</div>
                <div className="text-muted text-sm">Recargar datos del sistema</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
