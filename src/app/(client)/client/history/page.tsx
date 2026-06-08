"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";

interface Ride {
  id: string;
  originAddress: string;
  destAddress: string;
  initialPrice: string;
  finalPrice: string | null;
  status: string;
  createdAt: string;
}

const CLIENT_NAV = [
  { href: "/client/dashboard", label: "Inicio",   icon: "🏠" },
  { href: "/client/history",   label: "Historial", icon: "📋" },
  { href: "/client/profile",   label: "Perfil",    icon: "👤" },
];

export default function ClientHistoryPage() {
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Ride[]>("/api/rides")
      .then(({ data }) => setRides(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="screen-header">
        <span style={{ flex: 1, fontWeight: 700, fontSize: "17px" }}>Mis carreras</span>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
            <div className="spinner" style={{ color: "var(--primary)" }} />
          </div>
        ) : rides.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p className="font-semibold">Sin carreras aún</p>
            <p className="text-sm">Tus carreras aparecerán aquí.</p>
            <button
              className="btn btn-primary btn-sm mt-4"
              onClick={() => router.push("/client/dashboard")}
            >
              Solicitar primera carrera
            </button>
          </div>
        ) : (
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {rides.map((ride) => (
              <div
                key={ride.id}
                className="card pointer"
                style={{ padding: "16px" }}
                onClick={() => router.push(`/client/negotiation/${ride.id}`)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-semibold text-sm truncate">{ride.originAddress}</p>
                    <p className="text-muted text-xs truncate">→ {ride.destAddress}</p>
                  </div>
                  <StatusBadge status={ride.status as never} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="text-xs text-muted">
                    {new Date(ride.createdAt).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="font-bold text-sm" style={{ color: "var(--accent-dark)" }}>
                    {formatCOP(Number(ride.finalPrice ?? ride.initialPrice))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav items={CLIENT_NAV} />
    </div>
  );
}
