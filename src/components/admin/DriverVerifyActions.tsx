"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

interface DriverVerifyActionsProps {
  driverId: string;
  driverFirstName: string;
  onVerify: (id: string, action: "APPROVE" | "REJECT") => void;
  processing: string | null;
}

export default function DriverVerifyActions({ driverId, driverFirstName, onVerify, processing }: DriverVerifyActionsProps) {
  const [rejecting, setRejecting] = useState(false);

  if (rejecting) {
    return (
      <div>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--danger)", marginBottom: "10px" }}>
          ¿Confirmar rechazo del perfil de {driverFirstName}?
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <Button variant="ghost" fullWidth size="sm" onClick={() => setRejecting(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            fullWidth
            size="sm"
            loading={processing === `${driverId}-REJECT`}
            onClick={() => onVerify(driverId, "REJECT")}
          >
            Sí, rechazar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
      <Button variant="ghost" fullWidth size="sm" onClick={() => setRejecting(true)}>
        Rechazar
      </Button>
      <Button
        variant="success"
        fullWidth
        size="sm"
        loading={processing === `${driverId}-APPROVE`}
        onClick={() => onVerify(driverId, "APPROVE")}
      >
        Aprobar
      </Button>
    </div>
  );
}
