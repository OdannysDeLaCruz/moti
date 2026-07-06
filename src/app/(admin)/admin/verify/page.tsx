"use client";

import { useEffect, useState } from "react";
import DocThumb from "@/components/admin/DocThumb";
import DriverVerifyActions from "@/components/admin/DriverVerifyActions";
import api from "@/lib/api-client";
import { Bike, CheckCircle, User, AlertTriangle } from "lucide-react";

interface DriverProfile {
  status: string;
  vehicleType: "MOTO" | "BICI";
  vehiclePlate: string | null;
  vehicleModel: string;
  profilePhotoUrl: string | null;
  documentIdFrontUrl: string | null;
  documentIdBackUrl: string | null;
  soatUrl: string | null;
  vehiclePhotoUrl: string | null;
  createdAt: string;
}

interface Driver {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  driverProfile: DriverProfile | null;
}

function DriverCard({
  driver,
  onVerify,
  processing,
}: {
  driver: Driver;
  onVerify: (id: string, action: "APPROVE" | "REJECT") => void;
  processing: string | null;
}) {
  const p = driver.driverProfile!;
  const hasMissingDocs =
    !p.profilePhotoUrl || !p.documentIdFrontUrl || !p.documentIdBackUrl ||
    (p.vehicleType === "MOTO" ? !p.soatUrl : !p.vehiclePhotoUrl);

  const lastDoc = p.vehicleType === "MOTO"
    ? { label: "SOAT", url: p.soatUrl }
    : { label: "Bicicleta", url: p.vehiclePhotoUrl };

  const sinceDate = new Date(p.createdAt).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="card animate-fade-in" style={{ padding: "0", overflow: "hidden" }}>
      {/* Driver header */}
      <div style={{ padding: "16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
        {p.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.profilePhotoUrl}
            alt={driver.fullName}
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid var(--border)",
              flexShrink: 0,
            }}
          />
        ) : (
          <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "var(--surface-2)", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
              border: "2px dashed var(--border-strong)",
            }}>
              <User size={22} color="var(--text-muted)" />
            </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
            <p style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.3 }}>{driver.fullName}</p>
            {hasMissingDocs && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "3px",
                fontSize: "10px", background: "var(--warning-pale)", color: "var(--warning)",
                borderRadius: "var(--r-full)", padding: "2px 8px", fontWeight: 700, flexShrink: 0,
              }}>
                <AlertTriangle size={10} /> Docs incompletos
              </span>
            )}
          </div>
          <p className="text-muted" style={{ fontSize: "12px" }}>{driver.email ?? "—"}</p>
          <p className="text-muted" style={{ fontSize: "12px" }}>{driver.phone}</p>
        </div>
      </div>

      {/* Vehicle info */}
      <div
        style={{
          padding: "10px 16px",
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: "16px",
          alignItems: "center",
        }}
      >
        <span style={{ display: "flex" }}>{p.vehicleType === "MOTO" ? <Bike size={18} /> : <Bike size={18} style={{ opacity: 0.6 }} />}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: "13px" }}>{p.vehicleModel}</span>
          {p.vehiclePlate && (
            <span
              style={{
                marginLeft: "8px",
                fontSize: "12px",
                background: "var(--surface-3)",
                borderRadius: "var(--r-xs)",
                padding: "1px 6px",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              {p.vehiclePlate}
            </span>
          )}
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>{sinceDate}</span>
      </div>

      {/* Document thumbnails */}
      <div style={{ padding: "14px 16px" }}>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "10px",
          }}
        >
          Documentos — toca para ver completo
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <DocThumb label="Cédula F" url={p.documentIdFrontUrl} />
          <DocThumb label="Cédula R" url={p.documentIdBackUrl} />
          <DocThumb label={lastDoc.label} url={lastDoc.url} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)" }}>
        <DriverVerifyActions
          driverId={driver.id}
          driverFirstName={driver.fullName.split(" ")[0]}
          onVerify={onVerify}
          processing={processing}
        />
      </div>
    </div>
  );
}

export default function AdminVerifyPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    api
      .get<{ items: Driver[]; total: number }>("/api/admin/drivers?status=PENDING&take=100")
      .then(({ data }) => setDrivers(Array.isArray(data?.items) ? data.items : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleVerify(userId: string, action: "APPROVE" | "REJECT") {
    setProcessing(`${userId}-${action}`);

    try {
      const verifyAction = action === "APPROVE" ? "APPROVED" : "REJECTED";
      await api.post(`/api/admin/drivers/${userId}/verify`, { action: verifyAction });
      setDrivers((prev) => prev.filter((d) => d.id !== userId));
      showToast(
        action === "APPROVE" ? "Conductor aprobado correctamente." : "Conductor rechazado.",
        action === "APPROVE",
      );
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      const msg = response?.data?.message ?? "Error al procesar";
      showToast(Array.isArray(msg) ? msg.join(", ") : msg, false);
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="animate-fade-in">
      {!loading && drivers.length > 0 && (
        <p className="text-sm text-muted mb-4">{drivers.length} conductor{drivers.length !== 1 ? "es" : ""} pendiente{drivers.length !== 1 ? "s" : ""} de revisión</p>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "70px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: toast.ok ? "var(--success)" : "var(--danger)",
            color: "#fff",
            borderRadius: "var(--r-full)",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 600,
            boxShadow: "var(--shadow-lg)",
            whiteSpace: "nowrap",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {toast.ok ? "✓" : "!"} {toast.msg}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
          <div className="spinner" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: "60px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            <CheckCircle size={48} color="var(--success)" />
          </div>
          <p className="font-semibold" style={{ fontSize: "17px" }}>Sin conductores pendientes</p>
          <p className="text-sm text-muted" style={{ marginTop: "6px" }}>
            Todos los perfiles han sido revisados.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {drivers
            .filter((d) => d.driverProfile !== null)
            .map((driver) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                onVerify={handleVerify}
                processing={processing}
              />
            ))}
        </div>
      )}
    </div>
  );
}
