"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import AdminListToolbar from "@/components/admin/AdminListToolbar";
import api from "@/lib/api-client";
import { User, ChevronRight } from "lucide-react";

interface DriverListItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  driverProfile: {
    status: "PENDING" | "APPROVED" | "REJECTED";
    vehicleModel: string;
    vehiclePlate: string | null;
  };
}

const CHIPS = [
  { key: "ALL", label: "Todos" },
  { key: "PENDING", label: "Pendientes" },
  { key: "APPROVED", label: "Aprobados" },
  { key: "REJECTED", label: "Rechazados" },
];

const PAGE_SIZE = 20;

export default function AdminDriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  const load = useCallback((s: string, q: string, skip: number) => {
    return api.get<{ items: DriverListItem[]; total: number }>("/api/admin/drivers", {
      params: { status: s, ...(q ? { q } : {}), skip, take: PAGE_SIZE },
    });
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    load(status, search, 0)
      .then(({ data }) => {
        if (id !== requestId.current) return;
        setDrivers(Array.isArray(data?.items) ? data.items : []);
        setTotal(data?.total ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [status, search, load]);

  async function loadMore() {
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const { data } = await load(status, search, drivers.length);
      if (id !== requestId.current) return;
      setDrivers((prev) => [...prev, ...(Array.isArray(data?.items) ? data.items : [])]);
    } catch {
      // ignore
    } finally {
      if (id === requestId.current) setLoadingMore(false);
    }
  }

  const canLoadMore = drivers.length < total;

  return (
    <div className="animate-fade-in">
      <AdminListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, correo o teléfono..."
        chips={CHIPS}
        activeChip={status}
        onChipChange={setStatus}
      />
      {!loading && (
        <p className="text-sm text-muted mb-2">{total} resultado{total !== 1 ? "s" : ""}</p>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
          <div className="spinner" style={{ color: "var(--primary)" }} />
        </div>
      ) : drivers.length === 0 ? (
        <div className="empty-state">
          <p className="font-semibold">Sin conductores</p>
          <p className="text-sm text-muted">No hay conductores en esta categoría.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {drivers.map((driver) => (
              <button
                key={driver.id}
                onClick={() => router.push(`/admin/drivers/${driver.id}`)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px", width: "100%", textAlign: "left",
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)", padding: "12px 16px",
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", background: "var(--surface-2)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <User size={18} color="var(--text-muted)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{driver.fullName}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {driver.phone} · {driver.driverProfile.vehicleModel}
                    {driver.driverProfile.vehiclePlate ? ` (${driver.driverProfile.vehiclePlate})` : ""}
                  </div>
                </div>
                <StatusBadge status={driver.driverProfile.status} />
                <ChevronRight size={14} style={{ color: "var(--text-dim)" }} />
              </button>
            ))}
          </div>

          {canLoadMore && (
            <div style={{ marginTop: "16px" }}>
              <Button variant="ghost" fullWidth loading={loadingMore} onClick={loadMore}>
                Cargar más
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
