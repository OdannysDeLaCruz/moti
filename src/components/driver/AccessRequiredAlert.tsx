"use client";

import { formatCOP } from "@/lib/whatsapp";

interface AccessRequiredAlertProps {
  commissionOwed?: number;
  unpaidRideCount?: number;
  userId?: string;
}

export default function AccessRequiredAlert({ commissionOwed, unpaidRideCount, userId }: AccessRequiredAlertProps) {
  const whatsappMessage = commissionOwed
    ? `Hola! Debo ${formatCOP(commissionOwed)} de comisión y quiero pagar para seguir operando. Mi id: ${userId ?? ""}. Me compartes los medios de pago por favor.`
    : `Hola! Ya usé mis viajes gratuitos y quiero conocer mi saldo pendiente. Mi id: ${userId ?? ""}`;

  return (
    <div className="card mb-4" style={{ background: "var(--warning-pale)", border: "1.5px solid rgba(217,119,6,0.2)" }}>
      <p className="font-semibold mb-2" style={{ color: "var(--warning)" }}>Pago pendiente</p>
      {commissionOwed ? (
        <>
          <p className="text-sm mb-1">
            Debes <strong>{formatCOP(commissionOwed)}</strong> de comisión
            {unpaidRideCount ? ` (${unpaidRideCount} carrera${unpaidRideCount !== 1 ? "s" : ""})` : ""}.
          </p>
          <p className="text-sm text-muted mb-3">
            Paga ese saldo con el administrador para que te asigne una nueva fecha de acceso.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted mb-3">
          Ya usaste tus viajes gratuitos. Ahora se cobra una comisión por cada carrera completada — contacta al administrador para conocer tu saldo y seguir operando.
        </p>
      )}
      <a
        href={`https://wa.me/${process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? "573017953727"}?text=${encodeURIComponent(whatsappMessage)}`}
        target="_blank"
        rel="noreferrer"
        className="btn btn-accent btn-sm"
      >
        Contactar al administrador
      </a>
    </div>
  );
}
