"use client";

import { useRef } from "react";
import { Bike } from "lucide-react";
import { formatCOP } from "@/lib/whatsapp";

enum RideOfferStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

interface Ride {
  id: string;
  originAddress: string;
  destAddress: string;
  initialPrice: string;
  rideType: "TRANSPORT" | "DELIVERY";
  client: { fullName: string; phone: string };
  offers: { id: string; counterPrice: number; driverId: string, status: RideOfferStatus }[];
}

interface Props {
  ride: Ride;
  currentUserId: string | undefined;
  submitting: boolean;
  error: string;
  onClose: () => void;
  onAcceptDirect: (rideId: string) => Promise<void>;
  onSubmitOffer: (rideId: string, price: number) => Promise<void>;
}

export default function RideDetailModal({
  ride,
  currentUserId,
  submitting,
  error,
  onClose,
  onAcceptDirect,
  onSubmitOffer,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);

  function onDragStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = 0;
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }

  function onDragMove(e: React.TouchEvent) {
    const delta = Math.max(0, e.touches[0].clientY - dragStartY.current);
    dragCurrentY.current = delta;
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`;
  }

  function onDragEnd() {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.style.transition = "transform 0.3s cubic-bezier(0.4,0,0.2,1)";
    if (dragCurrentY.current > 100) {
      sheet.style.transform = "translateY(100%)";
      setTimeout(onClose, 300);
    } else {
      sheet.style.transform = "translateY(0)";
    }
  }

  const alreadyOffered = ride.offers.some((o) => o.driverId === currentUserId && o.status === RideOfferStatus.PENDING);
  const initialPrice = Number(ride.initialPrice);

  const base = Math.ceil(initialPrice / 1000) * 1000;
  const quickPrices = [base + 1000, base + 2000, base + 3000];

  const initials = ride.client.fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.5)",
          zIndex: 100,
          animation: "fadeIn 200ms ease both",
        }}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: 480,
          margin: "0 auto",
          minHeight: "70dvh",
          background: "var(--bg)",
          borderRadius: "var(--r-xl) var(--r-xl) 0 0",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          padding: "12px 20px max(32px, env(safe-area-inset-bottom))",
          animation: "slideUp 280ms cubic-bezier(0.4,0,0.2,1) both",
          boxShadow: "0 -8px 40px rgba(15,23,42,0.15)",
          willChange: "transform",
        }}
      >
        {/* Handle — drag area */}
        <div
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "4px 0 20px",
            margin: "-12px -20px 0",
            touchAction: "none",
            cursor: "grab",
            userSelect: "none",
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border-strong)" }} />
        </div>

        {/* Header — 30% user | 70% ride info */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>

          {/* Left — 30%: avatar + name */}
          <div
            style={{
              flex: "0 0 30%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              paddingTop: 2,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--primary-pale)",
                border: "2px solid var(--primary-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: initials ? 19 : 24,
                fontWeight: 700,
                color: "var(--primary)",
                flexShrink: 0,
              }}
            >
              {initials || "👤"}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                textAlign: "center",
                lineHeight: 1.3,
                wordBreak: "break-word",
              }}
            >
              {ride.client.fullName}
            </div>
          </div>

          {/* Right — 70%: type + route + price */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Type badge */}
            <span
              className={`badge ${ride.rideType === "DELIVERY" ? "badge-accent" : "badge-active"}`}
              style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <Bike size={12} />
              {ride.rideType === "DELIVERY" ? "Domicilio" : "Carrera"}
            </span>

            {/* Route — A and B connected by vertical line */}
            <div style={{ marginBottom: 14 }}>
              {/* Point A */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    A
                  </div>
                  {/* Connector */}
                  <div style={{ width: 2, flex: 1, minHeight: 20, background: "var(--border-strong)", borderRadius: 1, margin: "3px 0" }} />
                </div>
                <div style={{ paddingBottom: 8, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 1 }}>
                    Origen
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
                    {ride.originAddress}
                  </div>
                </div>
              </div>

              {/* Point B */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, width: 22, display: "flex", justifyContent: "center" }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--accent-dark)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    B
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 1 }}>
                    Destino
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
                    {ride.destAddress}
                  </div>
                </div>
              </div>
            </div>

            {/* Price */}
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-dark)", lineHeight: 1 }}>
              {formatCOP(initialPrice)}
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "var(--border)", marginBottom: 20 }} />

        {/* Actions */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {alreadyOffered ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div className="badge badge-active" style={{ fontSize: 14, padding: "8px 20px" }}>
                Oferta enviada ✓
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>
                Espera la respuesta del cliente.
              </p>
              <button className="btn btn-ghost btn-full" style={{ marginTop: 20 }} onClick={onClose}>
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <button
                className="btn btn-success btn-full"
                style={{ fontSize: 16, fontWeight: 700, padding: "15px 20px", marginBottom: 16 }}
                disabled={submitting}
                onClick={() => onAcceptDirect(ride.id)}
              >
                {submitting ? (
                  <span className="spinner spinner-sm" style={{ color: "#fff" }} />
                ) : (
                  `Aceptar por ${formatCOP(initialPrice)}`
                )}
              </button>

              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  Ofrece tu tarifa
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {quickPrices.map((p) => (
                    <button
                      key={p}
                      className="chip"
                      style={{ flex: 1, justifyContent: "center" }}
                      disabled={submitting}
                      onClick={() => onSubmitOffer(ride.id, p)}
                    >
                      {formatCOP(p)}
                    </button>
                  ))}
                </div>
                {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}
              </div>

              <button className="btn btn-ghost btn-full" onClick={onClose} disabled={submitting}>
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
