"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import AdminListToolbar from "@/components/admin/AdminListToolbar";
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

const ACTIVE_STATUSES = ["PENDING", "NEGOTIATING", "ACCEPTED", "HEADING_TO_PICKUP", "AT_PICKUP", "IN_PROGRESS"];

const FILTERS = {
  activas: { label: "Activas", status: ACTIVE_STATUSES.join(",") as string | undefined },
  completadas: { label: "Completadas", status: "COMPLETED" as string | undefined },
  canceladas: { label: "Canceladas", status: "CANCELLED" as string | undefined },
  todas: { label: "Todas", status: undefined as string | undefined },
} as const;

type FilterKey = keyof typeof FILTERS;

const CHIPS = (Object.keys(FILTERS) as FilterKey[]).map((key) => ({ key, label: FILTERS[key].label }));

const PAGE_SIZE = 20;

export default function AdminRidesPage() {
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterKey>("activas");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  const load = useCallback((f: FilterKey, q: string, skip: number) => {
    const status = FILTERS[f].status;
    return api.get<{ items: Ride[]; total: number }>("/api/rides", {
      params: { ...(status ? { status } : {}), ...(q ? { q } : {}), skip, take: PAGE_SIZE },
    });
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load(filter, search, 0)
      .then(({ data }) => {
        if (id !== requestId.current) return; // respuesta obsoleta de un filtro/búsqueda anterior
        setRides(Array.isArray(data?.items) ? data.items : []);
        setTotal(data?.total ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [filter, search, load]);

  async function loadMore() {
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const { data } = await load(filter, search, rides.length);
      if (id !== requestId.current) return; // el filtro/búsqueda cambió mientras cargaba
      setRides((prev) => [...prev, ...(Array.isArray(data?.items) ? data.items : [])]);
    } catch {
      // ignore
    } finally {
      if (id === requestId.current) setLoadingMore(false);
    }
  }

  const canLoadMore = rides.length < total;

  return (
    <div className="animate-fade-in">
      <AdminListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por dirección..."
        chips={CHIPS}
        activeChip={filter}
        onChipChange={(key) => setFilter(key as FilterKey)}
      />
      {!loading && (
        <p className="text-sm text-muted mb-2">{total} resultado{total !== 1 ? "s" : ""}</p>
      )}

      <div>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
            <div className="spinner" style={{ color: "var(--primary)" }} />
          </div>
        ) : rides.length === 0 ? (
          <div className="empty-state">
            <p className="font-semibold">Sin carreras</p>
            <p className="text-sm text-muted">No hay carreras en esta categoría.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {rides.map((ride) => (
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
    </div>
  );
}
