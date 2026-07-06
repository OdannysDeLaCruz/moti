"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api-client";
import { formatCOP } from "@/lib/whatsapp";
import Button from "@/components/ui/Button";
import { RefreshCw } from "lucide-react";

interface Stats {
  pendingVerifications: number;
  totalRides: number;
  activeRides: number;
  totalDrivers: number;
  totalClients: number;
  totalCommissionOwed: number;
}

const EMPTY_STATS: Stats = {
  pendingVerifications: 0,
  totalRides: 0,
  activeRides: 0,
  totalDrivers: 0,
  totalClients: 0,
  totalCommissionOwed: 0,
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  function load() {
    setLoading(true);
    api.get<Stats>("/api/admin/stats")
      .then(({ data }) => setStats(data))
      .catch(() => setStats(EMPTY_STATS))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const tiles = [
    { label: "Por verificar", value: stats?.pendingVerifications, color: "var(--warning)" },
    { label: "Carreras activas", value: stats?.activeRides, color: "var(--primary)" },
    { label: "Total carreras", value: stats?.totalRides, color: "var(--success)" },
    { label: "Conductores", value: stats?.totalDrivers, color: "var(--primary)" },
    { label: "Clientes", value: stats?.totalClients, color: "var(--primary)" },
    { label: "Comisión pendiente", value: stats ? formatCOP(stats.totalCommissionOwed) : undefined, color: "var(--danger)" },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <Button variant="ghost" size="sm" loading={loading} onClick={load}>
          <RefreshCw size={14} /> Actualizar
        </Button>
      </div>

      <div className="grid-3" style={{ gap: "10px" }}>
        {tiles.map((tile) => (
          <div key={tile.label} className="card" style={{ padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: tile.color }}>
              {tile.value ?? "—"}
            </div>
            <div className="text-xs text-muted mt-1">{tile.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
