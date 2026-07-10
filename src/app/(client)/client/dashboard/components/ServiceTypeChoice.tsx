"use client";

import { Bike, Package, ChevronRight, type LucideIcon } from "lucide-react";

export type RideType = "TRANSPORT" | "DELIVERY";

export const RIDE_TYPE_META: Record<RideType, {
  label: string;
  desc: string;
  Icon: LucideIcon;
  tint: "primary" | "accent";
}> = {
  TRANSPORT: {
    label: "Pedir transporte",
    desc: "Viaja tú — te llevamos a donde necesites",
    Icon: Bike,
    tint: "primary",
  },
  DELIVERY: {
    label: "Pedir domicilio",
    desc: "Envía o recibe un paquete con un mensajero",
    Icon: Package,
    tint: "accent",
  },
};

interface ServiceTypeChoiceProps {
  onSelect: (type: RideType) => void;
}

export default function ServiceTypeChoice({ onSelect }: ServiceTypeChoiceProps) {
  return (
    <div
      className="animate-fade-in"
      style={{
        position: "fixed", inset: 0, zIndex: 150,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, var(--primary-pale) 0%, var(--bg) 50%)",
        padding: "24px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text)", textAlign: "center", marginBottom: "6px" }}>
          ¿Qué quieres hacer hoy?
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", textAlign: "center", marginBottom: "28px" }}>
          Elige el tipo de servicio que necesitas
        </p>

        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {(Object.keys(RIDE_TYPE_META) as RideType[]).map((type) => {
            const meta = RIDE_TYPE_META[type];
            const iconBg = meta.tint === "primary" ? "var(--primary-pale)" : "var(--accent-pale)";
            const iconColor = meta.tint === "primary" ? "var(--primary)" : "var(--accent-dark)";
            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelect(type)}
                style={{
                  display: "flex", alignItems: "center", gap: "16px",
                  width: "100%", padding: "20px",
                  borderRadius: "var(--r-xl)",
                  border: "2px solid var(--border)",
                  background: "var(--surface)",
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                  background: iconBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <meta.Icon size={26} style={{ color: iconColor }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{meta.label}</div>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>{meta.desc}</div>
                </div>
                <ChevronRight size={20} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
