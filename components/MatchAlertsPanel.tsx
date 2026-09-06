"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createMatchAlertAction,
  deleteMatchAlertAction,
  toggleMatchAlertAction,
  type AlertActionState,
} from "@/app/perfil/alertas/actions";
import { FORMATS, LEVELS, SPORTS } from "@/lib/constants";
import { formatLabel, levelLabel, sportLabel } from "@/lib/labels";
import type { City } from "@/lib/types";

export type MatchAlertRow = {
  id: string;
  city_id: string;
  sport: string | null;
  format: string | null;
  level: string | null;
  neighborhood: string | null;
  enabled: boolean;
  created_at: string;
};

type Props = {
  cities: City[];
  defaultCityId: string;
  alerts: MatchAlertRow[];
  vapidPublicKey: string | null;
  pushEnabled: boolean;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function MatchAlertsPanel({
  cities,
  defaultCityId,
  alerts,
  vapidPublicKey,
  pushEnabled,
}: Props) {
  const [pushStatus, setPushStatus] = useState<
    "idle" | "unsupported" | "denied" | "subscribed" | "error" | "loading"
  >("idle");
  const [pushError, setPushError] = useState<string | null>(null);

  const [createState, createAction, createPending] = useActionState(
    createMatchAlertAction,
    null as AlertActionState,
  );
  const [toggleState, toggleAction] = useActionState(toggleMatchAlertAction, null as AlertActionState);
  const [deleteState, deleteAction] = useActionState(deleteMatchAlertAction, null as AlertActionState);

  useEffect(() => {
    if (!pushEnabled || typeof window === "undefined") return;

    // Diferir setState (mismo patrón que PwaRegister) para evitar cascada sync en effect.
    const timer = window.setTimeout(() => {
      if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        setPushStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setPushStatus("denied");
        return;
      }
      void navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) setPushStatus("subscribed");
        })
        .catch(() => {});
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pushEnabled]);

  async function enablePush() {
    setPushError(null);
    if (!vapidPublicKey) {
      setPushError("Falta configurar VAPID en el servidor.");
      return;
    }
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushStatus("unsupported");
      return;
    }
    setPushStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "No se pudo guardar la suscripción");
      }
      setPushStatus("subscribed");
    } catch (err) {
      setPushStatus("error");
      setPushError(err instanceof Error ? err.message : "Error al activar push");
    }
  }

  async function disablePush() {
    setPushError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const json = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: json.endpoint, unsubscribe: true }),
        });
        await sub.unsubscribe();
      }
      setPushStatus("idle");
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Error al desactivar");
    }
  }

  return (
    <div className="stack-form match-alerts-panel">
      <section className="match-alerts-push">
        <h2 className="subhead">Notificaciones push</h2>
        <p className="field-help">
          Opt-in explícito. En iPhone/iPad solo funciona si instalaste BaFut como PWA (Añadir a
          pantalla de inicio) y usás Safari. Si no, usá WhatsApp o mirá el radar.
        </p>
        {!pushEnabled ? (
          <p className="form-error" role="status">
            Las alertas push están temporalmente deshabilitadas.
          </p>
        ) : pushStatus === "unsupported" ? (
          <p className="field-help">Este navegador no soporta Web Push.</p>
        ) : pushStatus === "denied" ? (
          <p className="form-error">Permiso denegado. Activá notificaciones en el navegador.</p>
        ) : pushStatus === "subscribed" ? (
          <div className="match-alerts-push-actions">
            <p className="form-ok" role="status">
              Push activado en este dispositivo.
            </p>
            <button type="button" className="btn-ghost" onClick={() => void disablePush()}>
              Desactivar en este dispositivo
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-bib"
            disabled={pushStatus === "loading"}
            onClick={() => void enablePush()}
          >
            {pushStatus === "loading" ? "Activando…" : "Activar notificaciones"}
          </button>
        )}
        {pushError ? <p className="form-error">{pushError}</p> : null}
      </section>

      <section>
        <h2 className="subhead">Tus alertas ({alerts.length}/5)</h2>
        {alerts.length === 0 ? (
          <p className="empty">Todavía no tenés alertas. Creá una abajo.</p>
        ) : (
          <ul className="match-alerts-list">
            {alerts.map((alert) => {
              const cityName = cities.find((c) => c.id === alert.city_id)?.name ?? "Ciudad";
              const bits = [
                cityName,
                alert.sport ? sportLabel[alert.sport as keyof typeof sportLabel] ?? alert.sport : "Cualquier deporte",
                alert.format ? formatLabel[alert.format as keyof typeof formatLabel] ?? alert.format : null,
                alert.level ? levelLabel[alert.level as keyof typeof levelLabel] ?? alert.level : null,
                alert.neighborhood,
              ].filter(Boolean);
              return (
                <li key={alert.id} className="match-alerts-item">
                  <div>
                    <strong>{bits.join(" · ")}</strong>
                    <span className="field-help">
                      {alert.enabled ? "Activa" : "Pausada"}
                    </span>
                  </div>
                  <div className="match-alerts-item-actions">
                    <form action={toggleAction}>
                      <input type="hidden" name="alert_id" value={alert.id} />
                      <input type="hidden" name="enabled" value={alert.enabled ? "false" : "true"} />
                      <button type="submit" className="btn-ghost">
                        {alert.enabled ? "Pausar" : "Reactivar"}
                      </button>
                    </form>
                    <form action={deleteAction}>
                      <input type="hidden" name="alert_id" value={alert.id} />
                      <button type="submit" className="btn-ghost">
                        Borrar
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {toggleState?.error || deleteState?.error ? (
          <p className="form-error">{toggleState?.error ?? deleteState?.error}</p>
        ) : null}
      </section>

      <section>
        <h2 className="subhead">Nueva alerta</h2>
        <form action={createAction} className="stack-form">
          <label>
            Ciudad
            <select name="city_id" defaultValue={defaultCityId} required>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Deporte
            <select name="sport" defaultValue="any">
              <option value="any">Cualquiera</option>
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {sportLabel[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Formato
            <select name="format" defaultValue="any">
              <option value="any">Cualquiera</option>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {formatLabel[f] ?? f}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nivel
            <select name="level" defaultValue="any">
              <option value="any">Cualquiera</option>
              {LEVELS.filter((l) => l !== "any").map((l) => (
                <option key={l} value={l}>
                  {levelLabel[l]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Barrio (opcional)
            <input name="neighborhood" maxLength={80} placeholder="Ej. Norte Centro Histórico" />
          </label>
          <button type="submit" className="btn-flood" disabled={createPending || !pushEnabled}>
            {createPending ? "Guardando…" : "Crear alerta"}
          </button>
          {createState?.error ? <p className="form-error">{createState.error}</p> : null}
          {createState?.ok ? <p className="form-ok">Alerta creada.</p> : null}
        </form>
      </section>
    </div>
  );
}
