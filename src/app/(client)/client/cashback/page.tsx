"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import BottomNav from "@/components/ui/BottomNav";
import Button from "@/components/ui/Button";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { Wallet } from "lucide-react";

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

const TX_LABEL: Record<CashbackTransaction["type"], { label: string; sign: "+" | "-"; color: string }> = {
  EARN:   { label: "Cashback ganado",     sign: "+", color: "var(--success)" },
  REDEEM: { label: "Cashback aplicado",   sign: "-", color: "var(--danger)" },
  REFUND: { label: "Cashback devuelto",   sign: "+", color: "var(--success)" },
};

export default function ClientCashbackPage() {
  useAuthGuard('CLIENT');
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

  return (
    <div className="page">
      <div className="screen-header">
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
            <div className="card card-primary mb-4" style={{ textAlign: "center" }}>
              <p className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                Saldo disponible
              </p>
              <p style={{ fontSize: "28px", fontWeight: 800, marginTop: "6px" }}>{formatCOP(summary.balance)}</p>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "15px", fontWeight: 700 }}>{formatCOP(summary.totalEarned)}</div>
                  <div className="text-xs text-muted">Total ganado</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "15px", fontWeight: 700 }}>{formatCOP(summary.totalRedeemed)}</div>
                  <div className="text-xs text-muted">Total usado</div>
                </div>
              </div>
            </div>

            {missingRides > 0 && (
              <div className="alert alert-info mb-4">
                Te falta{missingRides !== 1 ? "n" : ""} {missingRides} carrera{missingRides !== 1 ? "s" : ""} para empezar a ganar cashback.
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
                  const info = TX_LABEL[tx.type];
                  return (
                    <div key={tx.id} className="card" style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
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
                        <span className="font-bold text-sm" style={{ color: info.color }}>
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
