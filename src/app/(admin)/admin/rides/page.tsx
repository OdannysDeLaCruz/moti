"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { Bike, Package, ChevronRight } from "lucide-react";

interface Ride {
  id: string;
  originAddress: string;
  destAddress: string;
  initialPrice: number;
  finalPrice: number | null;
  status: string;
  rideType: "TRANSPORT" | "DELIVERY";
  createdAt: string;
  client: { fullName: string; phone: string };
  driver: { fullName: string; phone: string } | null;
}

const STATUS_GROUPS = {
  activas: ["PENDING", "NEGOTIATING", "ACCEPTED", "HEADING_TO_PICKUP", "AT_PICKUP", "IN_PROGRESS"],
  completadas: ["COMPLETED"],
  canceladas: ["CANCELLED"],
  todas: null,
} as const;

type FilterKey = keyof typeof STATUS_GROUPS;

const FILTER_LABELS: Record<FilterKey, string> = {
  activas: "Activas",
  completadas: "Completadas",
  canceladas: "Canceladas",
  todas: "Todas",
};

export default function AdminRidesPage() {
  const router = useRouter();
  useAuthGuard("ADMIN");
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("activas");

  useEffect(() => {
    api.get<Ride[]>("/api/rides")
      .then(({ data }) => setRides(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const statuses = STATUS_GROUPS[filter];
    if (!statuses) return rides;
    return rides.filter((r) => statuses.includes(r.status as never));
  }, [rides, filter]);

  const counts = useMemo(() => ({
    activas: rides.filter((r) => STATUS_GROUPS.activas.includes(r.status as never)).length,
    completadas: rides.filter((r) => r.status === "COMPLETED").length,
    canceladas: rides.filter((r) => r.status === "CANCELLED").length,
    todas: rides.length,
  }), [rides]);

  return (
    <div className="page">
      <div className="screen-header">
        <button onClick={() => router.push("/admin/dashboard")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", padding: "4px 8px", color: "var(--text)" }}>
          ←
        </button>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "17px" }}>Carreras</span>
        {!loading && (
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filtros */}
      <div style={{ padding: "10px 16px 0", display: "flex", gap: "8px", overflowX: "auto", borderBottom: "1px solid var(--border)" }}>
        {(Object.keys(STATUS_GROUPS) as FilterKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              borderRadius: "var(--r-full)",
              border: filter === key ? "none" : "1.5px solid var(--border)",
              background: filter === key ? "var(--primary)" : "transparent",
              color: filter === key ? "#fff" : "var(--text-muted)",
              fontFamily: "inherit",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {FILTER_LABELS[key]}
            <span style={{
              background: filter === key ? "rgba(255,255,255,0.25)" : "var(--surface-2)",
              borderRadius: "var(--r-full)",
              padding: "1px 6px",
              fontSize: "11px",
              fontWeight: 700,
              color: filter === key ? "#fff" : "var(--text-muted)",
            }}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      <div className="page-content" style={{ paddingTop: "12px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
            <div className="spinner" style={{ color: "var(--primary)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="font-semibold">Sin carreras</p>
            <p className="text-sm text-muted">No hay carreras en esta categoría.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map((ride) => (
              <button
                key={ride.id}
                onClick={() => router.push(`/admin/rides/${ride.id}`)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)", padding: "14px 16px",
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {ride.rideType === "DELIVERY"
                      ? <Package size={14} style={{ color: "var(--accent-dark)", flexShrink: 0 }} />
                      : <Bike size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    }
                    <span style={{ fontSize: "12px", fontWeight: 600, color: ride.rideType === "DELIVERY" ? "var(--accent-dark)" : "var(--primary)" }}>
                      {ride.rideType === "DELIVERY" ? "Domicilio" : "Carrera"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <StatusBadge status={ride.status as never} />
                    <ChevronRight size={14} style={{ color: "var(--text-dim)" }} />
                  </div>
                </div>

                <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ride.originAddress}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  → {ride.destAddress}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{ride.client.fullName.split(" ")[0]}</span>
                    {ride.driver && <> · <span>{ride.driver.fullName.split(" ")[0]}</span></>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {ride.finalPrice && (
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--success)" }}>
                        {formatCOP(ride.finalPrice)}
                      </span>
                    )}
                    <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                      {new Date(ride.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
