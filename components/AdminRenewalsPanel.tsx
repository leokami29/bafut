"use client";

import { useActionState } from "react";
import {
  markRenewalSentAction,
  skipRenewalAction,
  type RenewalActionState,
} from "@/app/admin/renewals/actions";

export type RenewalRow = {
  id: string;
  reminder_type: string;
  channel: string;
  status: string;
  due_at: string;
  meta: {
    venue_slug?: string | null;
    venue_id?: string | null;
    message_preview?: string | null;
    has_whatsapp?: boolean;
  } | null;
  venue_name: string;
  venue_slug: string;
  expires_at: string;
  whatsapp: string | null;
  waHref: string | null;
};

export function AdminRenewalsPanel({ rows }: { rows: RenewalRow[] }) {
  const [sentState, sentAction, sentPending] = useActionState(
    markRenewalSentAction,
    null as RenewalActionState,
  );
  const [skipState, skipAction, skipPending] = useActionState(
    skipRenewalAction,
    null as RenewalActionState,
  );

  if (!rows.length) {
    return (
      <div className="admin-empty" role="status">
        <p className="admin-empty-title">Sin avisos en la cola</p>
        <p>
          No hay renovaciones T-7 / T-1 pendientes. El cron las carga cuando un Premium está
          por vencer.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="renewal-list">
        {rows.map((row) => (
          <li key={row.id} className="renewal-card">
            <div className="renewal-main">
              <p className="renewal-kicker">
                {row.reminder_type === "t7" ? "T-7" : "T-1"} ·{" "}
                {new Date(row.expires_at).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
              <a
                className="renewal-venue"
                href={`/canchas/${row.venue_slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {row.venue_name}
              </a>
              <p className="field-help">
                {row.whatsapp
                  ? `Vence ${new Date(row.expires_at).toLocaleDateString("es-CO")} · WhatsApp ${row.whatsapp}`
                  : "Vence pronto · sin número de contacto cargado"}
              </p>
              {row.meta?.message_preview ? (
                <p className="renewal-preview">{row.meta.message_preview}</p>
              ) : null}
            </div>
            <div className="renewal-actions">
              {row.waHref ? (
                <a className="btn-flood" href={row.waHref} target="_blank" rel="noopener noreferrer">
                  Abrir WhatsApp
                </a>
              ) : null}
              <form action={sentAction}>
                <input type="hidden" name="reminder_id" value={row.id} />
                <button type="submit" className="btn-ghost" disabled={sentPending}>
                  Marcar enviado
                </button>
              </form>
              <form action={skipAction}>
                <input type="hidden" name="reminder_id" value={row.id} />
                <button type="submit" className="btn-ghost" disabled={skipPending}>
                  Omitir
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      {sentState?.error || skipState?.error ? (
        <p className="form-error">{sentState?.error ?? skipState?.error}</p>
      ) : null}
    </>
  );
}
