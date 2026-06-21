"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/lib/auth-context";
import type { LocationPoint } from "@/components/LocationModal";

const LocationModal = dynamic(() => import("@/components/LocationModal"), {
  ssr: false,
});

const PRICE_STEP = 500;
const MIN_PRICE  = 4000;

const RIDE_TYPES = [
  { value: "TRANSPORT", label: "Carrera",   desc: "Transporte de persona" },
  { value: "DELIVERY",  label: "Domicilio", desc: "Envío de paquete"      },
] as const;

type RideType = "TRANSPORT" | "DELIVERY";

const ACTIVE_STATUSES = ["PENDING", "NEGOTIATING", "ACCEPTED", "IN_PROGRESS"];

interface ActiveRide {
  id: string;
  originAddress: string;
  destAddress: string;
  status: string;
  rideType: "TRANSPORT" | "DELIVERY";
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const { user } = useAuthGuard('CLIENT');
  const { logout } = useAuth();

  const [menuOpen,   setMenuOpen]   = useState(false);
  const [modalMode,  setModalMode]  = useState<"origin" | "dest" | null>(null);
  const [rideType,   setRideType]   = useState<RideType>("TRANSPORT");
  const [origin,     setOrigin]     = useState<LocationPoint | null>(null);
  const [destText,   setDestText]   = useState("");
  const [destPin,    setDestPin]    = useState<{ lat: number; lng: number } | null>(null);
  const [price,      setPrice]      = useState(5000);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [note,       setNote]       = useState("");
  const [noteModal,  setNoteModal]  = useState(false);
  const [noteDraft,  setNoteDraft]  = useState("");

  const fetchActiveRide = useCallback(async () => {
    try {
      const { data } = await api.get<ActiveRide[]>("/api/rides");
      setActiveRide(data.find((r) => ACTIVE_STATUSES.includes(r.status)) ?? null);
    } catch {}
  }, []);

  useEffect(() => { fetchActiveRide(); }, [fetchActiveRide]);

  function adjustPrice(delta: number) {
    setPrice((p) => Math.max(MIN_PRICE, p + delta));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin)           { setError("Indica tu punto de origen."); return; }
    if (!destText.trim())  { setError("Escribe o selecciona el destino."); return; }
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post<{ id: string }>("/api/rides", {
        originAddress: origin.address,
        originLat:     origin.lat,
        originLng:     origin.lng,
        destAddress:   destText.trim(),
        destLat:       destPin?.lat ?? 0,
        destLng:       destPin?.lng ?? 0,
        initialPrice:  price,
        rideType,
        notes:         note.trim() || undefined,
      });
      router.push(`/client/negotiation/${data.id}`);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message ?? "Error creando la solicitud.";
      setError(Array.isArray(msg) ? msg.join(", ") : msg);
      setLoading(false);
    }
  }

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    router.push("/login");
  }

  const submitLabel = !origin
    ? "Indica tu origen"
    : !destText.trim()
    ? "Indica el destino"
    : "Buscar conductor";

  return (
    <>
      {/* ─── Side drawer ─────────────────────────── */}
      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex" }}>
          {/* Backdrop */}
          <div
            style={{ flex: 1, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
            onClick={() => setMenuOpen(false)}
          />
          {/* Panel */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: "72%", maxWidth: 300,
            background: "var(--surface)", display: "flex", flexDirection: "column",
            boxShadow: "4px 0 24px rgba(0,0,0,0.25)",
          }}>
            {/* Close */}
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px 4px" }}>
              <button
                onClick={() => setMenuOpen(false)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "26px", color: "var(--text-muted)", lineHeight: 1, padding: "4px",
                }}
              >
                ×
              </button>
            </div>

            {/* User info */}
            <div style={{ padding: "4px 20px 20px" }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "var(--primary)", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: "1.4rem", marginBottom: "10px",
              }}>
                👤
              </div>
              {user && (
                <>
                  <p style={{ fontWeight: 700, fontSize: "16px", color: "var(--text)" }}>{user.fullName}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{user.email}</p>
                </>
              )}
            </div>

            <div style={{ height: 1, background: "var(--border)", margin: "0 20px" }} />

            {/* Nav links */}
            <nav style={{ padding: "8px 0", flex: 1 }}>
              {([
                { href: "/client/dashboard", label: "Inicio",    icon: "🏠" },
                { href: "/client/history",   label: "Historial", icon: "📋" },
                { href: "/client/profile",   label: "Perfil",    icon: "👤" },
              ] as const).map((item) => (
                <button
                  key={item.href}
                  onClick={() => { setMenuOpen(false); router.push(item.href); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    width: "100%", padding: "14px 20px",
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: "15px", fontWeight: 600,
                    color: "var(--text)", textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Logout */}
            <div style={{ padding: "0 20px 28px" }}>
              <div style={{ height: 1, background: "var(--border)", marginBottom: "12px" }} />
              <button
                onClick={handleLogout}
                style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  width: "100%", padding: "10px 0",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: "15px", fontWeight: 600,
                  color: "var(--danger)",
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>🚪</span>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Note modal ──────────────────────────── */}
      {noteModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 400,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)",
            display: "flex", alignItems: "flex-end",
          }}
          onClick={() => setNoteModal(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: 480, margin: "0 auto",
              background: "var(--surface)", borderRadius: "var(--r-xl) var(--r-xl) 0 0",
              padding: "20px 16px 32px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <p style={{ fontWeight: 700, fontSize: "16px" }}>Agregar nota</p>
              <button
                onClick={() => setNoteModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "var(--text-muted)", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <textarea
              autoFocus
              maxLength={500}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Ej: Soy el de la camiseta azul, espero en la entrada principal…"
              style={{
                width: "100%", minHeight: 110, resize: "none",
                background: "var(--bg)", border: "1.5px solid var(--border-strong)",
                borderRadius: "var(--r-md)", padding: "12px", fontFamily: "inherit",
                fontSize: "14px", color: "var(--text)", lineHeight: 1.5,
                boxSizing: "border-box",
              }}
            />
            <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "right", marginTop: "4px" }}>
              {noteDraft.length}/500
            </p>

            <button
              type="button"
              onClick={() => { setNote(noteDraft); setNoteModal(false); }}
              style={{
                marginTop: "12px", width: "100%", padding: "13px",
                borderRadius: "var(--r-md)", border: "none",
                background: "var(--primary)", color: "#fff",
                fontFamily: "inherit", fontSize: "15px", fontWeight: 700, cursor: "pointer",
              }}
            >
              Guardar nota
            </button>
          </div>
        </div>
      )}

      {/* ─── Location modal ───────────────────────── */}
      <LocationModal
        mode={modalMode}
        originPoint={origin}
        onConfirmOrigin={(point) => { setOrigin(point); setModalMode(null); }}
        onConfirmDest={(text, pin) => { setDestText(text); setDestPin(pin); setModalMode(null); }}
        onClose={() => setModalMode(null)}
      />

      {/* ─── Main page ───────────────────────────── */}
      <div className="page">
        <div className="screen-header">
          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Menú"
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "6px", display: "flex", flexDirection: "column",
              gap: "5px", justifyContent: "center", alignItems: "center",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                display: "block", width: "22px", height: "2px",
                background: "var(--text)", borderRadius: "2px",
              }} />
            ))}
          </button>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, justifyContent: "center" }}>
            <div style={{
              width: 30, height: 30, background: "var(--primary)",
              borderRadius: "var(--r-sm)", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: "1rem",
            }}>
              🛵
            </div>
            <span style={{ fontWeight: 700, fontSize: "17px" }}>Moti</span>
          </div>

          <span className="badge badge-success">En línea</span>
        </div>

        <div className="page-content" style={{ padding: "16px 16px 32px" }}>
          {/* Carrera activa — bloquea el formulario */}
          {activeRide && (
            <div
              className="card animate-fade-in"
              style={{ borderColor: "var(--primary)", borderWidth: "2px", padding: "16px", marginBottom: "16px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.2rem" }}>🛵</span>
                  <span style={{ fontWeight: 700, fontSize: "15px" }}>
                    {activeRide.rideType === "DELIVERY" ? "Domicilio en curso" : "Carrera en curso"}
                  </span>
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
                onClick={() => router.push(`/client/negotiation/${activeRide.id}`)}
              >
                Ver solicitud →
              </Button>
              <p style={{ fontSize: "11px", color: "var(--text-dim)", textAlign: "center", marginTop: "10px", lineHeight: 1.4 }}>
                Cancela esta solicitud para crear una nueva
              </p>
            </div>
          )}

          {/* Formulario — solo cuando no hay carrera activa */}
          {!activeRide && (
          <div className="card animate-fade-in">
            <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "16px" }}>
              Nueva solicitud
            </h3>

            <form onSubmit={handleSubmit}>
              {/* Tipo de servicio */}
              <div className="form-group">
                <label>Tipo de servicio</label>
                <div className="grid-2">
                  {RIDE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setRideType(t.value)}
                      style={{
                        padding: "12px 10px",
                        borderRadius: "var(--r-md)",
                        border: `2px solid ${rideType === t.value ? "var(--primary)" : "var(--border)"}`,
                        background: rideType === t.value ? "var(--primary-xpale)" : "var(--surface)",
                        cursor: "pointer", textAlign: "center", fontFamily: "inherit",
                        transition: "all var(--t-fast)",
                      }}
                    >
                      <div style={{
                        fontSize: "13px", fontWeight: 700,
                        color: rideType === t.value ? "var(--primary)" : "var(--text-secondary)",
                      }}>
                        {t.label}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {t.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Origen */}
              <div className="form-group">
                <label>Desde</label>
                <button
                  type="button"
                  onClick={() => setModalMode("origin")}
                  style={{
                    width: "100%", padding: "13px 14px",
                    borderRadius: "var(--r-md)",
                    border: `1.5px solid ${origin ? "var(--success)" : "var(--border-strong)"}`,
                    background: origin ? "var(--success-pale)" : "var(--surface)",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    gap: "10px", fontFamily: "inherit", textAlign: "left",
                    transition: "all var(--t-fast)",
                  }}
                >
                  <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>📍</span>
                  <span style={{
                    flex: 1, fontSize: "14px",
                    fontWeight: origin ? 500 : 400,
                    color: origin ? "var(--text)" : "var(--text-muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {origin ? origin.address : "Tu punto de recogida"}
                  </span>
                  {origin && (
                    <span style={{ fontSize: "11px", color: "var(--success)", fontWeight: 700, flexShrink: 0 }}>
                      Cambiar
                    </span>
                  )}
                </button>
              </div>

              {/* Destino */}
              <div className="form-group">
                <label>Hasta</label>
                <button
                  type="button"
                  onClick={() => setModalMode("dest")}
                  style={{
                    width: "100%", padding: "13px 14px",
                    borderRadius: "var(--r-md)",
                    border: `1.5px solid ${destText ? "var(--danger)" : "var(--border-strong)"}`,
                    background: destText ? "var(--danger-pale)" : "var(--surface)",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    gap: "10px", fontFamily: "inherit", textAlign: "left",
                    transition: "all var(--t-fast)",
                  }}
                >
                  <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🎯</span>
                  <span style={{
                    flex: 1, fontSize: "14px",
                    fontWeight: destText ? 500 : 400,
                    color: destText ? "var(--text)" : "var(--text-muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {destText || "¿A dónde vas?"}
                  </span>
                  {destText && (
                    <span style={{ fontSize: "11px", color: "var(--danger)", fontWeight: 700, flexShrink: 0 }}>
                      Cambiar
                    </span>
                  )}
                </button>
              </div>

              {/* Nota opcional */}
              <div className="form-group">
                <button
                  type="button"
                  onClick={() => { setNoteDraft(note); setNoteModal(true); }}
                  style={{
                    width: "100%", padding: "11px 14px",
                    borderRadius: "var(--r-md)",
                    border: `1.5px dashed ${note ? "var(--primary)" : "var(--border-strong)"}`,
                    background: note ? "var(--primary-xpale)" : "transparent",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    gap: "10px", fontFamily: "inherit", textAlign: "left",
                    transition: "all var(--t-fast)",
                  }}
                >
                  <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>📝</span>
                  <span style={{
                    flex: 1, fontSize: "13px", fontWeight: note ? 500 : 400,
                    color: note ? "var(--primary)" : "var(--text-muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {note || "Agregar nota para el conductor"}
                  </span>
                  {note && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setNote(""); setNoteDraft(""); }}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: "16px", color: "var(--text-muted)", padding: "2px", lineHeight: 1, flexShrink: 0,
                      }}
                    >
                      ×
                    </button>
                  )}
                </button>
              </div>

              {/* Precio estilo InDrive */}
              <div className="form-group">
                <label style={{ display: "block", textAlign: "center" }}>Tu oferta al conductor</label>
                <div style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", padding: "6px 4px",
                }}>
                  {/* − button */}
                  <button
                    type="button"
                    onClick={() => adjustPrice(-PRICE_STEP)}
                    disabled={price <= MIN_PRICE}
                    style={{
                      width: 46, height: 46, borderRadius: "50%",
                      border: "2px solid var(--border-strong)",
                      background: "var(--surface)", cursor: price > MIN_PRICE ? "pointer" : "default",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "24px", fontWeight: 700, lineHeight: 1,
                      color: price > MIN_PRICE ? "var(--text)" : "var(--text-muted)",
                      flexShrink: 0, transition: "color var(--t-fast)",
                    }}
                  >
                    −
                  </button>

                  {/* Price display */}
                  <div style={{ textAlign: "center", flex: 1, padding: "0 8px" }}>
                    <div style={{
                      fontSize: "34px", fontWeight: 800, color: "var(--text)",
                      letterSpacing: "-0.5px", lineHeight: 1.1,
                    }}>
                      {formatCOP(price)}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                      mín. {formatCOP(MIN_PRICE)} · los conductores pueden contraofertar
                    </div>
                  </div>

                  {/* + button */}
                  <button
                    type="button"
                    onClick={() => adjustPrice(PRICE_STEP)}
                    style={{
                      width: 46, height: 46, borderRadius: "50%",
                      border: "2px solid var(--primary)",
                      background: "var(--primary-xpale)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "24px", fontWeight: 700, lineHeight: 1,
                      color: "var(--primary)", flexShrink: 0,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert alert-error mb-4" role="alert">{error}</div>
              )}

              <Button
                type="submit"
                variant="accent"
                fullWidth
                size="lg"
                loading={loading}
                disabled={!origin || !destText.trim()}
              >
                {submitLabel}
              </Button>
            </form>
          </div>
          )}
        </div>
      </div>
    </>
  );
}
