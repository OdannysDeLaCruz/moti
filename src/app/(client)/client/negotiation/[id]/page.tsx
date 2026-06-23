"use client";

import React from "react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { Toast } from "@/components/ui/Toast";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useRideSocket, DriverLocationEvent } from "@/hooks/useRideSocket";
import { playNewOffer, playStatusPositive, playStatusNegative } from "@/lib/sounds";
import RideProgressAnimation from "@/components/RideProgressAnimation";
import { MapPin, Navigation, CheckCircle, Bike, Flag, FileText } from "lucide-react";
import Image from "next/image";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface Offer {
  id: string;
  counterPrice: number;
  driverId: string;
  driverName?: string;
  driverPhone?: string;
  driver?: { fullName: string; phone: string; driverProfile?: { profilePhotoUrl?: string | null } | null };
  createdAt: string;
}

interface Ride {
  id: string;
  originAddress: string;
  destAddress: string;
  originLat: number;
  originLng: number;
  destLat?: number | null;
  destLng?: number | null;
  initialPrice: string;
  finalPrice: string | null;
  status: string;
  rideType: "TRANSPORT" | "DELIVERY";
  notes?: string | null;
  driver: {
    fullName: string;
    phone: string;
    driverProfile?: { profilePhotoUrl?: string | null } | null;
  } | null;
  offers: Offer[];
}

const DRIVER_STATUS_INFO: Record<string, { icon: React.ReactNode; title: string; subtitle: string }> = {
  ACCEPTED: { icon: <CheckCircle size={28} color="var(--success)" />, title: "Conductor confirmado", subtitle: "El conductor está preparando el viaje" },
  HEADING_TO_PICKUP: { icon: <Navigation size={28} color="var(--primary)" />, title: "Conductor en camino", subtitle: "Tu conductor va hacia el punto de recogida" },
  AT_PICKUP: { icon: <MapPin size={28} color="var(--primary)" />, title: "¡Tu conductor llegó!", subtitle: "El conductor está esperándote en el origen" },
  IN_PROGRESS: { icon: <Bike size={28} color="var(--primary)" />, title: "Viaje en curso", subtitle: "Estás en camino a tu destino" },
};

interface ToastState {
  type: "success" | "info" | "error";
  icon: string;
  message: string;
  subMessage?: string;
  photoUrl?: string;
}

const STATUS_TOAST: Record<string, ToastState> = {
  HEADING_TO_PICKUP: { type: "info", icon: "nav", message: "Conductor en camino", subMessage: "Tu conductor va hacia el punto de recogida" },
  AT_PICKUP: { type: "info", icon: "pin", message: "¡Tu conductor llegó!", subMessage: "El conductor está esperándote en el origen" },
  IN_PROGRESS: { type: "success", icon: "bike", message: "Viaje iniciado", subMessage: "Estás en camino a tu destino" },
  COMPLETED: { type: "success", icon: "flag", message: "¡Carrera completada!", subMessage: undefined },
  CANCELLED: { type: "error", icon: "x", message: "Carrera cancelada", subMessage: "La carrera fue cancelada" },
};

export default function NegotiationPage() {
  const router = useRouter();
  useAuthGuard('CLIENT');
  const { id } = useParams<{ id: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState("");
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const dragStartY = useRef<number | null>(null);

  const fetchRide = useCallback(async () => {
    try {
      const { data } = await api.get<Ride>(`/api/rides/${id}`);
      setRide(data);
      setSheetExpanded(data.status !== "IN_PROGRESS");
    } catch {
      setError("No se pudo cargar la información de la carrera.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchRide(); }, [fetchRide]);

  useRideSocket(id, {
    onOffer: () => { playNewOffer(); fetchRide(); },
    onAccepted: async () => {
      try {
        const { data } = await api.get<Ride>(`/api/rides/${id}`);
        setRide(data);
        if (data.driver) {
          playStatusPositive();
          setToast({
            type: "success",
            icon: "check",
            photoUrl: data.driver.driverProfile?.profilePhotoUrl ?? undefined,
            message: `${data.driver.fullName} aceptó tu carrera`,
            subMessage: data.finalPrice ? `Por ${formatCOP(Number(data.finalPrice))}` : undefined,
          });
        }
      } catch {
        fetchRide();
      }
    },
    onStatus: ({ status }) => {
      setRide((prev) => (prev ? { ...prev, status } : prev));
      if (status === "IN_PROGRESS") setSheetExpanded(false);
      if (status === "COMPLETED" || status === "CANCELLED") {
        setDriverLocation(null);
      }
      const toastData = STATUS_TOAST[status];
      if (toastData) {
        setToast(toastData);
        if (status === "CANCELLED") playStatusNegative(); else playStatusPositive();
      }
    },
    onDriverLocation: (e: DriverLocationEvent) => {
      setDriverLocation({ lat: e.lat, lng: e.lng });
    },
  });

  async function acceptOffer(offerId: string) {
    setAccepting(offerId);
    setError("");
    try {
      await api.post(`/api/rides/${id}/accept`, { offerId });
      await fetchRide();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ?? "Error aceptando la oferta.";
      setError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setAccepting(null);
    }
  }

  async function cancelRide() {
    setCancelling(true);
    try {
      await api.patch(`/api/rides/${id}`, { status: "CANCELLED" });
      router.push("/client/dashboard");
    } catch {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div
          className="page-content"
          style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}
        >
          <div className="spinner spinner-lg" style={{ color: "var(--primary)" }} />
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="empty-state">
            <div className="empty-state-icon">No encontrado</div>
            <p>{error || "Carrera no encontrada"}</p>
            <Button variant="primary" onClick={() => router.push("/client/dashboard")}>
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const ACTIVE_STATUSES = ["ACCEPTED", "HEADING_TO_PICKUP", "AT_PICKUP", "IN_PROGRESS"];
  const isActive = ACTIVE_STATUSES.includes(ride.status);
  const isCancelled = ride.status === "CANCELLED";
  const isCompleted = ride.status === "COMPLETED";
  const isPending = !isActive && !isCancelled && !isCompleted;

  const driverInfo = DRIVER_STATUS_INFO[ride.status];

  const originPin = { lat: ride.originLat, lng: ride.originLng };
  const isInProgress = ride.status === "IN_PROGRESS";
  const hasDestCoords = ride.destLat != null && ride.destLng != null && (ride.destLat !== 0 || ride.destLng !== 0);

  const mapPins = [
    { lat: originPin.lat, lng: originPin.lng, label: "Recogida", color: "green" as const },
    ...(isInProgress && hasDestCoords
      ? [{ lat: ride.destLat!, lng: ride.destLng!, label: "Destino", color: "red" as const }]
      : []),
    ...(driverLocation
      ? [{ lat: driverLocation.lat, lng: driverLocation.lng, label: "Conductor", icon: "moto" as const }]
      : []),
  ];
  const mapCenter: [number, number] = isInProgress && hasDestCoords
    ? [(ride.originLat + ride.destLat!) / 2, (ride.originLng + ride.destLng!) / 2]
    : driverLocation
    ? [driverLocation.lat, driverLocation.lng]
    : [originPin.lat, originPin.lng];
  const mapZoom = isInProgress && hasDestCoords ? 13 : 15;

  const driverInitials = ride.driver?.fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  function onDragStart(y: number) { dragStartY.current = y; }
  function onDragEnd(y: number) {
    if (dragStartY.current === null) return;
    const delta = y - dragStartY.current;
    dragStartY.current = null;
    if (delta > 40) setSheetExpanded(false);
    else if (delta < -40) setSheetExpanded(true);
  }

  return (
    <>
      {toast && (
        <div style={{ position: "fixed", zIndex: 9999, top: 0, left: 0, right: 0 }}>
          <Toast
            type={toast.type}
            icon={toast.icon}
            photoUrl={toast.photoUrl}
            message={toast.message}
            subMessage={toast.subMessage}
            onDismiss={() => setToast(null)}
          />
        </div>
      )}

      {/* Fullscreen map */}
      {!(isInProgress && !hasDestCoords) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
          <MapView center={mapCenter} zoom={mapZoom} pins={mapPins} height="100%" />
        </div>
      )}

      {/* Floating top bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        padding: "12px 16px",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)",
        pointerEvents: "none",
        display: "flex", alignItems: "center", gap: "12px",
      }}>
        <button
          onClick={() => router.push("/client/dashboard")}
          style={{
            pointerEvents: "auto",
            background: "none", border: "none", cursor: "pointer",
            fontSize: "20px", padding: "4px 8px", color: "#fff",
          }}
        >
          ←
        </button>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "17px", color: "#fff" }}>
          {ride.rideType === "DELIVERY" ? "Domicilio" : "Carrera"}
        </span>
        <div style={{ pointerEvents: "auto" }}>
          <StatusBadge status={ride.status as never} />
        </div>
      </div>

      {/* Bottom sheet */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300, display: "flex", justifyContent: "center" }}>
        <div style={{
          width: "100%", maxWidth: 480,
          background: "var(--surface)",
          borderRadius: "var(--r-xl) var(--r-xl) 0 0",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
          transform: sheetExpanded ? "translateY(0)" : "translateY(calc(100% - 160px))",
          transition: "transform 0.3s ease",
        }}>
          {/* Drag handle */}
          <div
            style={{ padding: "12px 0 4px", display: "flex", justifyContent: "center", cursor: "pointer" }}
            onClick={() => setSheetExpanded((v) => !v)}
            onMouseDown={(e) => onDragStart(e.clientY)}
            onMouseUp={(e) => onDragEnd(e.clientY)}
            onTouchStart={(e) => onDragStart(e.touches[0].clientY)}
            onTouchEnd={(e) => onDragEnd(e.changedTouches[0].clientY)}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)" }} />
          </div>

          {/* Sheet content — scrollable when expanded */}
          <div style={{
            overflowY: "auto",
            maxHeight: "75vh",
            padding: "0 0 24px",
          }}>
            {/* RideProgressAnimation inside sheet when in progress without dest coords */}
            {isInProgress && !hasDestCoords && (
              <RideProgressAnimation
                originAddress={ride.originAddress}
                destAddress={ride.destAddress}
              />
            )}

            {/* Pending: waiting for offers */}
            {isPending && (
              <div style={{ padding: "0 16px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px", marginTop: "8px" }}>
                  {ride.offers.length > 0 && `Ofertas (${ride.offers.length})`}
                </h3>

                {ride.offers.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <p className="text-muted text-sm">Buscando conductores...</p>
                    <div className="spinner mt-4" style={{ color: "var(--primary)", margin: "16px auto 0" }} />
                  </div>
                ) : (
                  <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {ride.offers.map((offer) => {
                      const name = offer.driver?.fullName ?? "";
                      const photo = offer.driver?.driverProfile?.profilePhotoUrl;
                      const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
                      return (
                        <div key={offer.id} className="card" style={{ padding: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                            {photo ? (
                              <Image
                                src={photo}
                                alt={name}
                                width={44}
                                height={44}
                                style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--border)" }}
                              />
                            ) : (
                              <div style={{
                                width: 44, height: 44, borderRadius: "50%", background: "var(--primary-pale)",
                                border: "2px solid var(--primary-light)", display: "flex", alignItems: "center",
                                justifyContent: "center", fontSize: "15px", fontWeight: 700,
                                color: "var(--primary)", flexShrink: 0,
                              }}>
                                {initials || "🏍️"}
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p className="font-semibold text-md" style={{ marginBottom: "2px" }}>
                                {name.split(" ")[0] || "Conductor"} ofreció
                              </p>
                              <span className="price-tag-accent" style={{ fontSize: "20px" }}>
                                {formatCOP(offer.counterPrice)}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="success"
                            fullWidth
                            size="sm"
                            loading={accepting === offer.id}
                            onClick={() => acceptOffer(offer.id)}
                          >
                            Aceptar oferta
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {error && <div className="alert alert-error mt-4">{error}</div>}

                <div style={{ marginTop: "24px" }}>
                  <Button variant="ghost" fullWidth loading={cancelling} onClick={cancelRide}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Active driver card */}
            {isActive && ride.driver && driverInfo && (
              <div style={{ padding: "12px 16px 0" }} className="animate-slide-up">
                <div className="card card-success">
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                    <span style={{ display: "flex", flexShrink: 0 }}>{driverInfo.icon}</span>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "15px", color: "var(--success)" }}>
                        {driverInfo.title}
                      </p>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {driverInfo.subtitle}
                      </p>
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
                    {ride.driver.driverProfile?.profilePhotoUrl ? (
                      <Image
                        src={ride.driver.driverProfile.profilePhotoUrl}
                        alt={ride.driver.fullName}
                        width={48}
                        height={48}
                        style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--success)" }}
                      />
                    ) : (
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%", background: "var(--success-pale)",
                        border: "2px solid var(--success)", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: "17px", fontWeight: 700,
                        color: "var(--success)", flexShrink: 0,
                      }}>
                        {driverInitials}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="text-xs text-muted">Conductor</p>
                      <p style={{ fontWeight: 600, fontSize: "15px" }}>{ride.driver.fullName}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: "0 16px" }}>
              {/* Ride summary */}
              <div className="card mb-4 mt-3 animate-fade-in">
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <MapPin size={16} style={{ color: "var(--success)", marginTop: "2px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Origen</div>
                      <div style={{ fontSize: "14px", fontWeight: 500 }}>{ride.originAddress}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <Navigation size={16} style={{ color: "var(--danger)", marginTop: "2px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Destino</div>
                      <div style={{ fontSize: "14px", fontWeight: 500 }}>{ride.destAddress}</div>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", marginTop: "14px", paddingTop: "14px", display: "flex", justifyContent: "space-between" }}>
                  <span className="font-semibold text-md">Tu ofreciste</span>
                  <span className="price-tag-accent" style={{ fontSize: "22px" }}>{formatCOP(Number(ride.initialPrice))}</span>
                </div>

                {ride.finalPrice && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", alignItems: "center" }}>
                    <span className="font-semibold text-md">Precio acordado</span>
                    <span className="price-tag-primary text-md">{formatCOP(Number(ride.finalPrice))}</span>
                  </div>
                )}

                {ride.notes && (
                  <div style={{ borderTop: "1px solid var(--border)", marginTop: "14px", paddingTop: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                      <FileText size={13} style={{ color: "var(--text-muted)" }} />
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Tu nota
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
                      {ride.notes}
                    </p>
                  </div>
                )}
              </div>

              {isCompleted && (
                <div className="card card-success mb-4">
                  <div style={{ textAlign: "center", padding: "8px 0" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
                      <Flag size={28} color="var(--success)" />
                    </div>
                    <p style={{ fontWeight: 700, fontSize: "16px", color: "var(--success)" }}>¡Carrera completada!</p>
                  </div>
                </div>
              )}

              {isCancelled && (
                <div className="alert alert-error mb-4">Esta carrera fue cancelada.</div>
              )}

              {(isActive || isCompleted) && (
                <div className="mt-4">
                  <Button variant="ghost" fullWidth onClick={() => router.push("/client/dashboard")}>
                    Volver al inicio
                  </Button>
                </div>
              )}

              {["ACCEPTED", "HEADING_TO_PICKUP", "AT_PICKUP"].includes(ride.status) && (
                <div className="mt-3">
                  {!confirmCancel ? (
                    <Button variant="ghost" fullWidth onClick={() => setConfirmCancel(true)}>
                      Cancelar carrera
                    </Button>
                  ) : (
                    <div
                      className="card animate-slide-down"
                      style={{ border: "1.5px solid rgba(239,68,68,0.3)", padding: "16px" }}
                    >
                      <p style={{ fontWeight: 600, fontSize: "14px", marginBottom: "12px", textAlign: "center" }}>
                        ¿Confirmar cancelación?
                      </p>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button variant="ghost" fullWidth size="sm" onClick={() => setConfirmCancel(false)}>
                          No, volver
                        </Button>
                        <Button variant="danger" fullWidth size="sm" loading={cancelling} onClick={cancelRide}>
                          Sí, cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
