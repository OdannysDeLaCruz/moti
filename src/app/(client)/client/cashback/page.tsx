"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import BottomNav from "@/components/ui/BottomNav";
import Button from "@/components/ui/Button";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, Gift, PiggyBank, RotateCcw, Sparkles, Wallet } from "lucide-react";

interface WalletSummary {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  completedRidesCount: number;
  cashbackMinRides: number;
  cashbackAmount: number;
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

const CLIENT_NAV = [
  { href: "/client/dashboard", label: "Inicio",   icon: "🏠" },
  { href: "/client/history",   label: "Historial", icon: "📋" },
  { href: "/client/profile",   label: "Perfil",    icon: "👤" },
];

const PAGE_SIZE = 20;

const TX_INFO: Record<CashbackTransaction["type"], { label: string; sign: "+" | "-"; color: string; bg: string; Icon: typeof ArrowDownLeft }> = {
  EARN:   { label: "Cashback ganado",   sign: "+", color: "var(--success)",     bg: "var(--success-pale)", Icon: ArrowDownLeft },
  REDEEM: { label: "Cashback aplicado", sign: "-", color: "var(--danger)",      bg: "var(--danger-pale)",  Icon: ArrowUpRight },
  REFUND: { label: "Cashback devuelto", sign: "+", color: "var(--primary)",     bg: "var(--primary-pale)", Icon: RotateCcw },
};

export default function ClientCashbackPage() {
  useAuthGuard('CLIENT');
  const router = useRouter();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<CashbackTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadHistory = useCallback((skip: number) => {
    return api.get<{ items: CashbackTransaction[]; total: number }>("/api/cashback/me/history", {
      params: { skip, take: PAGE_SIZE },
    });
  }, []);

  useEffect(() => {
    Promise.all([
      api.get<WalletSummary>("/api/cashback/me"),
      loadHistory(0),
    ])
      .then(([summaryRes, historyRes]) => {
        setSummary(summaryRes.data);
        setTransactions(Array.isArray(historyRes.data?.items) ? historyRes.data.items : []);
        setTotal(historyRes.data?.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadHistory]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const { data } = await loadHistory(transactions.length);
      setTransactions((prev) => [...prev, ...(Array.isArray(data?.items) ? data.items : [])]);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }

  const canLoadMore = transactions.length < total;
  const missingRides = summary ? Math.max(summary.cashbackMinRides - summary.completedRidesCount, 0) : 0;
  const progressPct = summary && summary.cashbackMinRides > 0
    ? Math.min(100, Math.round((summary.completedRidesCount / summary.cashbackMinRides) * 100))
    : 0;

  return (
    <div className="page">
      <div className="screen-header">
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 4px 4px 0", display: "flex", color: "var(--text)" }}
        >
          <ChevronLeft size={22} />
        </button>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "17px" }}>Mi cashback</span>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
            <div className="spinner" style={{ color: "var(--primary)" }} />
          </div>
        ) : !summary ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Wallet size={32} /></div>
            <p>No se pudo cargar tu saldo de cashback.</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Hero balance card */}
            <div
              className="mb-4"
              style={{
                position: "relative", overflow: "hidden",
                borderRadius: "var(--r-xl)", padding: "24px 20px",
                background: "linear-gradient(145deg, var(--success) 0%, var(--success-light) 55%, var(--accent) 140%)",
                color: "#fff",
                boxShadow: "0 10px 30px rgba(22,163,74,0.25)",
              }}
            >
              <PiggyBank
                size={140}
                style={{ position: "absolute", top: -24, right: -28, opacity: 0.16, transform: "rotate(-12deg)" }}
              />
              <Sparkles size={22} style={{ position: "absolute", top: 18, left: 18, opacity: 0.35 }} />

              <div style={{ position: "relative", textAlign: "center" }}>
                <p style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.9 }}>
                  Saldo disponible
                </p>
                <p style={{ fontSize: "34px", fontWeight: 800, marginTop: "8px" }}>{formatCOP(summary.balance)}</p>

                <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.16)", borderRadius: "var(--r-md)", padding: "10px 8px" }}>
                    <div style={{ fontSize: "15px", fontWeight: 700 }}>{formatCOP(summary.totalEarned)}</div>
                    <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px" }}>Total ganado</div>
                  </div>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.16)", borderRadius: "var(--r-md)", padding: "10px 8px" }}>
                    <div style={{ fontSize: "15px", fontWeight: 700 }}>{formatCOP(summary.totalRedeemed)}</div>
                    <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px" }}>Total usado</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress-to-threshold / how it works */}
            {missingRides > 0 ? (
              <div className="card-ghost mb-4">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", background: "var(--accent-pale)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Gift size={18} color="var(--accent-dark)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="font-semibold text-sm">
                      Te falta{missingRides !== 1 ? "n" : ""} {missingRides} carrera{missingRides !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted">para empezar a ganar cashback</p>
                  </div>
                </div>
                <div style={{ height: 8, borderRadius: "var(--r-full)", background: "var(--surface-2)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${progressPct}%`, borderRadius: "var(--r-full)",
                    background: "linear-gradient(90deg, var(--success) 0%, var(--accent) 100%)",
                    transition: "width var(--t-slow)",
                  }} />
                </div>
                <p className="text-xs text-muted" style={{ marginTop: "6px", textAlign: "right" }}>
                  {summary.completedRidesCount}/{summary.cashbackMinRides} carreras completadas
                </p>
              </div>
            ) : (
              <div className="card-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", background: "var(--success-pale)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Sparkles size={18} color="var(--success)" />
                </div>
                <div>
                  <p className="font-semibold text-sm">¡Estás ganando cashback!</p>
                  <p className="text-xs text-muted">Ganas {formatCOP(summary.cashbackAmount)} por cada carrera completada</p>
                </div>
              </div>
            )}

            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
              Historial de movimientos
            </h3>

            {transactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Wallet size={32} /></div>
                <p className="font-semibold">Sin movimientos aún</p>
                <p className="text-sm">Tu historial de cashback aparecerá aquí.</p>
              </div>
            ) : (
              <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {transactions.map((tx) => {
                  const info = TX_INFO[tx.type];
                  const { Icon } = info;
                  return (
                    <div key={tx.id} className="card-ghost" style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: "50%", background: info.bg,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <Icon size={17} color={info.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="font-semibold text-sm">{info.label}</p>
                          <p className="text-xs text-muted" style={{ marginTop: "2px" }}>
                            {new Date(tx.createdAt).toLocaleDateString("es-CO", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <span className="font-bold text-sm" style={{ color: info.color, whiteSpace: "nowrap" }}>
                          {info.sign}{formatCOP(tx.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
        )}
      </div>

      <BottomNav items={CLIENT_NAV} />
    </div>
  );
}
