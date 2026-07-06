"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { Wallet } from "lucide-react";

interface ClientCashback {
  userId: string;
  fullName: string;
  phone: string;
  email: string | null;
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
}

export default function AdminCashbackPage() {
  const [clients, setClients] = useState<ClientCashback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ClientCashback[]>("/api/admin/cashback")
      .then(({ data }) => setClients(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      {!loading && clients.length > 0 && (
        <p className="text-sm text-muted mb-4">{clients.length} cliente{clients.length !== 1 ? "s" : ""} con saldo de cashback</p>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
          <div className="spinner" style={{ color: "var(--primary)" }} />
        </div>
      ) : clients.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: "60px" }}>
          <div className="empty-state-icon"><Wallet size={32} /></div>
          <p className="font-semibold" style={{ fontSize: "17px" }}>Sin saldos de cashback</p>
          <p className="text-sm text-muted" style={{ marginTop: "6px" }}>
            Ningún cliente tiene saldo de cashback acumulado.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {clients.map((client) => (
            <div key={client.userId} className="card animate-fade-in" style={{ padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: "var(--success-pale)", display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <Wallet size={18} color="var(--success)" />
                  </div>
                  <div>
                    <Link href={`/admin/clients/${client.userId}`} style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.3, color: "var(--primary)" }}>
                      {client.fullName}
                    </Link>
                    <p className="text-muted" style={{ fontSize: "12px" }}>{client.phone}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "17px", fontWeight: 800 }}>
                    {formatCOP(client.balance)}
                  </div>
                  <div className="text-xs text-muted">
                    Ganado {formatCOP(client.totalEarned)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
