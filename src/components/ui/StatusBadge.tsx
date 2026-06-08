import React from "react";

type RideStatus = "PENDING" | "NEGOTIATING" | "ACCEPTED" | "HEADING_TO_PICKUP" | "AT_PICKUP" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";
type StatusType = RideStatus | VerificationStatus | "ONLINE" | "OFFLINE";

const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  PENDING:            { label: "Pendiente",    className: "badge-pending", dot: "🟡" },
  NEGOTIATING:        { label: "Negociando",   className: "badge-active",  dot: "🔵" },
  ACCEPTED:           { label: "Aceptada",     className: "badge-active",  dot: "🔵" },
  HEADING_TO_PICKUP:  { label: "En camino",    className: "badge-active",  dot: "🏍️" },
  AT_PICKUP:          { label: "En el lugar",  className: "badge-active",  dot: "📍" },
  IN_PROGRESS:        { label: "En curso",     className: "badge-active",  dot: "🟣" },
  COMPLETED:          { label: "Completada",   className: "badge-success", dot: "🟢" },
  CANCELLED:          { label: "Cancelada",    className: "badge-danger",  dot: "🔴" },
  APPROVED:           { label: "Aprobado",     className: "badge-success", dot: "🟢" },
  REJECTED:           { label: "Rechazado",    className: "badge-danger",  dot: "🔴" },
  ONLINE:             { label: "En línea",     className: "badge-success", dot: "🟢" },
  OFFLINE:            { label: "Desconectado", className: "badge-neutral", dot: "⚫" },
};

interface StatusBadgeProps {
  status: StatusType;
  showDot?: boolean;
}

export default function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "badge-neutral", dot: "⚪" };

  return (
    <span className={`badge ${config.className}`}>
      {showDot && <span style={{ fontSize: "0.6rem" }}>{config.dot}</span>}
      {config.label}
    </span>
  );
}
