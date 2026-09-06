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
    return <p className="empty">No hay renovaciones pendientes en la cola.</p>;
  }

  return (
    <div className="admin-renewals">
      <ul className="admin-renewals-list">
        {rows.map((row) => (
          <li key={row.id} className="admin-renewals-item">
            <div>
              <strong>
                {row.venue_name} · {row.reminder_type === "t7" ? "T-7" : "T-1"}
              </strong>
              <p className="field-help">
                Vence {new Date(row.expires_at).toLocaleDateString("es-CO")} · canal{" "}
                {row.channel}
                {row.whatsapp ? " · WA listo" : " · sin WhatsApp"}
              </p>
              {row.meta?.message_preview ? (
                <p className="field-help">{row.meta.message_preview}</p>
              ) : null}
            </div>
            <div className="admin-renewals-actions">
              {row.waHref ? (
                <a
                  className="btn-bib"
                  href={row.waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
    </div>
  );
}
