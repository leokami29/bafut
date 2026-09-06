"use client";

import { useActionState } from "react";
import { formatWhen } from "@/lib/format";
import {
  approveVenueClaimAction,
  rejectVenueClaimAction,
} from "@/app/admin/claims/actions";

export type AdminVenueClaim = {
  id: string;
  created_at: string;
  whatsapp: string;
  email: string | null;
  note: string;
  venues: { name: string; slug: string; neighborhood: string | null } | null;
  profiles: { display_name: string } | null;
};

function ClaimRow({ claim, timezone }: { claim: AdminVenueClaim; timezone: string }) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveVenueClaimAction,
    undefined,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectVenueClaimAction,
    undefined,
  );
  const busy = approvePending || rejectPending;

  return (
    <li className="claim-review-row">
      <div className="claim-review-head">
        <h3>
          <a href={`/canchas/${claim.venues?.slug ?? ""}`} target="_blank" rel="noopener noreferrer">
            {claim.venues?.name ?? "Cancha eliminada"}
          </a>
          {claim.venues?.neighborhood ? (
            <span className="claim-review-neighborhood"> · {claim.venues.neighborhood}</span>
          ) : null}
        </h3>
        <p className="claim-review-meta">
          {claim.profiles?.display_name ?? "—"} · {formatWhen(claim.created_at, timezone)}
        </p>
      </div>

      <dl className="claim-review-facts">
        <div>
          <dt>WhatsApp</dt>
          <dd>{claim.whatsapp}</dd>
        </div>
        <div>
          <dt>Correo</dt>
          <dd>{claim.email || "—"}</dd>
        </div>
        <div className="claim-review-note">
          <dt>Cómo verificar</dt>
          <dd>{claim.note}</dd>
        </div>
      </dl>

      <div className="claim-review-actions">
        <form action={approveAction}>
          <input type="hidden" name="claim_id" value={claim.id} />
          <button type="submit" className="btn-flood" disabled={busy}>
            Aprobar y asignar
          </button>
        </form>
        <details className="claim-reject-details">
          <summary className="btn-bib claim-reject-summary">Rechazar</summary>
          <form action={rejectAction} className="claim-reject-form">
            <input type="hidden" name="claim_id" value={claim.id} />
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
      </div>
      {approveState?.error ? <p className="form-error">{approveState.error}</p> : null}
      {rejectState?.error ? <p className="form-error">{rejectState.error}</p> : null}
    </li>
  );
}

export function AdminClaimsPanel({
  claims,
  timezone,
}: {
  claims: AdminVenueClaim[];
  timezone: string;
}) {
  if (claims.length === 0) {
    return (
      <div className="empty">
        <p className="empty-title">Sin reclamos pendientes</p>
        <p>Cuando un dueño reclame una cancha, aparece acá para tu revisión.</p>
      </div>
    );
  }

  return (
    <ul className="claim-review-list">
      {claims.map((claim) => (
        <ClaimRow key={claim.id} claim={claim} timezone={timezone} />
      ))}
    </ul>
  );
}
