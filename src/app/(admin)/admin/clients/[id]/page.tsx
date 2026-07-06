"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { Mail, Phone, User, Wallet, ChevronDown, ChevronUp } from "lucide-react";

interface RideRow {
  id: string;
  originAddress: string;
  destAddress: string;
  status: string;
  rideType: "TRANSPORT" | "DELIVERY";
  finalPrice: number | null;
  initialPrice: number;
  createdAt: string;
  driver: { fullName: string; phone: string } | null;
}

interface ClientWallet {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  completedRidesCount: number;
}

interface ClientDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  createdAt: string;
  rides: { items: RideRow[]; total: number };
  wallet: ClientWallet;
}

interface CashbackTransaction {
  id: string;
  walletId: string;
  rideRequestId: string | null;
  type: "EARN" | "REDEEM" | "REFUND";
  amount: number;
  balanceAfter: number;
  createdAt: string;
}

const PAGE_SIZE = 20;

export default function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [rides, setRides] = useState<RideRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<CashbackTransaction[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback((skip: number) => {
    return api.get<ClientDetail>(`/api/admin/clients/${id}`, { params: { skip, take: PAGE_SIZE } });
  }, [id]);

  useEffect(() => {
    load(0)
      .then(({ data }) => {
        setClient(data);
        setRides(Array.isArray(data?.rides?.items) ? data.rides.items : []);
        setTotal(data?.rides?.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const { data } = await load(rides.length);
      setRides((prev) => [...prev, ...(Array.isArray(data?.rides?.items) ? data.rides.items : [])]);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && !history) {
      setHistoryLoading(true);
      api.get<{ items: CashbackTransaction[]; total: number }>(`/api/admin/cashback/${id}`)
        .then(({ data }) => setHistory(Array.isArray(data?.items) ? data.items : []))
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }

  const canLoadMore = rides.length < total;
  const wallet = client?.wallet ?? { balance: 0, totalEarned: 0, totalRedeemed: 0, completedRidesCount: 0 };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
        <div className="spinner spinner-lg" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!client) {
    return (
      <div>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "13px", fontWeight: 600, padding: "0 0 12px" }}>
          ← Volver a Clientes
        </button>
        <div className="empty-state"><p>Cliente no encontrado.</p></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "13px", fontWeight: 600, padding: "0 0 12px" }}>
        ← Volver a Clientes
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="card" style={{ padding: "16px", display: "flex", gap: "14px", alignItems: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User size={24} color="var(--text-muted)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: "17px" }}>{client.fullName}</p>
            <p className="text-muted" style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}><Mail size={12} /> {client.email ?? "—"}</p>
            <p className="text-muted" style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}><Phone size={12} /> {client.phone}</p>
          </div>
        </div>

        <div className="card" style={{ padding: "16px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            Cashback
          </p>
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 800 }}>{formatCOP(wallet.balance)}</div>
              <div className="text-xs text-muted">Saldo</div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--success)" }}>{formatCOP(wallet.totalEarned)}</div>
              <div className="text-xs text-muted">Ganado</div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 800 }}>{formatCOP(wallet.totalRedeemed)}</div>
              <div className="text-xs text-muted">Usado</div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 800 }}>{wallet.completedRidesCount}</div>
              <div className="text-xs text-muted">Carreras</div>
            </div>
          </div>

          <Button variant="ghost" size="sm" fullWidth onClick={toggleHistory}>
            <Wallet size={14} /> {historyOpen ? "Ocultar" : "Ver"} historial de cashback
            {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>

          {historyOpen && (
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {historyLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                  <div className="spinner" />
                </div>
              ) : history && history.length === 0 ? (
                <p className="text-sm text-muted">Sin movimientos de cashback registrados.</p>
              ) : (
                history?.map((tx) => (
                  <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600 }}>
                        {tx.type === "EARN" ? "Ganado" : tx.type === "REDEEM" ? "Aplicado" : "Devuelto"}
                      </div>
                      <div className="text-xs text-muted">
                        {new Date(tx.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: tx.type === "REDEEM" ? "var(--danger)" : "var(--success)" }}>
                      {tx.type === "REDEEM" ? "-" : "+"}{formatCOP(tx.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: "16px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            Historial de carreras ({total})
          </p>
          {rides.length === 0 ? (
            <p className="text-sm text-muted">Este cliente aún no ha solicitado carreras.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {rides.map((ride) => (
                <button
                  key={ride.id}
                  onClick={() => router.push(`/admin/rides/${ride.id}`)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)", background: "none", border: "none", cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                      {ride.originAddress} → {ride.destAddress}
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(ride.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                      {ride.driver && ` · ${ride.driver.fullName.split(" ")[0]}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {(ride.finalPrice ?? ride.initialPrice) && (
                      <span style={{ fontSize: "13px", fontWeight: 700 }}>{formatCOP(ride.finalPrice ?? ride.initialPrice)}</span>
                    )}
                    <StatusBadge status={ride.status as never} showDot={false} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {canLoadMore && (
            <div style={{ marginTop: "12px" }}>
              <Button variant="ghost" fullWidth size="sm" loading={loadingMore} onClick={loadMore}>
                Cargar más
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
