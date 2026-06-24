"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";
import Image from "next/image";

const ROLE_HOME: Record<string, string> = {
  CLIENT: '/client/dashboard',
  DRIVER: '/driver/dashboard',
  ADMIN: '/admin/dashboard',
};

type Role = "CLIENT" | "DRIVER";

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "CLIENT", label: "Cliente", desc: "Encontrar conductores" },
  { value: "DRIVER", label: "Conductor", desc: "Ofrecer servicios" },
];

export default function SignupPageClient({
  tab,
}: {
  tab?: string;
}) {
  const router = useRouter();
  const { register, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const defaultRole: Role =
    tab?.toUpperCase() === "DRIVER"
      ? "DRIVER"
      : "CLIENT";

  const isDriverSignup = tab?.toUpperCase() === "DRIVER";
  const visibleRoles = isDriverSignup
    ? ROLES.filter((r) => r.value !== "CLIENT")
    : ROLES;

  const [form, setForm] = useState({
    fullName: "",
    // email: "",
    phone: "",
    password: "",
    role: defaultRole,
  });


  useEffect(() => {
    if (!authLoading && user) router.replace(ROLE_HOME[user.role] ?? '/');
  }, [user, authLoading, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(form);
      if (form.role === "DRIVER") router.push("/driver/onboarding");
      else router.push("/client/dashboard");
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Ocurrió un error inesperado.";
      setError(Array.isArray(response) ? response.join(", ") : response);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(160deg, var(--primary-pale) 0%, var(--bg) 50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 10px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }} className="animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/logo-motu.webp"
            alt="Logo Motu"
            width={100}
            height={50}
            className="mx-auto w-auto h-auto"
            loading="eager"
          />
          <h1 className="mt-6 font-[800] text-3xl text-center">
            {form.role === 'DRIVER' ? (<span>Crea tu cuenta <br /> Motu Driver</span>) : 'Crea tu cuenta'}
          </h1>
          <p className="mt-1 text-muted text-sm text-center">
            {form.role === 'DRIVER' ? 'Únete a Motu y empieza a ganar dinero por tus servicios.' : 'Encuentra conductores de confianza para tus viajes.'}
          </p>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              {visibleRoles.length > 1 && (
                <label className="text-center">¿Cómo usarás Motu?</label>
              )}
              <div className={`flex justify-center gap-3 ${visibleRoles.length > 1 ? 'grid-2' : 'grid-1'}`}>
                {visibleRoles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, role: r.value }))}
                    style={{
                      padding: "14px 12px",
                      borderRadius: "var(--r-md)",
                      border: `2px solid ${form.role === r.value ? "var(--primary)" : "var(--border)"}`,
                      background: form.role === r.value ? "var(--primary-xpale)" : "var(--surface)",
                      cursor: "pointer",
                      textAlign: "center",
                      fontFamily: "inherit",
                      transition: "all var(--t-fast)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: form.role === r.value ? "var(--primary)" : "var(--text-secondary)",
                      }}
                    >
                      {r.label}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {r.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="fullName">Nombre completo</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Juan Pérez"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </div>

            {/* <div className="form-group">
              <label htmlFor="email-signup">Correo electrónico</label>
              <input
                id="email-signup"
                name="email"
                type="email"
                placeholder="tu@correo.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div> */}

            <div className="form-group">
              <label htmlFor="phone">Teléfono <small className="text-muted" style={{ textTransform: 'lowercase' }}>(sin +57)</small></label>
              <input
                id="phone"
                name="phone"
                type="tel"
                maxLength={10}
                placeholder="300 000 0000"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label htmlFor="password-signup">Contraseña</label>
              <input
                id="password-signup"
                name="password"
                type="password"
                placeholder="Mínimo 4 caracteres"
                value={form.password}
                onChange={handleChange}
                required
                minLength={4}
                maxLength={16}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="alert alert-error mb-4" role="alert">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" fullWidth loading={loading} id="btn-signup">
              {form.role === "DRIVER" ? "Registrarme como Conductor" : "Crear cuenta"}
            </Button>
          </form>

          <div className="divider">o</div>

          <p className="text-center text-md text-muted">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary font-semibold">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}