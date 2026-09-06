"use client";

import { useActionState, useState, type FormEvent } from "react";
import { formatWhen } from "@/lib/format";
import { siteUrl } from "@/lib/env";
import { whatsappChatHref } from "@/lib/whatsapp-contact";
import { validateClaimProofChecklist } from "@/lib/venue-claims";
import {
  approveVenueClaimAction,
  rejectVenueClaimAction,
} from "@/app/admin/claims/actions";

export type AdminVenueClaim = {
  id: string;
  created_at: string;
  status: string;
  reject_reason: string | null;
  reviewed_at: string | null;
  whatsapp: string;
  email: string | null;
  note: string;
  proof_facade: boolean;
  proof_nit: boolean;
  proof_call_note: string | null;
  venues: { name: string; slug: string; neighborhood: string | null } | null;
  profiles: { display_name: string } | null;
};

function notifyHref(claim: AdminVenueClaim, outcome: "approved" | "rejected") {
  const venueName = claim.venues?.name ?? "la cancha";
  const message =
    outcome === "approved"
      ? `Hola! Verificamos tu reclamo de ${venueName} en BaFut: la ficha ya está a tu nombre con sello de verificada. Entrá al panel para completarla: ${siteUrl()}/canchas/${claim.venues?.slug ?? ""}/admin`
      : `Hola. Revisamos tu reclamo de ${venueName} en BaFut y por ahora no pudimos confirmar la propiedad.${claim.reject_reason ? ` Motivo: ${claim.reject_reason}.` : ""} Si tenés más datos para verificar, respondé este mensaje.`;
  return whatsappChatHref(claim.whatsapp, message);
}

function ProofSummary({ claim }: { claim: AdminVenueClaim }) {
  const items: string[] = [];
  if (claim.proof_facade) items.push("Foto fachada");
  if (claim.proof_nit) items.push("NIT / razón social");
  if (claim.proof_call_note) items.push("Nota de llamada");
  if (items.length === 0) return null;

  return (
    <div className="claim-review-proofs">
      <p className="claim-review-proofs-label">Pruebas registradas</p>
      <ul>
        {items.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
      {claim.proof_call_note ? (
        <p className="claim-review-call-note">{claim.proof_call_note}</p>
      ) : null}
    </div>
  );
}

function ClaimRow({ claim, timezone }: { claim: AdminVenueClaim; timezone: string }) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveVenueClaimAction,
    undefined,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectVenueClaimAction,
    undefined,
  );
  const [proofFacade, setProofFacade] = useState(false);
  const [proofNit, setProofNit] = useState(false);
  const [proofCallNote, setProofCallNote] = useState("");
  const [checklistError, setChecklistError] = useState<string | null>(null);

  const busy = approvePending || rejectPending;
  const pending = claim.status === "pending";

  function onApproveSubmit(event: FormEvent<HTMLFormElement>) {
    const check = validateClaimProofChecklist({
      proofFacade,
      proofNit,
      proofCallNote,
    });
    if ("error" in check) {
      event.preventDefault();
      setChecklistError(check.error);
      return;
    }
    setChecklistError(null);
  }

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
          {pending ? null : (
            <span className={`claim-review-outcome ${claim.status}`}>
              {claim.status === "approved" ? " · Aprobado" : " · Rechazado"}
            </span>
          )}
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

      {pending ? (
        <div className="claim-review-actions claim-review-actions-stack">
          <fieldset className="claim-proof-checklist" disabled={busy}>
            <legend>Checklist de prueba (obligatorio para aprobar)</legend>
            <p className="field-help">
              Marcá al menos una: foto de fachada, NIT/razón social, o dejá nota de la llamada.
            </p>
            <label className="claim-proof-check">
              <input
                type="checkbox"
                name="proof_facade"
                checked={proofFacade}
                onChange={(e) => setProofFacade(e.target.checked)}
              />
              <span>Foto de fachada / identidad del local verificada</span>
            </label>
            <label className="claim-proof-check">
              <input
                type="checkbox"
                name="proof_nit"
                checked={proofNit}
                onChange={(e) => setProofNit(e.target.checked)}
              />
              <span>NIT o razón social verificado</span>
            </label>
            <label className="claim-proof-call">
              <span>Nota de llamada (si aplicó)</span>
              <textarea
                name="proof_call_note"
                rows={2}
                maxLength={500}
                placeholder="Ej: llamé al 605…; atendió recepción y confirmó a…"
                value={proofCallNote}
                onChange={(e) => setProofCallNote(e.target.value)}
              />
            </label>
          </fieldset>

          <div className="claim-review-action-row">
            <form action={approveAction} onSubmit={onApproveSubmit}>
              <input type="hidden" name="claim_id" value={claim.id} />
              <input type="hidden" name="proof_facade" value={proofFacade ? "1" : "0"} />
              <input type="hidden" name="proof_nit" value={proofNit ? "1" : "0"} />
              <input type="hidden" name="proof_call_note" value={proofCallNote} />
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
          {checklistError ? <p className="form-error">{checklistError}</p> : null}
        </div>
      ) : (
        <div className="claim-review-actions claim-review-actions-stack">
          {claim.status === "approved" ? <ProofSummary claim={claim} /> : null}
          {claim.status === "rejected" && claim.reject_reason ? (
            <p className="claim-review-reject-reason">
              Motivo: {claim.reject_reason}
            </p>
          ) : null}
          <a
            href={notifyHref(claim, claim.status === "approved" ? "approved" : "rejected")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            Avisar al reclamante por WhatsApp
          </a>
        </div>
      )}
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
        <p className="empty-title">Sin reclamos en la cola</p>
        <p>
          No hay reclamos pendientes ni resueltos en las últimas 24 horas. Cuando un dueño
          reclame una cancha, aparece acá para tu revisión.
        </p>
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
