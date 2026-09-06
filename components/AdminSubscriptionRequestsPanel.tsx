"use client";

import { useActionState, useEffect, useState } from "react";
import { trackSubActivated } from "@/lib/analytics";
import { formatWhen } from "@/lib/format";
import { formatCop, paymentMethodLabel } from "@/lib/premium-payment";
import { createClient } from "@/lib/supabase/client";
import { SUBSCRIPTION_PROOFS_BUCKET } from "@/lib/subscription-proofs";
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
};

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
    <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost">
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

  useEffect(() => {
    if (!approveState?.ok) return;
    trackSubActivated({
      venue_id: request.venue_id,
      plan: request.plan,
      payment_method: request.payment_method,
    });
  }, [approveState?.ok, request.venue_id, request.plan, request.payment_method]);

  return (
    <li className="claim-review-row">
      <div className="claim-review-head">
        <h3>
          <a
            href={`/canchas/${request.venues?.slug ?? ""}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {request.venues?.name ?? "Cancha eliminada"}
          </a>
          {request.venues?.neighborhood ? (
            <span className="claim-review-neighborhood">
              {" "}
              · {request.venues.neighborhood}
            </span>
          ) : null}
        </h3>
        <p className="claim-review-meta">
          {request.profiles?.display_name ?? "—"} ·{" "}
          {formatWhen(request.created_at, timezone)}
          {pending ? null : (
            <span className={`claim-review-outcome ${request.status}`}>
              {request.status === "approved" ? " · Aprobado" : " · Rechazado"}
            </span>
          )}
        </p>
      </div>

      <dl className="claim-review-facts">
        <div>
          <dt>Plan</dt>
          <dd>{request.plan}</dd>
        </div>
        <div>
          <dt>Método</dt>
          <dd>{paymentMethodLabel(request.payment_method)}</dd>
        </div>
        <div>
          <dt>Monto</dt>
          <dd>{formatCop(request.amount_cop)}</dd>
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
          <div className="claim-review-note">
            <dt>Motivo rechazo</dt>
            <dd>{request.reject_reason}</dd>
          </div>
        ) : null}
      </dl>

      <div className="claim-review-actions">
        <ProofLink path={request.proof_path} />
        {pending ? (
          <>
            <form action={approveAction}>
              <input type="hidden" name="request_id" value={request.id} />
              <label className="claim-duration-field">
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
                Aprobar y activar
              </button>
            </form>
            <details className="claim-reject-details">
              <summary className="btn-bib claim-reject-summary">Rechazar</summary>
              <form action={rejectAction} className="claim-reject-form">
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
    return <p className="venue-info-empty">No hay solicitudes Premium para revisar.</p>;
  }

  return (
    <ul className="claim-review-list">
      {requests.map((request) => (
        <RequestRow key={request.id} request={request} timezone={timezone} />
      ))}
    </ul>
  );
}
