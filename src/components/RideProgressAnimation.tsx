"use client";

interface Props {
  originAddress: string;
  destAddress: string;
}

export default function RideProgressAnimation({ originAddress, destAddress }: Props) {
  return (
    <>
      <style>{`
        @keyframes moto-ride {
          0%   { left: 38%; }
          100% { left: 48%; }
        }
        .moto-anim {
          position: absolute;
          top: 50%;
          transform: scaleX(-1) translateY(-55%);
          font-size: 26px;
          line-height: 1;
          animation: moto-ride 2.6s ease-in-out infinite alternate;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,0.25));
        }
      `}</style>

      <div style={{
        padding: "20px 16px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}>
        {/* Road track */}
        <div style={{ position: "relative", height: 44, marginBottom: "16px" }}>
          {/* Track line */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 4,
            background: "var(--border)",
            borderRadius: 2,
            transform: "translateY(-50%)",
          }} />
          {/* Origin dot */}
          <div style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 14, height: 14, borderRadius: "50%",
            background: "var(--success)", border: "2px solid var(--bg)",
            boxShadow: "0 0 0 2px var(--success)",
            zIndex: 1,
          }} />
          {/* Destination dot */}
          <div style={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 14, height: 14, borderRadius: "50%",
            background: "var(--danger)", border: "2px solid var(--bg)",
            boxShadow: "0 0 0 2px var(--danger)",
            zIndex: 1,
          }} />
          {/* Animated moto */}
          <div className="moto-anim">🏍️</div>
        </div>

        {/* Address labels */}
        <div style={{ display: "flex", gap: "12px" }}>
          {/* Origin */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                background: "var(--success)", display: "flex", alignItems: "center",
                justifyContent: "center", color: "#fff", fontSize: "9px", fontWeight: 800,
              }}>A</div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Origen
              </span>
            </div>
            <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)", lineHeight: 1.35, margin: 0 }}>
              {originAddress}
            </p>
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: "var(--border)", flexShrink: 0, alignSelf: "stretch" }} />

          {/* Destination */}
          <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px", justifyContent: "flex-end" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Destino
              </span>
              <div style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                background: "var(--danger)", display: "flex", alignItems: "center",
                justifyContent: "center", color: "#fff", fontSize: "9px", fontWeight: 800,
              }}>B</div>
            </div>
            <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)", lineHeight: 1.35, margin: 0 }}>
              {destAddress}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
