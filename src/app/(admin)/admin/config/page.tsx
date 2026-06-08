"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";

interface Config {
  minRidePrice: string;
  maxFreeRides: number;
  dailyPassPrice: string;
}

export default function AdminConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState({ minRidePrice: "", maxFreeRides: "", dailyPassPrice: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get<Config>("/api/admin/config")
      .then(({ data }) => {
        setConfig(data);
        setForm({
          minRidePrice: data.minRidePrice,
          maxFreeRides: String(data.maxFreeRides),
          dailyPassPrice: data.dailyPassPrice,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { data } = await api.patch<Config>("/api/admin/config", {
        minRidePrice: Number(form.minRidePrice),
        maxFreeRides: Number(form.maxFreeRides),
        dailyPassPrice: Number(form.dailyPassPrice),
      });
      setConfig(data);
      setMessage("Configuración guardada correctamente.");
    } catch {
      setMessage("Error guardando la configuración.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="screen-header">
        <button
          onClick={() => router.push("/admin/dashboard")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", padding: "4px 8px" }}
        >
          ←
        </button>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "17px" }}>Configuración del Sistema</span>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
            <div className="spinner" style={{ color: "var(--primary)" }} />
          </div>
        ) : (
          <>
            {config && (
              <div className="card mb-6 animate-fade-in">
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                  Valores actuales
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="text-muted text-sm">Precio mínimo de carrera</span>
                    <span className="font-semibold">{formatCOP(Number(config.minRidePrice))}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="text-muted text-sm">Viajes gratuitos por conductor</span>
                    <span className="font-semibold">{config.maxFreeRides}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="text-muted text-sm">Precio pase diario</span>
                    <span className="font-semibold">{formatCOP(Number(config.dailyPassPrice))}</span>
                  </div>
                </div>
              </div>
            )}

            {message && (
              <div className={`alert ${message.startsWith("✅") ? "alert-success" : "alert-error"} mb-4`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSave}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>
                Editar configuración
              </h3>

              <div className="form-group">
                <label htmlFor="minRidePrice">Precio mínimo de carrera (COP)</label>
                <input
                  id="minRidePrice"
                  type="number"
                  min={1000}
                  step={500}
                  value={form.minRidePrice}
                  onChange={(e) => setForm((p) => ({ ...p, minRidePrice: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxFreeRides">Viajes gratuitos por conductor</label>
                <input
                  id="maxFreeRides"
                  type="number"
                  min={0}
                  value={form.maxFreeRides}
                  onChange={(e) => setForm((p) => ({ ...p, maxFreeRides: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "24px" }}>
                <label htmlFor="dailyPassPrice">Precio del pase diario (COP)</label>
                <input
                  id="dailyPassPrice"
                  type="number"
                  min={500}
                  step={100}
                  value={form.dailyPassPrice}
                  onChange={(e) => setForm((p) => ({ ...p, dailyPassPrice: e.target.value }))}
                  required
                />
              </div>

              <Button type="submit" variant="primary" fullWidth loading={saving}>
                Guardar cambios
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
