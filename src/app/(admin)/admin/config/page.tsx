"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { formatCOP } from "@/lib/whatsapp";
import api from "@/lib/api-client";

interface Config {
  minRidePrice: string;
  maxFreeRides: number;
  commissionRate: number;
  passDurationDays: number;
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState({ minRidePrice: "", maxFreeRides: "", commissionRate: "", passDurationDays: "" });
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
          commissionRate: String(data.commissionRate),
          passDurationDays: String(data.passDurationDays),
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
        commissionRate: Number(form.commissionRate),
        passDurationDays: Number(form.passDurationDays),
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
    <div className="animate-fade-in">
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
                    <span className="text-muted text-sm">Tasa de comisión</span>
                    <span className="font-semibold">{config.commissionRate}%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="text-muted text-sm">Duración del pase</span>
                    <span className="font-semibold">{config.passDurationDays} día(s)</span>
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

              <div className="form-group">
                <label htmlFor="commissionRate">Tasa de comisión (%)</label>
                <input
                  id="commissionRate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.commissionRate}
                  onChange={(e) => setForm((p) => ({ ...p, commissionRate: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "24px" }}>
                <label htmlFor="passDurationDays">Duración del pase (días)</label>
                <input
                  id="passDurationDays"
                  type="number"
                  min={1}
                  step={1}
                  value={form.passDurationDays}
                  onChange={(e) => setForm((p) => ({ ...p, passDurationDays: e.target.value }))}
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
  );
}
