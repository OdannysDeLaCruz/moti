"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/lib/auth-context";
import type { LocationPoint } from "@/components/LocationModal";
import { User, Home, ClipboardList, Bike, Menu, FileText, LogOut } from "lucide-react";
import Image from "next/image";

const LocationModal = dynamic(() => import("@/components/LocationModal"), { ssr: false });
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const PRICE_STEP = 500;
const MIN_PRICE = 4000;
const RIDE_TYPES = [
  { value: "TRANSPORT", label: "Carrera", desc: "Transporte de persona" },
  { value: "DELIVERY", label: "Entrega", desc: "Envío de paquete" },
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
  const { user } = useAuthGuard("CLIENT");
  const { logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"origin" | "dest" | null>(null);
  const [rideType, setRideType] = useState<RideType>("TRANSPORT");
  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [dest, setDest] = useState<LocationPoint | null>(null);
  const [price, setPrice] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [note, setNote] = useState("");
  const [noteModal, setNoteModal] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  // Bottom sheet drag-to-snap: false = collapsed (pills only), true = expanded (full form)
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const dragStartY = useRef(0);
  const dragStartExpanded = useRef(true);

  function onDragStart(clientY: number) {
    dragStartY.current = clientY;
    dragStartExpanded.current = sheetExpanded;
  }
  function onDragEnd(clientY: number) {
    const delta = clientY - dragStartY.current;
    // swipe down >40px → collapse; swipe up >40px → expand
    if (delta > 40) setSheetExpanded(false);
    if (delta < -40) setSheetExpanded(true);
  }

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const { data } = await api.get<ActiveRide[]>("/api/rides");
        if (!ignore) {
          setActiveRide(data.find((r) => ACTIVE_STATUSES.includes(r.status)) ?? null);
        }
      } catch {
        // noop
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  function adjustPrice(delta: number) {
    setPrice((p) => Math.max(MIN_PRICE, p + delta));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin) { setError("Indica tu punto de origen."); return; }
    if (!dest) { setError("Escribe o selecciona el destino."); return; }
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post<{ id: string }>("/api/rides", {
        originAddress: origin.address,
        originLat: origin.lat, originLng: origin.lng,
        destAddress: dest.address,
        destLat: dest.lat, destLng: dest.lng,
        initialPrice: price,
        rideType,
        notes: note.trim() || undefined,
      });
      router.push(`/client/negotiation/${data.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ?? "Error creando la solicitud.";
      setError(Array.isArray(msg) ? msg.join(", ") : msg);
      setLoading(false);
    }
  }

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    router.push("/login");
  }

  // Offset center southward so the pin/route appears in the upper portion of the screen,
  // above the bottom sheet (~400px tall). ~0.004° lat ≈ 440px at zoom 14.
  const LAT_OFFSET = 0.004;
  const mapCenter: [number, number] = origin
    ? [origin.lat - LAT_OFFSET, origin.lng]
    : [10.4631 - LAT_OFFSET, -73.2532];

  const mapPins = [
    ...(origin ? [{ lat: origin.lat, lng: origin.lng, label: "Origen", color: "green" as const }] : []),
    ...(dest ? [{ lat: dest.lat, lng: dest.lng, label: "Destino", color: "red" as const }] : []),
  ];

  return (
    <>
      {/* ─── Side drawer ─────────────────────────────────────── */}
      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex" }}>
          <div
            style={{ flex: 1, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
            onClick={() => setMenuOpen(false)}
          />
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: "72%", maxWidth: 300,
            background: "var(--surface)", display: "flex", flexDirection: "column",
            boxShadow: "4px 0 24px rgba(0,0,0,0.25)",
          }}>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px 4px" }}>
              <button onClick={() => setMenuOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "26px", color: "var(--text-muted)" }}>×</button>
            </div>
            <div style={{ padding: "4px 20px 20px" }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%", background: "var(--primary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "10px",
              }}>
                <User size={26} color="#fff" />
              </div>
              {user && (
                <>
                  <p style={{ fontWeight: 700, fontSize: "16px", color: "var(--text)" }}>{user.fullName}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{user.email}</p>
                </>
              )}
            </div>
            <div style={{ height: 1, background: "var(--border)", margin: "0 20px" }} />
            <nav style={{ padding: "8px 0", flex: 1 }}>
              {([
                { href: "/client/dashboard", label: "Inicio", icon: <Home size={20} /> },
                { href: "/client/history", label: "Historial", icon: <ClipboardList size={20} /> },
                { href: "/client/profile", label: "Perfil", icon: <User size={20} /> },
              ] as const).map((item) => (
                <button key={item.href}
                  onClick={() => { setMenuOpen(false); router.push(item.href); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    width: "100%", padding: "14px 20px",
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: "15px", fontWeight: 600,
                    color: "var(--text)", textAlign: "left",
                  }}>
                  {item.icon}{item.label}
                </button>
              ))}
            </nav>
            <div style={{ padding: "0 20px 28px" }}>
              <div style={{ height: 1, background: "var(--border)", marginBottom: "12px" }} />
              <button onClick={handleLogout}
                style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  width: "100%", padding: "10px 0",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: "15px", fontWeight: 600, color: "var(--danger)",
                }}>
                <LogOut size={20} />Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Note modal ──────────────────────────────────────── */}
      {noteModal && (
        <div
          onClick={() => setNoteModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 600,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)",
            display: "flex", alignItems: "flex-end",
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 480, margin: "0 auto",
              background: "var(--surface)", borderRadius: "var(--r-xl) var(--r-xl) 0 0",
              padding: "20px 16px 32px",
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <p style={{ fontWeight: 700, fontSize: "16px" }}>Agregar nota</p>
              <button onClick={() => setNoteModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "var(--text-muted)" }}>×</button>
            </div>
            <textarea
              autoFocus maxLength={500} value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Ej: Soy el de la camiseta azul, espero en la entrada principal…"
              style={{
                width: "100%", minHeight: 110, resize: "none",
                background: "var(--bg)", border: "1.5px solid var(--border-strong)",
                borderRadius: "var(--r-md)", padding: "12px", fontFamily: "inherit",
                fontSize: "14px", color: "var(--text)", lineHeight: 1.5, boxSizing: "border-box",
              }}
            />
            <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "right", marginTop: "4px" }}>{noteDraft.length}/500</p>
            <button
              type="button"
              onClick={() => { setNote(noteDraft); setNoteModal(false); }}
              style={{
                marginTop: "12px", width: "100%", padding: "13px",
                borderRadius: "var(--r-md)", border: "none",
                background: "var(--primary)", color: "#fff",
                fontFamily: "inherit", fontSize: "15px", fontWeight: 700, cursor: "pointer",
              }}>
              Guardar nota
            </button>
          </div>
        </div>
      )}

      {/* ─── Location modal ───────────────────────────────────── */}
      <LocationModal
        mode={modalMode}
        originPoint={origin}
        destPoint={dest}
        onConfirmOrigin={(point) => { setOrigin(point); setModalMode(null); setSheetExpanded(false); setTimeout(() => setSheetExpanded(true), 3000); }}
        onConfirmDest={(text, pin) => { setDest(pin ? { lat: pin.lat, lng: pin.lng, address: text } : null); setModalMode(null); setSheetExpanded(false); setTimeout(() => setSheetExpanded(true), 3000); }}
        onClose={() => setModalMode(null)}
      />

      {/* ─── Fullscreen map ──────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <MapView
          center={mapCenter}
          zoom={14}
          height="100%"
          pins={mapPins}
        />
      </div>

      {/* ─── Top bar (hamburger + logo) ──────────────────────── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        zIndex: 200, padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)",
        pointerEvents: "none",
      }}>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Menú"
          style={{
            pointerEvents: "auto",
            width: 40, height: 40, borderRadius: "50%",
            background: "var(--surface)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
          }}>
          <Menu size={20} color="var(--text)" />
        </button>
        <div style={{
          pointerEvents: "none",
          display: "flex", alignItems: "center", gap: "8px",
          background: "var(--surface)", borderRadius: "var(--r-lg)",
          padding: "6px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
        }}>
          <Image
            src="/logo-motu.webp"
            alt="Logo Motu"
            width={40}
            height={20}
            className="mx-auto"
          />
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* ─── Active ride banner ──────────────────────────────── */}
      {activeRide && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          zIndex: 300, padding: "0 0 env(safe-area-inset-bottom,0)",
        }}>
          <div style={{
            margin: "0 12px 16px",
            background: "var(--surface)", borderRadius: "var(--r-xl)",
            padding: "16px", border: "2px solid var(--primary)",
            boxShadow: "0 -4px 32px rgba(0,0,0,0.15)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Bike size={18} style={{ color: "var(--primary)" }} />
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
            <Button variant="primary" fullWidth size="sm"
              onClick={() => router.push(`/client/negotiation/${activeRide.id}`)}>
              Ver solicitud →
            </Button>
          </div>
        </div>
      )}

      {/* ─── Bottom sheet (form) ─────────────────────────────── */}
      {!activeRide && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          zIndex: 300, display: "flex", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            width: "100%", maxWidth: 480, pointerEvents: "auto",
            background: "var(--surface)",
            borderRadius: "var(--r-xl) var(--r-xl) 0 0",
            boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
            transform: sheetExpanded ? "translateY(0)" : "translateY(calc(100% - 180px))",
            transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
            maxHeight: "90vh", overflowY: sheetExpanded ? "auto" : "hidden",
          }}>
            {/* Drag handle — touch & mouse */}
            <div
              onClick={() => setSheetExpanded((v) => !v)}
              onMouseDown={(e) => onDragStart(e.clientY)}
              onMouseUp={(e) => onDragEnd(e.clientY)}
              onTouchStart={(e) => onDragStart(e.touches[0].clientY)}
              onTouchEnd={(e) => onDragEnd(e.changedTouches[0].clientY)}
              style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px", cursor: "pointer", userSelect: "none" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-strong)" }} />
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "4px 16px 24px" }}>
              {/* ── Ride type ── */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                {RIDE_TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => setRideType(t.value)}
                    style={{
                      flex: 1, padding: "10px 8px",
                      borderRadius: "var(--r-md)",
                      border: `2px solid ${rideType === t.value ? "var(--primary)" : "var(--border)"}`,
                      background: rideType === t.value ? "var(--primary-xpale)" : "var(--surface)",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "center",
                    }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: rideType === t.value ? "var(--primary)" : "var(--text-secondary)" }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{t.desc}</div>
                  </button>
                ))}
              </div>

              {/* ── Origin / Dest pills ── */}
              <div style={{
                background: "var(--bg)", borderRadius: "var(--r-lg)",
                border: "1.5px solid var(--border)", overflow: "hidden",
                marginBottom: "12px",
              }}>
                {/* Origin row */}
                <button type="button" onClick={() => setModalMode("origin")}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    width: "100%", padding: "13px 14px",
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: "inherit", textAlign: "left",
                  }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: "var(--success)", flexShrink: 0,
                    boxShadow: "0 0 0 3px rgba(34,197,94,0.25)",
                  }} />
                  <span style={{
                    flex: 1, fontSize: "14px",
                    fontWeight: origin ? 500 : 400,
                    color: origin ? "var(--text)" : "var(--text-muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {origin ? origin.address : "¿Desde dónde?"}
                  </span>
                  {origin && <span style={{ fontSize: "11px", color: "var(--success)", fontWeight: 700, flexShrink: 0 }}>Cambiar</span>}
                </button>

                {/* Divider with dots */}
                <div style={{ display: "flex", alignItems: "center", padding: "0 14px" }}>
                  <div style={{ width: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                    {[0, 1, 2].map((i) => <div key={i} style={{ width: 2, height: 2, borderRadius: "50%", background: "var(--text-muted)" }} />)}
                  </div>
                  <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: "11px" }} />
                </div>

                {/* Dest row */}
                <button type="button" onClick={() => setModalMode("dest")}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    width: "100%", padding: "13px 14px",
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: "inherit", textAlign: "left",
                  }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "2px",
                    background: "var(--danger)", flexShrink: 0,
                    boxShadow: "0 0 0 3px rgba(239,68,68,0.2)",
                  }} />
                  <span style={{
                    flex: 1, fontSize: "14px",
                    fontWeight: dest ? 500 : 400,
                    color: dest ? "var(--text)" : "var(--text-muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {dest ? dest.address : "¿A dónde vas?"}
                  </span>
                  {dest && <span style={{ fontSize: "11px", color: "var(--danger)", fontWeight: 700, flexShrink: 0 }}>Cambiar</span>}
                </button>
              </div>

              {/* ── Only show price + extras when expanded ── */}
              {sheetExpanded && (
                <>
                  {/* Price */}
                  <div style={{
                    display: "flex", alignItems: "center",
                    background: "var(--bg)", borderRadius: "var(--r-lg)",
                    border: "1.5px solid var(--border)",
                    padding: "10px 14px", marginBottom: "12px", gap: "12px",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Tu oferta al conductor</div>
                      <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                        {formatCOP(price)}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                        mín. {formatCOP(MIN_PRICE)} · pueden contraofertar
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button type="button" onClick={() => adjustPrice(-PRICE_STEP)} disabled={price <= MIN_PRICE}
                        style={{
                          width: 40, height: 40, borderRadius: "50%",
                          border: "2px solid var(--border-strong)", background: "var(--surface)",
                          cursor: price > MIN_PRICE ? "pointer" : "default",
                          fontSize: "22px", fontWeight: 700,
                          color: price > MIN_PRICE ? "var(--text)" : "var(--text-muted)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>−</button>
                      <button type="button" onClick={() => adjustPrice(PRICE_STEP)}
                        style={{
                          width: 40, height: 40, borderRadius: "50%",
                          border: "2px solid var(--primary)", background: "var(--primary-xpale)",
                          cursor: "pointer", fontSize: "22px", fontWeight: 700, color: "var(--primary)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>+</button>
                    </div>
                  </div>

                  {/* Note */}
                  <button type="button"
                    onClick={() => { setNoteDraft(note); setNoteModal(true); }}
                    style={{
                      width: "100%", padding: "11px 14px", marginBottom: "12px",
                      borderRadius: "var(--r-md)",
                      border: `1.5px dashed ${note ? "var(--primary)" : "var(--border-strong)"}`,
                      background: note ? "var(--primary-xpale)" : "transparent",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      gap: "10px", fontFamily: "inherit", textAlign: "left",
                    }}>
                    <FileText size={16} style={{ color: note ? "var(--primary)" : "var(--text-muted)", flexShrink: 0 }} />
                    <span style={{
                      flex: 1, fontSize: "13px", fontWeight: note ? 500 : 400,
                      color: note ? "var(--primary)" : "var(--text-muted)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {note || "Agregar nota para el conductor"}
                    </span>
                    {note && (
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setNote(""); setNoteDraft(""); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--text-muted)", padding: "2px", lineHeight: 1, flexShrink: 0 }}>
                        ×
                      </button>
                    )}
                  </button>

                  {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}
                </>
              )}

              {/* ── Submit ── */}
              <Button
                type="submit"
                variant="accent"
                fullWidth
                size="lg"
                loading={loading}
                disabled={!origin || !dest}
              >
                {!origin ? "Indica tu origen" : !dest ? "Indica el destino" : "Buscar conductor"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
