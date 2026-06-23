"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import api from "@/lib/api-client";

type VehicleType = "MOTO";

interface FileField {
  file: File | null;
  preview: string | null;
}

function emptyFile(): FileField {
  return { file: null, preview: null };
}

function FileUploadField({
  label,
  hint,
  fieldState,
  onChange,
  id,
}: {
  label: string;
  hint?: string;
  fieldState: FileField;
  onChange: (file: File) => void;
  id: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="form-group">
      {/* <label>{label}</label> */}
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${fieldState.file ? "var(--success)" : "var(--border-strong)"}`,
          borderRadius: "var(--r-md)",
          padding: fieldState.preview ? "8px" : "16px 12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: fieldState.file ? "var(--success-pale)" : "var(--surface)",
          transition: "all 0.2s",
          minHeight: "56px",
        }}
      >
        {fieldState.preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fieldState.preview}
              alt={label}
              style={{ width: 48, height: 48, objectFit: "cover", borderRadius: "var(--r-sm)" }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--success)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                ✓ {fieldState.file?.name}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                Toca para cambiar
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "1.4rem" }}>📷</div>
            <div style={{ flex: 1 }}>
              {/* <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                Subir foto
              </div> */}
              {hint && (
                <div style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {hint}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onChange(file);
        }}
      />
    </div>
  );
}

type ProfileStatus = "PENDING" | "APPROVED" | "REJECTED";

export default function DriverOnboardingPage() {
  const router = useRouter();

  const [vehicleType] = useState<VehicleType>("MOTO");
  const [form, setForm] = useState({ vehiclePlate: "", vehicleModel: "" });
  const [photos, setPhotos] = useState({
    profilePhoto: emptyFile(),
    docFront: emptyFile(),
    docBack: emptyFile(),
    soatOrBike: emptyFile(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const [profileCheckLoading, setProfileCheckLoading] = useState(true);
  const [existingProfileStatus, setExistingProfileStatus] = useState<ProfileStatus | null>(null);

  useEffect(() => {
    api
      .get<{ status: ProfileStatus }>("/api/driver/profile")
      .then(({ data }) => {
        if (data.status === "APPROVED") {
          document.cookie = "driver_verified=1; path=/; Max-Age=604800; SameSite=Lax";
          router.replace("/driver/dashboard");
        } else {
          setExistingProfileStatus(data.status);
        }
      })
      .catch((err) => {
        if (err?.response?.status !== 404) {
          setError("Error al verificar tu perfil.");
        }
      })
      .finally(() => setProfileCheckLoading(false));
  }, [router]);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.name === "vehiclePlate" ? e.target.value.toUpperCase() : e.target.value;
    setForm((prev) => ({ ...prev, [e.target.name]: val }));
  }

  function handleFileSelect(fieldKey: keyof typeof photos) {
    return (file: File) => {
      const preview = URL.createObjectURL(file);
      setPhotos((prev) => ({ ...prev, [fieldKey]: { file, preview } }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const missing: string[] = [];
    if (!photos.profilePhoto.file) missing.push("Foto de perfil");
    if (!photos.docFront.file) missing.push("Cédula de frente");
    if (!photos.docBack.file) missing.push("Cédula de reverso");
    if (!photos.soatOrBike.file) missing.push( "Foto placa moto");

    if (missing.length > 0) {
      setError(`Faltan: ${missing.join(", ")}`);
      return;
    }

    if (vehicleType === "MOTO" && !form.vehiclePlate.trim()) {
      setError("Ingresa la placa de la moto.");
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("vehicleType", vehicleType);
      fd.append("vehicleModel", form.vehicleModel);
      if (vehicleType === "MOTO") fd.append("vehiclePlate", form.vehiclePlate);
      fd.append("profilePhoto", photos.profilePhoto.file!);
      fd.append("docFront", photos.docFront.file!);
      fd.append("docBack", photos.docBack.file!);
      fd.append("soatOrBike", photos.soatOrBike.file!);

      await api.post("/api/driver/onboarding", fd);
      setDone(true);
    } catch (err: unknown) {
      if (err instanceof Error && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Error al guardar tus datos.";
        setError(Array.isArray(response) ? response.join(", ") : response);
      }
      setLoading(false);
    }
  }

  if (profileCheckLoading) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <div className="spinner spinner-lg" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (existingProfileStatus === "PENDING" || existingProfileStatus === "REJECTED") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "linear-gradient(160deg, var(--primary-xpale) 0%, var(--bg) 60%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }} className="animate-slide-up">
          {existingProfileStatus === "PENDING" ? (
            <>
              <div style={{ fontSize: "4rem", marginBottom: "16px" }}>⏳</div>
              <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "10px" }}>
                Verificación en proceso
              </h2>
              <p className="text-muted mb-6" style={{ fontSize: "15px" }}>
                Tus documentos ya fueron enviados y están siendo revisados por el equipo Motu.
                Te notificaremos cuando seas aprobado.
              </p>
              <div className="card" style={{ textAlign: "left", marginBottom: "24px" }}>
                <p className="text-sm text-muted">
                  📞 ¿Tienes dudas?{" "}
                  <strong>
                    <a href="https://wa.me/3017953727" target="_blank" rel="noopener noreferrer">
                      Contáctanos aquí
                    </a>
                  </strong>
                </p>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: "4rem", marginBottom: "16px" }}>❌</div>
              <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "10px" }}>
                Perfil rechazado
              </h2>
              <p className="text-muted mb-6" style={{ fontSize: "15px" }}>
                Tu perfil fue rechazado. Contacta al administrador para más información.
              </p>
              <a
                href="https://wa.me/3017953727"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ display: "block", width: "100%" }}
              >
                Contactar soporte
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "linear-gradient(160deg, var(--success-pale) 0%, var(--bg) 60%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
        }}
      >
        <div
          style={{ width: "100%", maxWidth: 400, textAlign: "center" }}
          className="animate-slide-up"
        >
          <div style={{ fontSize: "4rem", marginBottom: "16px" }}>✅</div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "10px" }}>
            ¡Solicitud enviada!
          </h2>
          <p className="text-muted mb-6" style={{ fontSize: "15px" }}>
            Tu perfil está siendo{" "}
            <strong style={{ color: "var(--warning)" }}>verificado</strong>. Recibirás
            acceso completo una vez que el administrador apruebe tus documentos.
          </p>

          <div className="card card-success mb-6" style={{ textAlign: "left" }}>
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--success)" }}>
              Mientras esperas:
            </p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li className="text-sm text-muted">📞 Si tienes dudas contactanos <strong><a href="https://wa.me/3017953727" target="_blank" rel="noopener noreferrer"> AQUÍ</a></strong></li>
              <li className="text-sm text-muted">⏳ Espera la notificación de aprobación</li>
              <li className="text-sm text-muted">📱 Te contactaremos cuando estes listo</li>
            </ul>
          </div>

          <Button variant="ghost" fullWidth onClick={() => router.push("/driver/dashboard")} id="btn-go-driver">
            Ir al panel del conductor →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="screen-header">
        <div
          style={{
            width: 36,
            height: 36,
            border: "1px solid var(--border)",
            borderRadius: "var(--r-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
          }}
        >
          🏍️
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>
            Registro de Conductor
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Paso 2 de 2 — Vehículo y documentos
          </div>
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: "flex", gap: "6px", marginBottom: "24px" }}>
          {["Cuenta", "Vehículo"].map((step, i) => (
            <div
              key={step}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 4,
                background: i === 0 ? "var(--success)" : "var(--text-dim)",
              }}
            />
          ))}
        </div>

        <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "6px" }}>
          Datos de tu vehículo
        </h2>
        <p className="text-muted text-sm mb-6">
          Esta información será verificada por el equipo Motu.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Vehicle type selector */}
          <div className="form-group">
            {/* <label>Tipo de vehículo</label> */}
            {/* <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {(["MOTO", "BICI"] as VehicleType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setVehicleType(type)}
                  style={{
                    padding: "14px 8px",
                    borderRadius: "var(--r-md)",
                    border: `2px solid ${vehicleType === type ? "var(--primary)" : "var(--border)"}`,
                    background: vehicleType === type ? "var(--primary-xpale)" : "var(--surface)",
                    color: vehicleType === type ? "var(--primary-dark)" : "var(--text-muted)",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: "1.8rem" }}>{type === "MOTO" ? "🏍️" : "🚲"}</span>
                  {type === "MOTO" ? "Motocicleta" : "Bicicleta"}
                </button>
              ))}
            </div> */}
          </div>

          {vehicleType === "MOTO" && (
            <div className="form-group">
              <label htmlFor="vehiclePlate">Placa</label>
              <input
                id="vehiclePlate"
                name="vehiclePlate"
                type="text"
                placeholder="ABC123"
                value={form.vehiclePlate}
                onChange={handleFormChange}
                style={{ fontWeight: 700, letterSpacing: "0.05em" }}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="vehicleModel">
              {vehicleType === "MOTO" ? "Marca y modelo" : "Marca de la bicicleta"}
            </label>
            <input
              id="vehicleModel"
              name="vehicleModel"
              type="text"
              placeholder={vehicleType === "MOTO" ? "Ej: Honda CB125F 2022" : "Ej: Trek Marlin 5"}
              value={form.vehicleModel}
              onChange={handleFormChange}
              required
            />
          </div>

          {/* Documents */}
          <div
            style={{
              background: "var(--primary-xpale)",
              border: "1.5px solid var(--primary-pale)",
              borderRadius: "var(--r-lg)",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <p className="text-md font-semibold mb-4" style={{ color: "var(--primary-dark)" }}>
              📎 Documentos y fotos
            </p>

            <FileUploadField
              id="profilePhoto"
              label="Tu foto de perfil"
              hint="Toca para subir foto de tu rostro"
              fieldState={photos.profilePhoto}
              onChange={handleFileSelect("profilePhoto")}
            />
            
            <FileUploadField
              id="docFront"
              label="Cédula - frente"
              hint="Toca para subir foto del frente de tu cédula"
              fieldState={photos.docFront}
              onChange={handleFileSelect("docFront")}
            />
            <FileUploadField
              id="docBack"
              label="Cédula - reverso"
              hint="Toca para subir foto del reverso de tu cédula"
              fieldState={photos.docBack}
              onChange={handleFileSelect("docBack")}
            />

            {vehicleType === "MOTO" ? (
              <FileUploadField
                id="placa"
                label="Foto placa moto"
                hint="Toca para subir foto de placa de la moto"
                fieldState={photos.soatOrBike}
                onChange={handleFileSelect("soatOrBike")}
              />
            ) : (
              <FileUploadField
                id="bikePhoto"
                label="Foto bicicleta"
                hint="Toca para subir foto de tu bicicleta"
                fieldState={photos.soatOrBike}
                onChange={handleFileSelect("soatOrBike")}
              />
            )}
          </div>

          {error && (
            <div className="alert alert-error mb-4" role="alert">
              ⚠️ {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            id="btn-submit-onboarding"
          >
            Enviar para verificación
          </Button>
        </form>
      </div>
    </div>
  );
}
