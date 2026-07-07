"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { CheckCircle, Wallet } from "lucide-react";

interface DriverDebt {
  driverId: string;
  fullName: string;
  phone: string;
  email: string | null;
  totalOwed: number;
  rideCount: number;
}

export default function AdminCommissionsPage() {
  const [drivers, setDrivers] = useState<DriverDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [toastKey, setToastKey] = useState(0);

  function loadDrivers() {
    setLoading(true);
    api
      .get<DriverDebt[]>("/api/admin/commissions")
      .then(({ data }) => setDrivers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDrivers();
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setToastKey((k) => k + 1);
  }

  async function handleSettle(driverId: string, fullName: string) {
    setSettling(driverId);
    try {
      const { data } = await api.post<{ settledCount: number; settledTotal: number; passExpiresAt: string }>(
        `/api/admin/commissions/${driverId}/settle`,
      );
      setDrivers((prev) => prev.filter((d) => d.driverId !== driverId));
      const expira = new Date(data.passExpiresAt).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      showToast(`Pago de ${fullName.split(" ")[0]} confirmado. Pase hasta ${expira}.`, true);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      const msg = response?.data?.message ?? "Error al confirmar el pago";
      showToast(Array.isArray(msg) ? msg.join(", ") : msg, false);
    } finally {
      setSettling(null);
    }
  }

  return (
    <div className="animate-fade-in">
      {!loading && drivers.length > 0 && (
        <p className="text-sm text-muted mb-4">{drivers.length} conductor{drivers.length !== 1 ? "es" : ""} con comisión pendiente</p>
      )}

      {toast && (
        <Toast
          key={toastKey}
          message={toast.msg}
          type={toast.ok ? "success" : "error"}
          icon={toast.ok ? "check" : "x"}
          duration={3500}
          onDismiss={() => setToast(null)}
        />
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
          <div className="spinner" style={{ color: "var(--primary)" }} />
        </div>
      ) : drivers.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: "60px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            <CheckCircle size={48} color="var(--success)" />
          </div>
          <p className="font-semibold" style={{ fontSize: "17px" }}>Sin comisiones pendientes</p>
          <p className="text-sm text-muted" style={{ marginTop: "6px" }}>
            Ningún conductor tiene comisiones por pagar.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {drivers.map((driver) => (
            <div key={driver.driverId} className="card animate-fade-in" style={{ padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: "var(--danger-pale)", display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <Wallet size={18} color="var(--danger)" />
                  </div>
                  <div>
                    <Link href={`/admin/drivers/${driver.driverId}`} style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.3, color: "var(--primary)" }}>
                      {driver.fullName}
                    </Link>
                    <p className="text-muted" style={{ fontSize: "12px" }}>{driver.phone}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--danger)" }}>
                    {formatCOP(driver.totalOwed)}
                  </div>
                  <div className="text-xs text-muted">
                    {driver.rideCount} carrera{driver.rideCount !== 1 ? "s" : ""} pendiente{driver.rideCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <Button
                variant="success"
                fullWidth
                size="sm"
                loading={settling === driver.driverId}
                onClick={() => handleSettle(driver.driverId, driver.fullName)}
              >
                Confirmar pago
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
