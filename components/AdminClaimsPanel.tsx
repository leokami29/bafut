"use client";

import { useActionState, useState, type FormEvent } from "react";
import { formatWhen } from "@/lib/format";
import { siteUrl } from "@/lib/env";
import { normalizeWhatsapp, whatsappChatHref } from "@/lib/whatsapp-contact";
import { validateClaimProofChecklist } from "@/lib/venue-claims";
import type { Aged } from "@/lib/admin-queues";
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
} & Aged;

function notifyHref(claim: AdminVenueClaim, outcome: "approved" | "rejected") {
  const venueName = claim.venues?.name ?? "la cancha";
  const message =
    outcome === "approved"
      ? `Hola! Verificamos tu reclamo de ${venueName} en BaFut: la ficha ya está a tu nombre con sello de verificada. Entrá al panel para completarla: ${siteUrl()}/canchas/${claim.venues?.slug ?? ""}/admin`
      : `Hola. Revisamos tu reclamo de ${venueName} en BaFut y por ahora no pudimos confirmar la propiedad.${claim.reject_reason ? ` Motivo: ${claim.reject_reason}.` : ""} Si tenés más datos para verificar, respondé este mensaje.`;
  return whatsappChatHref(claim.whatsapp, message);
}

function contactHref(claim: AdminVenueClaim) {
  const digits = normalizeWhatsapp(claim.whatsapp);
  if (!digits) return null;
  return whatsappChatHref(
    digits,
    `Hola, soy del equipo de BaFut sobre tu reclamo de ${claim.venues?.name ?? "la cancha"}.`,
  );
}

function ProofSummary({ claim }: { claim: AdminVenueClaim }) {
  const items: string[] = [];
  if (claim.proof_facade) items.push("Foto fachada");
  if (claim.proof_nit) items.push("NIT / razón social");
  if (claim.proof_call_note) items.push("Nota de llamada");
  if (items.length === 0) return null;

  return (
    <div className="planilla-proofs">
      <p className="planilla-proofs-label">Pruebas registradas</p>
      <ul>
        {items.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
      {claim.proof_call_note ? (
        <p className="planilla-call-note">{claim.proof_call_note}</p>
      ) : null}
    </div>
  );
}

function ClaimRow({
  claim,
  timezone,
}: {
  claim: AdminVenueClaim;
  timezone: string;
}) {
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
  const urgency = claim.urgency;
  const wa = contactHref(claim);

  const proofReady =
    "error" in validateClaimProofChecklist({ proofFacade, proofNit, proofCallNote })
      ? false
      : true;

  function onApproveSubmit(event: FormEvent<HTMLFormElement>) {
    if (!proofReady) {
      event.preventDefault();
      setChecklistError("Marcá o escribí al menos una prueba para poder aprobar.");
      return;
    }
    setChecklistError(null);
  }

  return (
    <li className={`planilla planilla-${claim.status}`} data-urgency={pending ? urgency : undefined}>
      <header className="planilla-head">
        <span className="planilla-rail" aria-hidden="true" />
        <div className="planilla-title">
          <h3>
            <a href={`/canchas/${claim.venues?.slug ?? ""}`} target="_blank" rel="noopener noreferrer">
              {claim.venues?.name ?? "Cancha eliminada"}
            </a>
          </h3>
          <p className="planilla-sub">
            {claim.venues?.neighborhood ? `${claim.venues.neighborhood} · ` : ""}
            {claim.profiles?.display_name ?? "sin nombre"} ·{" "}
            {formatWhen(claim.created_at, timezone)}
          </p>
        </div>
        <div className="planilla-tags">
          {pending ? (
            <span className={`planilla-age planilla-age-${urgency}`}>
              en cola {claim.ageLabel}
            </span>
          ) : (
            <span className={`planilla-stamp planilla-stamp-${claim.status}`}>
              {claim.status === "approved" ? "Aprobado" : "Rechazado"}
            </span>
          )}
        </div>
      </header>

      <details className="planilla-body" open={pending}>
        <summary className="planilla-summary">
          <span className="planilla-summary-label">Planilla de verificación</span>
          <span className="planilla-summary-hint" aria-hidden="true">
            desplegar
          </span>
        </summary>

        <div className="planilla-content">
          <dl className="planilla-facts">
          <div>
            <dt>WhatsApp</dt>
            <dd>
              {claim.whatsapp}
              {wa ? (
                <>
                  {" · "}
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    escribirle
                  </a>
                </>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{claim.email || "—"}</dd>
          </div>
          <div className="planilla-fact-note">
            <dt>Cómo verificar</dt>
            <dd>{claim.note}</dd>
          </div>
        </dl>

        {pending ? (
          <div className="planilla-actions">
            <fieldset className="planilla-checklist" disabled={busy}>
              <legend>Checklist de prueba — obligatorio para aprobar</legend>
              <label className="planilla-check">
                <input
                  type="checkbox"
                  name="proof_facade"
                  checked={proofFacade}
                  onChange={(e) => setProofFacade(e.target.checked)}
                />
                <span>Foto de fachada / identidad del local verificada</span>
              </label>
              <label className="planilla-check">
                <input
                  type="checkbox"
                  name="proof_nit"
                  checked={proofNit}
                  onChange={(e) => setProofNit(e.target.checked)}
                />
                <span>NIT o razón social verificado</span>
              </label>
              <label className="planilla-call">
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

            <div className="planilla-action-row">
              <form action={approveAction} onSubmit={onApproveSubmit}>
                <input type="hidden" name="claim_id" value={claim.id} />
                <input type="hidden" name="proof_facade" value={proofFacade ? "1" : "0"} />
                <input type="hidden" name="proof_nit" value={proofNit ? "1" : "0"} />
                <input type="hidden" name="proof_call_note" value={proofCallNote} />
                <button type="submit" className="btn-flood" disabled={busy || !proofReady}>
                  {approvePending ? "Aprobando…" : "Aprobar y asignar"}
                </button>
              </form>
              <details className="planilla-reject">
                <summary className="planilla-reject-summary">Rechazar</summary>
                <form action={rejectAction} className="planilla-reject-form">
                  <input type="hidden" name="claim_id" value={claim.id} />
                  <label>
                    <span className="sr-only">Motivo del rechazo</span>
                    <input
                      type="text"
                      name="reason"
                      maxLength={300}
                      placeholder="Motivo (se le avisa al reclamante)"
                      disabled={busy}
                    />
                  </label>
                  <button type="submit" className="btn-bib" disabled={busy}>
                    Confirmar rechazo
                  </button>
                </form>
              </details>
            </div>
            {!proofReady && !checklistError ? (
              <p className="planilla-hint">Habilitás “Aprobar” marcando una prueba.</p>
            ) : null}
            {checklistError ? <p className="form-error">{checklistError}</p> : null}
            {approveState?.error ? <p className="form-error">{approveState.error}</p> : null}
            {rejectState?.error ? <p className="form-error">{rejectState.error}</p> : null}
          </div>
        ) : (
          <div className="planilla-actions">
            {claim.status === "approved" ? <ProofSummary claim={claim} /> : null}
            {claim.status === "rejected" && claim.reject_reason ? (
              <p className="planilla-reject-reason">Motivo: {claim.reject_reason}</p>
            ) : null}
            <a
              href={notifyHref(claim, claim.status === "approved" ? "approved" : "rejected")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Avisar por WhatsApp
            </a>
          </div>
        )}
        </div>
      </details>
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
      <div className="admin-empty" role="status">
        <p className="admin-empty-title">Cola vacía</p>
        <p>
          No hay reclamos para esta vista. Cuando un dueño reclame una cancha, la planilla
          aparece acá con la prueba cargada.
        </p>
      </div>
    );
  }

  return (
    <ul className="planilla-list">
      {claims.map((claim) => (
        <ClaimRow key={claim.id} claim={claim} timezone={timezone} />
      ))}
    </ul>
  );
}
