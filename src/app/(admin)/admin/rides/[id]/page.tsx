"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { MapPin, Navigation, Phone, User, Bike, Package, FileText, Clock, Percent } from "lucide-react";

interface Offer {
  id: string;
  counterPrice: number;
  driver: { fullName: string; phone: string } | null;
  createdAt: string;
}

interface Ride {
  id: string;
  originAddress: string;
  destAddress: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  initialPrice: number;
  finalPrice: number | null;
  status: string;
  rideType: "TRANSPORT" | "DELIVERY";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client: { fullName: string; phone: string; email: string };
  driver: { fullName: string; phone: string; driverProfile?: { vehiclePlate: string | null; vehicleModel: string } | null } | null;
  offers: Offer[];
  commission: {
    baseAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: "UNPAID" | "PAID";
    paidAt: string | null;
  } | null;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{ color: "var(--text-muted)", flexShrink: 0, display: "flex" }}>{icon}</span>
      <span style={{ fontSize: "12px", color: "var(--text-muted)", flexShrink: 0, minWidth: 70 }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "13px", fontWeight: 600, padding: "0 0 12px", display: "flex", alignItems: "center", gap: "4px" }}
    >
      ← Volver a Carreras
    </button>
  );
}

export default function AdminRideDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Ride>(`/api/rides/${id}`)
      .then(({ data }) => setRide(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
      <div className="spinner spinner-lg" style={{ color: "var(--primary)" }} />
    </div>
  );

  if (!ride) return (
    <div>
      <BackLink onClick={() => router.back()} />
      <div className="empty-state"><p>Carrera no encontrada.</p></div>
    </div>
  );

  const isActive = ["PENDING", "NEGOTIATING", "ACCEPTED", "HEADING_TO_PICKUP", "AT_PICKUP", "IN_PROGRESS"].includes(ride.status);

  return (
    <div className="animate-fade-in">
      <BackLink onClick={() => router.back()} />

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Tipo + precio */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {ride.rideType === "DELIVERY"
              ? <Package size={18} style={{ color: "var(--accent-dark)" }} />
              : <Bike size={18} style={{ color: "var(--primary)" }} />
            }
            <span style={{ fontWeight: 700, fontSize: "15px" }}>
              {ride.rideType === "DELIVERY" ? "Domicilio" : "Carrera"}
            </span>
            <StatusBadge status={ride.status as never} />
          </div>
          <div style={{ textAlign: "right" }}>
            {ride.finalPrice ? (
              <div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--success)" }}>{formatCOP(ride.finalPrice)}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>precio final</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--accent-dark)" }}>{formatCOP(ride.initialPrice)}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>precio ofertado</div>
              </div>
            )}
          </div>
        </div>

        {/* Ruta */}
        <div className="card" style={{ padding: "14px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Ruta</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <MapPin size={15} style={{ color: "var(--success)", marginTop: "1px", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Origen</div>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>{ride.originAddress}</div>
                <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{ride.originLat.toFixed(5)}, {ride.originLng.toFixed(5)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <Navigation size={15} style={{ color: "var(--danger)", marginTop: "1px", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Destino</div>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>{ride.destAddress}</div>
                <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{ride.destLat.toFixed(5)}, {ride.destLng.toFixed(5)}</div>
              </div>
            </div>
          </div>
          {ride.notes && (
            <div style={{ borderTop: "1px solid var(--border)", marginTop: "12px", paddingTop: "12px", display: "flex", gap: "8px" }}>
              <FileText size={14} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: "1px" }} />
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Nota</div>
                <p style={{ fontSize: "13px", lineHeight: 1.5, margin: 0 }}>{ride.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Cliente */}
        <div className="card" style={{ padding: "14px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Cliente</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <InfoRow icon={<User size={14} />} label="Nombre" value={ride.client.fullName} />
            <InfoRow icon={<Phone size={14} />} label="Teléfono" value={ride.client.phone} />
            <InfoRow icon={<Phone size={14} />} label="Email" value={ride.client.email ?? "—"} />
          </div>
        </div>

        {/* Conductor */}
        {ride.driver ? (
          <div className="card" style={{ padding: "14px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Conductor</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <InfoRow icon={<User size={14} />} label="Nombre" value={ride.driver.fullName} />
              <InfoRow icon={<Phone size={14} />} label="Teléfono" value={ride.driver.phone} />
              {ride.driver.driverProfile?.vehiclePlate && (
                <InfoRow icon={<Bike size={14} />} label="Placa" value={ride.driver.driverProfile.vehiclePlate} />
              )}
              {ride.driver.driverProfile?.vehicleModel && (
                <InfoRow icon={<Bike size={14} />} label="Vehículo" value={ride.driver.driverProfile.vehicleModel} />
              )}
            </div>
          </div>
        ) : isActive && (
          <div className="card" style={{ padding: "14px", background: "var(--surface)" }}>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center" }}>Sin conductor asignado aún</p>
          </div>
        )}

        {/* Ofertas */}
        {ride.offers.length > 0 && (
          <div className="card" style={{ padding: "14px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
              Ofertas ({ride.offers.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {ride.offers.map((offer) => (
                <div key={offer.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>{offer.driver?.fullName ?? "Conductor"}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{offer.driver?.phone}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-dark)" }}>{formatCOP(offer.counterPrice)}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                      {new Date(offer.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comisión */}
        {ride.commission && (
          <div className="card" style={{ padding: "14px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Comisión</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <InfoRow icon={<FileText size={14} />} label="Base" value={formatCOP(ride.commission.baseAmount)} />
              <InfoRow icon={<Percent size={14} />} label="Tasa" value={`${ride.commission.commissionRate}%`} />
              <InfoRow icon={<FileText size={14} />} label="Comisión" value={formatCOP(ride.commission.commissionAmount)} />
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", minWidth: 70 }}>Estado</span>
                <StatusBadge status={ride.commission.status} />
              </div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="card" style={{ padding: "14px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Tiempos</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <InfoRow icon={<Clock size={14} />} label="Creada"
              value={new Date(ride.createdAt).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} />
            <InfoRow icon={<Clock size={14} />} label="Actualizada"
              value={new Date(ride.updatedAt).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} />
          </div>
          <div style={{ marginTop: "10px", padding: "6px 10px", background: "var(--surface-2)", borderRadius: "var(--r-xs)" }}>
            <span style={{ fontSize: "10px", color: "var(--text-dim)", fontFamily: "monospace" }}>ID: {ride.id}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
