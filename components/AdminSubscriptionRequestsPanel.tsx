"use client";

import { useEffect, useActionState, useState } from "react";
import { trackSubActivated } from "@/lib/analytics";
import { formatWhen } from "@/lib/format";
import { formatCop, paymentMethodLabel } from "@/lib/premium-payment";
import { createClient } from "@/lib/supabase/client";
import { SUBSCRIPTION_PROOFS_BUCKET } from "@/lib/subscription-proofs";
import type { Aged } from "@/lib/admin-queues";
import {
  approveSubscriptionRequestAction,
  rejectSubscriptionRequestAction,
} from "@/app/admin/subscriptions/actions";

export type AdminSubscriptionRequest = {
  id: string;
  venue_id: string;
  created_at: string;
  status: string;
  plan: string;
  payment_method: string;
  amount_cop: number;
  payment_reference: string | null;
  proof_path: string;
  reject_reason: string | null;
  reviewed_at: string | null;
  invoice_number: string | null;
  subscription_id: string | null;
  duration_days: number;
  venues: { name: string; slug: string; neighborhood: string | null } | null;
  profiles: { display_name: string } | null;
} & Aged;

function ProofLink({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data, error: signError } = await supabase.storage
        .from(SUBSCRIPTION_PROOFS_BUCKET)
        .createSignedUrl(path, 60 * 30);
      if (cancelled) return;
      if (signError || !data?.signedUrl) {
        setError(signError?.message ?? "No se pudo firmar el comprobante");
        return;
      }
      setUrl(data.signedUrl);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (error) return <span className="form-error">{error}</span>;
  if (!url) return <span className="field-help">Cargando comprobante…</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-flood planilla-proof-btn"
    >
      Ver comprobante
    </a>
  );
}

function RequestRow({
  request,
  timezone,
}: {
  request: AdminSubscriptionRequest;
  timezone: string;
}) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveSubscriptionRequestAction,
    undefined,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectSubscriptionRequestAction,
    undefined,
  );
  const busy = approvePending || rejectPending;
  const pending = request.status === "pending";
  const urgency = request.urgency;

  useEffect(() => {
    if (!approveState?.ok) return;
    trackSubActivated({
      venue_id: request.venue_id,
      plan: request.plan,
      payment_method: request.payment_method,
    });
  }, [approveState?.ok, request.venue_id, request.plan, request.payment_method]);

  return (
    <li
      className={`planilla planilla-${request.status}`}
      data-urgency={pending ? urgency : undefined}
    >
      <header className="planilla-head">
        <span className="planilla-rail" aria-hidden="true" />
        <div className="planilla-title">
          <h3>
            <a
              href={`/canchas/${request.venues?.slug ?? ""}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {request.venues?.name ?? "Cancha eliminada"}
            </a>
          </h3>
          <p className="planilla-sub">
            {request.venues?.neighborhood ? `${request.venues.neighborhood} · ` : ""}
            {request.profiles?.display_name ?? "—"} · {formatWhen(request.created_at, timezone)}
          </p>
        </div>
        <div className="planilla-tags">
          <span className="planilla-price">{formatCop(request.amount_cop)}</span>
          {pending ? (
            <span className={`planilla-age planilla-age-${urgency}`}>
              en cola {request.ageLabel}
            </span>
          ) : (
            <span className={`planilla-stamp planilla-stamp-${request.status}`}>
              {request.status === "approved" ? "Activado" : "Rechazado"}
            </span>
          )}
        </div>
      </header>

      <details className="planilla-body" open={pending}>
        <summary className="planilla-summary">
          <span className="planilla-summary-label">Pago · {request.plan}</span>
          <span className="planilla-summary-hint" aria-hidden="true">
            desplegar
          </span>
        </summary>

        <div className="planilla-content">
        <dl className="planilla-facts">
          <div>
            <dt>Método</dt>
            <dd>{paymentMethodLabel(request.payment_method)}</dd>
          </div>
          <div>
            <dt>Referencia</dt>
            <dd>{request.payment_reference || "—"}</dd>
          </div>
          <div>
            <dt>Duración</dt>
            <dd>{request.duration_days} días</dd>
          </div>
          {request.invoice_number ? (
            <div>
              <dt>Factura</dt>
              <dd>
                <a href={`/admin/subscriptions/${request.id}/invoice`}>
                  {request.invoice_number}
                </a>
              </dd>
            </div>
          ) : null}
          {request.reject_reason ? (
            <div className="planilla-fact-note">
              <dt>Motivo rechazo</dt>
              <dd>{request.reject_reason}</dd>
            </div>
          ) : null}
        </dl>

        <div className="planilla-actions">
          <div className="planilla-action-row">
            <ProofLink path={request.proof_path} />
            {pending ? (
              <>
                <form action={approveAction}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <label className="planilla-duration">
                    <span className="sr-only">Días de suscripción</span>
                    <input
                      type="number"
                      name="duration_days"
                      min={1}
                      max={366}
                      defaultValue={request.duration_days}
                      disabled={busy}
                      aria-label="Días de suscripción"
                    />
                  </label>
                  <button type="submit" className="btn-flood" disabled={busy}>
                    {approvePending ? "Activando…" : "Aprobar y activar"}
                  </button>
                </form>
                <details className="planilla-reject">
                  <summary className="planilla-reject-summary">Rechazar</summary>
                  <form action={rejectAction} className="planilla-reject-form">
                    <input type="hidden" name="request_id" value={request.id} />
                    <label>
                      <span className="sr-only">Motivo del rechazo</span>
                      <input
                        type="text"
                        name="reason"
                        maxLength={300}
                        placeholder="Motivo (opcional)"
                        disabled={busy}
                      />
                    </label>
                    <button type="submit" className="btn-bib" disabled={busy}>
                      Confirmar rechazo
                    </button>
                  </form>
                </details>
              </>
            ) : request.status === "approved" && request.invoice_number ? (
              <a href={`/admin/subscriptions/${request.id}/invoice`} className="btn-ghost">
                Ver factura
              </a>
            ) : null}
          </div>
          {approveState?.error ? <p className="form-error">{approveState.error}</p> : null}
          {rejectState?.error ? <p className="form-error">{rejectState.error}</p> : null}
          {approveState?.ok ? <p className="form-ok">Premium activado.</p> : null}
        </div>
        </div>
      </details>
    </li>
  );
}

type AdminSubscriptionRequestsPanelProps = {
  requests: AdminSubscriptionRequest[];
  timezone: string;
};

export function AdminSubscriptionRequestsPanel({
  requests,
  timezone,
}: AdminSubscriptionRequestsPanelProps) {
  if (requests.length === 0) {
    return (
      <div className="admin-empty" role="status">
        <p className="admin-empty-title">Nada por cobrar todavía</p>
        <p>No hay solicitudes Premium esperando revisión en esta vista.</p>
      </div>
    );
  }

  return (
    <ul className="planilla-list">
      {requests.map((request) => (
        <RequestRow key={request.id} request={request} timezone={timezone} />
      ))}
    </ul>
  );
}
