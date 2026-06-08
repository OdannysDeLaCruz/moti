"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import RideDetailModal from "@/components/RideDetailModal";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Toast } from "@/components/ui/Toast";
import { useDriverFeed, NewRideEvent } from "@/hooks/useDriverFeed";
import { playNewRequest, playStatusNegative } from "@/lib/sounds";

interface Ride {
  id: string;
  originAddress: string;
  destAddress: string;
  initialPrice: string;
  status: string;
  rideType: "TRANSPORT" | "DELIVERY";
  client: { fullName: string; phone: string };
  offers: { id: string; counterPrice: number; driverId: string }[];
}

const DRIVER_NAV = [
  { href: "/driver/dashboard", label: "Carreras", icon: "🏍️" },
  { href: "/driver/profile",   label: "Perfil",   icon: "👤" },
];

export default function DriverDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelToast, setCancelToast] = useState(false);
  // Modal state
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchRides = useCallback(async () => {
    try {
      const { data } = await api.get<Ride[]>("/api/rides");
      setRides(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchRides(); }, [fetchRides]);

  useDriverFeed(user?.id, {
    onNewRide: (e: NewRideEvent) => {
      playNewRequest();
      const newRide: Ride = {
        id: e.rideId,
        originAddress: e.originAddress,
        destAddress: e.destAddress,
        initialPrice: e.initialPrice,
        status: "PENDING",
        rideType: e.rideType,
        client: { fullName: "Cliente", phone: "" },
        offers: [],
      };
      setRides((prev) => {
        if (prev.some((r) => r.id === e.rideId)) return prev;
        return [newRide, ...prev];
      });
      setModalError("");
      setSelectedRideId(e.rideId);
    },
    onRideAccepted: (rideId: string) => {
      router.push(`/driver/ongoing/${rideId}`);
    },
    onRideCancelled: (rideId: string) => {
      setRides((prev) => {
        const ride = prev.find((r) => r.id === rideId);
        if (!ride) return prev;
        const hasOffer = ride.offers.some((o) => o.driverId === user?.id);
        const isAssigned = ["ACCEPTED", "HEADING_TO_PICKUP", "AT_PICKUP", "IN_PROGRESS"].includes(ride.status);
        if (hasOffer || isAssigned) {
          playStatusNegative();
          setCancelToast(true);
        }
        return prev.filter((r) => r.id !== rideId);
      });
      setSelectedRideId((prev) => (prev === rideId ? null : prev));
    },
  });

  function openModal(rideId: string) {
    setModalError("");
    setSelectedRideId(rideId);
  }

  function closeModal() {
    setSelectedRideId(null);
    setModalError("");
  }

  async function acceptDirect(rideId: string) {
    setModalSubmitting(true);
    setModalError("");
    try {
      await api.post(`/api/rides/${rideId}/accept-direct`);
      router.push(`/driver/ongoing/${rideId}`);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message ?? "Error aceptando la carrera";
      setModalError(Array.isArray(msg) ? msg.join(", ") : msg);
      setModalSubmitting(false);
    }
  }

  async function submitOffer(rideId: string, price: number) {
    if (price < 4000) {
      setModalError("Precio mínimo $4,000");
      return;
    }
    setModalSubmitting(true);
    setModalError("");
    try {
      await api.post(`/api/rides/${rideId}/offers`, { counterPrice: price });
      setRides((prev) =>
        prev.map((r) =>
          r.id === rideId
            ? { ...r, offers: [...r.offers, { id: "sent", counterPrice: price, driverId: user?.id ?? "" }] }
            : r,
        ),
      );
      closeModal();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message ?? "Error enviando oferta";
      setModalError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setModalSubmitting(false);
    }
  }

  const profile    = user?.driverProfile;
  const isPending  = profile?.status === "PENDING" || !profile;
  const isRejected = profile?.status === "REJECTED";
  const isApproved = profile?.status === "APPROVED";
  const passActive = profile?.passExpiresAt && new Date(profile.passExpiresAt) > new Date();
  const hasAccess  = isApproved && (passActive || (profile && profile.freeRidesUsed < 5));

  const activeRide   = rides.find((r) => ["ACCEPTED", "IN_PROGRESS"].includes(r.status));
  const pendingRides = rides.filter((r) => r.status === "PENDING" || r.status === "NEGOTIATING");
  const selectedRide = rides.find((r) => r.id === selectedRideId) ?? null;

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100dvh" }}>
          <div className="spinner spinner-lg" style={{ color: "var(--primary)" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {cancelToast && (
        <Toast
          type="error"
          icon="❌"
          message="Carrera cancelada"
          subMessage="El cliente canceló la solicitud"
          onDismiss={() => setCancelToast(false)}
        />
      )}

      {selectedRide && (
        <RideDetailModal
          ride={selectedRide}
          currentUserId={user?.id}
          submitting={modalSubmitting}
          error={modalError}
          onClose={closeModal}
          onAcceptDirect={acceptDirect}
          onSubmitOffer={submitOffer}
        />
      )}

      <div className="page-content">
        {isPending && (
          <div className="alert alert-warning mb-4 animate-slide-down">
            Tu cuenta está siendo verificada. Te avisaremos cuando sea aprobada.
          </div>
        )}

        {isRejected && (
          <div className="alert alert-error mb-4">
            Tu perfil fue rechazado. Contacta al administrador.
          </div>
        )}

        {isApproved && !hasAccess && (
          <div className="card mb-4" style={{ background: "var(--warning-pale)", border: "1.5px solid rgba(217,119,6,0.2)" }}>
            <p className="font-semibold mb-2" style={{ color: "var(--warning)" }}>Pase requerido</p>
            <p className="text-sm text-muted mb-3">
              Usaste tus {profile?.freeRidesUsed} viajes gratuitos. Activa tu pase diario para continuar.
            </p>
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? "573000000000"}?text=${encodeURIComponent(`Hola! Quiero activar mi pase. Mi correo: ${user?.email}`)}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-accent btn-sm"
            >
              Pagar pase por WhatsApp
            </a>
          </div>
        )}

        {/* Carrera en curso */}
        {activeRide && (
          <div className="card animate-fade-in" style={{ borderColor: "var(--primary)", borderWidth: "2px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>🏍️</span>
                <span style={{ fontWeight: 700, fontSize: "15px" }}>Carrera en curso</span>
              </div>
              <StatusBadge status={activeRide.status as never} />
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "14px", lineHeight: 1.5 }}>
              <div>{activeRide.originAddress}</div>
              <div style={{ color: "var(--text-dim)" }}>→ {activeRide.destAddress}</div>
            </div>
            <Button
              variant="primary"
              fullWidth
              size="sm"
              onClick={() => router.push(`/driver/ongoing/${activeRide.id}`)}
            >
              Continuar carrera →
            </Button>
            <p style={{ fontSize: "11px", color: "var(--text-dim)", textAlign: "center", marginTop: "10px", lineHeight: 1.4 }}>
              Finaliza o cancela esta carrera para ver nuevas solicitudes
            </p>
          </div>
        )}

        {/* Solicitudes disponibles */}
        {isApproved && hasAccess && !activeRide && (
          <>
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>
              Solicitudes disponibles ({pendingRides.length})
            </h3>

            {pendingRides.length === 0 ? (
              <div className="empty-state">
                <p className="font-semibold">Sin solicitudes por ahora</p>
                <p className="text-sm">Aparecerán aquí cuando los clientes soliciten.</p>
              </div>
            ) : (
              <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {pendingRides.map((ride) => {
                  const alreadyOffered = ride.offers.some((o) => o.driverId === user?.id);

                  return (
                    <div
                      key={ride.id}
                      className="card animate-fade-in"
                      style={{
                        padding: "16px",
                        cursor: "pointer",
                        background: "linear-gradient(135deg, var(--primary-xpale) 0%, var(--primary-pale) 100%)",
                        border: "1.5px solid rgba(37,99,235,0.18)",
                      }}
                      onClick={() => openModal(ride.id)}
                    >
                      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 2 }}>
                            {ride.rideType === "DELIVERY" ? "Domicilio" : "Carrera"}
                          </div>
                          <div style={{ fontSize: "14px", fontWeight: 600 }}>{ride.originAddress}</div>
                          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>→ {ride.destAddress}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--accent-dark)" }}>
                            {formatCOP(Number(ride.initialPrice))}
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                        {alreadyOffered ? (
                          <span className="badge badge-active">Oferta enviada ✓</span>
                        ) : (
                          <span
                            className="badge badge-neutral"
                            style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}
                          >
                            Ver solicitud →
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav items={DRIVER_NAV} />
    </div>
  );
}
