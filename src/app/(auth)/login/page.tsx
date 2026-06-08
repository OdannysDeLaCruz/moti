"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";

const ROLE_HOME: Record<string, string> = {
  CLIENT: '/client/dashboard',
  DRIVER: '/driver/dashboard',
  ADMIN: '/admin/dashboard',
};

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) router.replace(ROLE_HOME[user.role] ?? '/');
  }, [user, authLoading, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch {
      setError("Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(160deg, var(--primary-xpale) 0%, var(--bg) 50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }} className="animate-fade-in">
        <div className="text-center mb-8">
          <div
            style={{
              width: 72,
              height: 72,
              background: "var(--primary)",
              borderRadius: "var(--r-xl)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              margin: "0 auto 16px",
              boxShadow: "var(--shadow-primary)",
            }}
          >
            🛵
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text)" }}>Moti</h1>
          <p className="mt-2 text-muted text-sm">Ingresa a tu cuenta</p>
        </div>

        <div className="card" style={{ padding: "28px 24px" }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="alert alert-error mb-4" role="alert">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" fullWidth loading={loading} id="btn-login">
              Iniciar sesión
            </Button>
          </form>

          <div className="divider">o</div>

          <p className="text-center text-sm text-muted">
            ¿No tienes cuenta?{" "}
            <Link href="/signup" className="text-primary font-semibold">
              Crear cuenta gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
