"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import StatusBadge from "@/components/ui/StatusBadge";
import DocThumb from "@/components/admin/DocThumb";
import DriverVerifyActions from "@/components/admin/DriverVerifyActions";
import Button from "@/components/ui/Button";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { Mail, Phone, Bike, Wallet, ChevronDown, ChevronUp, Pencil } from "lucide-react";

interface DriverDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  verifiedAt: string | null;
  driverProfile: {
    status: "PENDING" | "APPROVED" | "REJECTED";
    vehicleType: "MOTO" | "BICI";
    vehiclePlate: string | null;
    vehicleModel: string;
    profilePhotoUrl: string | null;
    documentIdFrontUrl: string | null;
    documentIdBackUrl: string | null;
    soatUrl: string | null;
    vehiclePhotoUrl: string | null;
    freeRidesUsed: number;
    passExpiresAt: string | null;
    createdAt: string;
  };
  commissionSummary: { totalOwed: number; totalPaid: number; unpaidRideCount: number };
  recentRides: Array<{
    id: string;
    originAddress: string;
    destAddress: string;
    status: string;
    rideType: "TRANSPORT" | "DELIVERY";
    finalPrice: number | null;
    initialPrice: number;
    createdAt: string;
  }>;
}

interface CommissionRow {
  id: string;
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: "UNPAID" | "PAID";
  paidAt: string | null;
  createdAt: string;
  rideRequest: { originAddress: string; destAddress: string; finalPrice: number | null; createdAt: string };
}

export default function AdminDriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<CommissionRow[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [editingPass, setEditingPass] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    api.get<DriverDetail>(`/api/admin/drivers/${id}`)
      .then(({ data }) => setDriver(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleVerify(userId: string, action: "APPROVE" | "REJECT") {
    setProcessing(`${userId}-${action}`);
    try {
      const verifyAction = action === "APPROVE" ? "APPROVED" : "REJECTED";
      await api.post(`/api/admin/drivers/${userId}/verify`, { action: verifyAction });
      setDriver((prev) => prev ? { ...prev, driverProfile: { ...prev.driverProfile, status: verifyAction } } : prev);
    } catch {
      // ignore
    } finally {
      setProcessing(null);
    }
  }

  function toDatetimeLocal(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startEditingPass() {
    setPassInput(toDatetimeLocal(driver?.driverProfile.passExpiresAt ?? null));
    setEditingPass(true);
  }

  async function savePass(newValue: string | null) {
    if (!driver) return;
    setSavingPass(true);
    try {
      const { data } = await api.patch<{ passExpiresAt: string | null }>(`/api/admin/drivers/${driver.id}/pass`, {
        passExpiresAt: newValue ? new Date(newValue).toISOString() : null,
      });
      setDriver((prev) => prev ? { ...prev, driverProfile: { ...prev.driverProfile, passExpiresAt: data.passExpiresAt } } : prev);
      setEditingPass(false);
    } catch {
      // ignore
    } finally {
      setSavingPass(false);
    }
  }

  function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && !history) {
      setHistoryLoading(true);
      api.get<CommissionRow[]>(`/api/admin/commissions/${id}`)
        .then(({ data }) => setHistory(Array.isArray(data) ? data : []))
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
        <div className="spinner spinner-lg" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!driver) {
    return (
      <div>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "13px", fontWeight: 600, padding: "0 0 12px" }}>
          ← Volver a Conductores
        </button>
        <div className="empty-state"><p>Conductor no encontrado.</p></div>
      </div>
    );
  }

  const p = driver.driverProfile;
  const passActive = p.passExpiresAt && new Date(p.passExpiresAt) > new Date();
  const lastDoc = p.vehicleType === "MOTO" ? { label: "SOAT", url: p.soatUrl } : { label: "Bicicleta", url: p.vehiclePhotoUrl };

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "13px", fontWeight: 600, padding: "0 0 12px" }}>
        ← Volver a Conductores
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Perfil */}
        <div className="card" style={{ padding: "16px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
          {p.profilePhotoUrl ? (
            <Image src={p.profilePhotoUrl} alt={driver.fullName} width={64} height={64} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bike size={26} color="var(--text-muted)" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <p style={{ fontWeight: 800, fontSize: "17px" }}>{driver.fullName}</p>
              <StatusBadge status={p.status} />
            </div>
            <p className="text-muted" style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}><Mail size={12} /> {driver.email ?? "—"}</p>
            <p className="text-muted" style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}><Phone size={12} /> {driver.phone}</p>
          </div>
        </div>

        {p.status === "PENDING" && (
          <div className="card" style={{ padding: "16px" }}>
            <DriverVerifyActions
              driverId={driver.id}
              driverFirstName={driver.fullName.split(" ")[0]}
              onVerify={handleVerify}
              processing={processing}
            />
          </div>
        )}

        {/* Vehículo + acceso */}
        <div className="card" style={{ padding: "16px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Vehículo y acceso</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="text-muted text-sm">Vehículo</span>
              <span className="font-semibold text-sm">{p.vehicleModel}{p.vehiclePlate ? ` (${p.vehiclePlate})` : ""}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="text-muted text-sm">Viajes gratuitos usados</span>
              <span className="font-semibold text-sm">{p.freeRidesUsed}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="text-muted text-sm">Pase</span>
              {!editingPass && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={`font-semibold text-sm ${passActive ? "" : "text-muted"}`} style={{ color: passActive ? "var(--success)" : undefined }}>
                    {p.passExpiresAt
                      ? `${passActive ? "Activo hasta" : "Venció el"} ${new Date(p.passExpiresAt).toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                      : "Sin pase asignado"}
                  </span>
                  <button
                    onClick={startEditingPass}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 0 }}
                    aria-label="Editar fecha de pase"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}
            </div>

            {editingPass && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "var(--surface)", borderRadius: "var(--r-sm)", padding: "10px" }}>
                <input
                  type="datetime-local"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  style={{ fontSize: "13px" }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                  <Button variant="ghost" size="sm" onClick={() => setEditingPass(false)}>Cancelar</Button>
                  <Button variant="danger" size="sm" loading={savingPass} onClick={() => savePass(null)}>Quitar</Button>
                  <Button variant="primary" size="sm" loading={savingPass} disabled={!passInput} onClick={() => savePass(passInput)}>Guardar</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comisiones */}
        <div className="card" style={{ padding: "16px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Comisiones</p>
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 800, color: driver.commissionSummary.totalOwed > 0 ? "var(--danger)" : "var(--text)" }}>
                {formatCOP(driver.commissionSummary.totalOwed)}
              </div>
              <div className="text-xs text-muted">Pendiente ({driver.commissionSummary.unpaidRideCount})</div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--success)" }}>{formatCOP(driver.commissionSummary.totalPaid)}</div>
              <div className="text-xs text-muted">Pagado</div>
            </div>
          </div>

          <Button variant="ghost" size="sm" fullWidth onClick={toggleHistory}>
            <Wallet size={14} /> {historyOpen ? "Ocultar" : "Ver"} historial completo
            {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>

          {historyOpen && (
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {historyLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                  <div className="spinner" />
                </div>
              ) : history && history.length === 0 ? (
                <p className="text-sm text-muted">Sin comisiones registradas.</p>
              ) : (
                history?.map((row) => (
                  <div key={row.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                        {row.rideRequest.originAddress} → {row.rideRequest.destAddress}
                      </div>
                      <div className="text-xs text-muted">
                        {new Date(row.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })} · {row.commissionRate}% de {formatCOP(row.baseAmount)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700 }}>{formatCOP(row.commissionAmount)}</div>
                      <StatusBadge status={row.status} showDot={false} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Carreras recientes */}
        {driver.recentRides.length > 0 && (
          <div className="card" style={{ padding: "16px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Carreras recientes</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {driver.recentRides.map((ride) => (
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
          </div>
        )}

        {/* Documentos */}
        <div className="card" style={{ padding: "16px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Documentos</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 90px)", gap: "8px" }}>
            <DocThumb label="Cédula F" url={p.documentIdFrontUrl} />
            <DocThumb label="Cédula R" url={p.documentIdBackUrl} />
            <DocThumb label={lastDoc.label} url={lastDoc.url} />
          </div>
        </div>
      </div>
    </div>
  );
}
