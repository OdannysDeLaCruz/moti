"use client";

import { Coins, Gift, PartyPopper, PiggyBank, Sparkles, Wallet, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatCOP } from "@/lib/whatsapp";

interface CashbackEarnedOverlayProps {
  amountEarned: number;
  newBalance: number;
  onContinue: () => void;
  onViewCashback: () => void;
  onDismiss: () => void;
}

const COLLAGE_ICONS: Array<{ Icon: typeof Coins; top: string; left: string; size: number; rotate: number; opacity: number }> = [
  { Icon: Coins,       top: "6%",  left: "8%",  size: 34, rotate: -18, opacity: 0.16 },
  { Icon: Gift,        top: "10%", left: "76%", size: 42, rotate: 12,  opacity: 0.14 },
  { Icon: Sparkles,    top: "26%", left: "4%",  size: 24, rotate: 8,   opacity: 0.18 },
  { Icon: PartyPopper, top: "4%",  left: "42%", size: 28, rotate: -10, opacity: 0.15 },
  { Icon: Coins,       top: "68%", left: "86%", size: 36, rotate: 20,  opacity: 0.14 },
  { Icon: Sparkles,    top: "82%", left: "12%", size: 22, rotate: -14, opacity: 0.16 },
  { Icon: Gift,        top: "52%", left: "4%",  size: 24, rotate: 22,  opacity: 0.12 },
  { Icon: PartyPopper, top: "60%", left: "62%", size: 26, rotate: -20, opacity: 0.12 },
  { Icon: Sparkles,    top: "40%", left: "88%", size: 20, rotate: 16,  opacity: 0.14 },
];

export default function CashbackEarnedOverlay({
  amountEarned,
  newBalance,
  onContinue,
  onViewCashback,
  onDismiss,
}: CashbackEarnedOverlayProps) {
  return (
    <div
      className="animate-fade-in"
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        className="animate-slide-up"
        style={{
          width: "100%", maxWidth: 480, height: "80dvh",
          background: "linear-gradient(160deg, var(--success) 0%, var(--success-light) 45%, var(--accent) 130%)",
          borderRadius: "var(--r-xl) var(--r-xl) 0 0",
          position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
        }}
      >
        {/* Background collage */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {COLLAGE_ICONS.map(({ Icon, top, left, size, rotate, opacity }, i) => (
            <Icon
              key={i}
              size={size}
              style={{ position: "absolute", top, left, color: "#fff", opacity, transform: `rotate(${rotate}deg)` }}
            />
          ))}
        </div>

        <button
          onClick={onDismiss}
          aria-label="Cerrar"
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 2,
            background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>

        {/* Reserved slot for an animated icon (e.g. Lottie) — static PiggyBank placeholder for now */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "36px", position: "relative", zIndex: 1 }}>
          <div
            className="animate-pulse-glow"
            style={{
              width: 96, height: 96, borderRadius: "50%",
              background: "rgba(255,255,255,0.22)",
              border: "3px solid rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <PiggyBank size={44} color="#fff" />
          </div>
        </div>

        <div style={{
          position: "relative", zIndex: 1, flex: 1,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "24px 28px", color: "#fff",
        }}>
          <p style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.85 }}>
            ¡Carrera completada!
          </p>
          <h2 style={{ fontSize: "20px", fontWeight: 800, marginTop: "6px" }}>
            Ganaste cashback
          </h2>
          <p style={{ fontSize: "40px", fontWeight: 800, marginTop: "14px", lineHeight: 1 }}>
            +{formatCOP(amountEarned)}
          </p>
          <p style={{ fontSize: "14px", marginTop: "12px", opacity: 0.92, maxWidth: 280 }}>
            Úsalo para pagar o descontar tu próxima carrera o domicilio.
          </p>

          <div style={{
            marginTop: "18px", display: "flex", alignItems: "center", gap: "8px",
            background: "rgba(255,255,255,0.16)", borderRadius: "var(--r-full)", padding: "8px 16px",
          }}>
            <Wallet size={16} />
            <span style={{ fontSize: "13px", fontWeight: 600 }}>
              Saldo total: {formatCOP(newBalance)}
            </span>
          </div>
        </div>

        <div style={{
          position: "relative", zIndex: 1,
          padding: "0 20px max(20px, env(safe-area-inset-bottom))",
          display: "flex", flexDirection: "column", gap: "10px",
        }}>
          <Button variant="accent" fullWidth onClick={onContinue}>
            ¡Qué bueno!
          </Button>
          <button
            onClick={onViewCashback}
            style={{
              background: "rgba(255,255,255,0.14)", border: "1.5px solid rgba(255,255,255,0.45)",
              borderRadius: "var(--r-md)", padding: "12px 20px",
              color: "#fff", fontWeight: 600, fontSize: "15px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            <Wallet size={16} /> Ver mi cashback
          </button>
        </div>
      </div>
    </div>
  );
}
