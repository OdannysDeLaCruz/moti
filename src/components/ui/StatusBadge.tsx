import React from "react";

type RideStatus = "PENDING" | "NEGOTIATING" | "ACCEPTED" | "HEADING_TO_PICKUP" | "AT_PICKUP" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";
type CommissionStatus = "UNPAID" | "PAID";
type StatusType = RideStatus | VerificationStatus | CommissionStatus | "ONLINE" | "OFFLINE";

const STATUS_CONFIG: Record<string, { label: string; className: string; color: string }> = {
  PENDING:            { label: "Pendiente",    className: "badge-pending", color: "#eab308" },
  NEGOTIATING:        { label: "Negociando",   className: "badge-active",  color: "#3b82f6" },
  ACCEPTED:           { label: "Aceptada",     className: "badge-active",  color: "#3b82f6" },
  HEADING_TO_PICKUP:  { label: "En camino",    className: "badge-active",  color: "#3b82f6" },
  AT_PICKUP:          { label: "En el lugar",  className: "badge-active",  color: "#3b82f6" },
  IN_PROGRESS:        { label: "En curso",     className: "badge-active",  color: "#8b5cf6" },
  COMPLETED:          { label: "Completada",   className: "badge-success", color: "#16a34a" },
  CANCELLED:          { label: "Cancelada",    className: "badge-danger",  color: "#dc2626" },
  APPROVED:           { label: "Aprobado",     className: "badge-success", color: "#16a34a" },
  REJECTED:           { label: "Rechazado",    className: "badge-danger",  color: "#dc2626" },
  ONLINE:             { label: "En línea",     className: "badge-success", color: "#16a34a" },
  OFFLINE:            { label: "Desconectado", className: "badge-neutral", color: "#94a3b8" },
  UNPAID:             { label: "Sin pagar",    className: "badge-danger",  color: "#dc2626" },
  PAID:               { label: "Pagada",       className: "badge-success", color: "#16a34a" },
};

interface StatusBadgeProps {
  status: StatusType;
  showDot?: boolean;
}

export default function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "badge-neutral", color: "#94a3b8" };

  return (
    <span className={`badge ${config.className}`}>
      {showDot && (
        <span style={{
          display: "inline-block", width: 6, height: 6, borderRadius: "50%",
          background: config.color, flexShrink: 0,
        }} />
      )}
      {config.label}
    </span>
  );
}
