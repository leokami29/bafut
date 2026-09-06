import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { normalizeWhatsapp } from "@/lib/whatsapp-contact";

export type ClaimVenueInput = {
  whatsapp: string;
  email?: string;
  note: string;
};

export type ClaimProofChecklistInput = {
  proofFacade: boolean;
  proofNit: boolean;
  proofCallNote: string;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CO_MOBILE_RE = /^573\d{9}$/;
const NOTE_MIN = 10;
const NOTE_MAX = 500;
const CALL_NOTE_MIN = 5;
const CALL_NOTE_MAX = 500;

/** Días de espera tras un rechazo antes de poder reclamar de nuevo la misma cancha. */
export const CLAIM_REJECT_COOLDOWN_DAYS = 7;

/** Espejo client de las validaciones del RPC claim_venue (la DB manda igual). */
export function validateClaimInput(
  input: ClaimVenueInput,
): { error: string } | { ok: true; whatsapp: string; email: string | null; note: string } {
  const normalized = normalizeWhatsapp(input.whatsapp);
  const whatsapp = normalized && CO_MOBILE_RE.test(normalized) ? normalized : "";
  if (!whatsapp) {
    return { error: "Poné un WhatsApp colombiano válido (ej: 3001234567)." };
  }

  const email = input.email?.trim().toLowerCase() ?? "";
  if (email && !EMAIL_RE.test(email)) {
    return { error: "Ese correo no parece válido." };
  }

  const note = input.note.trim();
  if (note.length < NOTE_MIN) {
    return { error: `Contanos cómo verificar que sos el dueño (mínimo ${NOTE_MIN} caracteres).` };
  }
  if (note.length > NOTE_MAX) {
    return { error: `El mensaje es muy largo (máximo ${NOTE_MAX} caracteres).` };
  }

  return { ok: true, whatsapp, email: email || null, note };
}

/**
 * Checklist de prueba en moderación: al menos foto fachada, NIT/razón social
 * o nota de llamada (espejo del RPC approve_venue_claim).
 */
export function validateClaimProofChecklist(
  input: ClaimProofChecklistInput,
):
  | { error: string }
  | { ok: true; proofFacade: boolean; proofNit: boolean; proofCallNote: string | null } {
  const proofFacade = Boolean(input.proofFacade);
  const proofNit = Boolean(input.proofNit);
  const proofCallNote = input.proofCallNote.trim();

  if (proofCallNote && proofCallNote.length < CALL_NOTE_MIN) {
    return { error: `La nota de llamada debe tener al menos ${CALL_NOTE_MIN} caracteres.` };
  }
  if (proofCallNote.length > CALL_NOTE_MAX) {
    return { error: `La nota de llamada es muy larga (máximo ${CALL_NOTE_MAX} caracteres).` };
  }

  if (!proofFacade && !proofNit && !proofCallNote) {
    return {
      error:
        "Antes de aprobar, marcá al menos una prueba: foto de fachada, NIT/razón social, o dejá nota de la llamada.",
    };
  }

  return {
    ok: true,
    proofFacade,
    proofNit,
    proofCallNote: proofCallNote || null,
  };
}

export function claimStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "En revisión";
    case "approved":
      return "Aprobado";
    case "rejected":
      return "Rechazado";
    default:
      return status;
  }
}

/** ISO del corte para la cola admin: pendientes + resueltos desde hace `hours`. */
export function recentReviewCutoffIso(hours = 24): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/** Fin del cooldown tras un rechazo (reviewed_at + CLAIM_REJECT_COOLDOWN_DAYS). */
export function claimCooldownEndsAt(reviewedAt: string): Date {
  const end = new Date(reviewedAt);
  end.setTime(end.getTime() + CLAIM_REJECT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  return end;
}

export function isClaimInCooldown(reviewedAt: string | null | undefined, now = new Date()): boolean {
  if (!reviewedAt) return false;
  return claimCooldownEndsAt(reviewedAt).getTime() > now.getTime();
}

export function formatClaimCooldownUntil(
  reviewedAt: string,
  timezone = "America/Bogota",
): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(claimCooldownEndsAt(reviewedAt));
}

/** Mailto prearmado para disputar ownership cuando la cancha ya tiene dueño. */
export function venueOwnershipDisputeMailto(opts: {
  venueName: string;
  venueSlug: string;
  siteOrigin?: string;
}): string {
  const path = `/canchas/${opts.venueSlug}`;
  const url = opts.siteOrigin ? `${opts.siteOrigin.replace(/\/$/, "")}${path}` : path;
  const subject = `Disputa de titularidad: ${opts.venueName}`;
  const body = [
    `Hola BaFut,`,
    ``,
    `Quiero disputar la titularidad de la ficha de cancha "${opts.venueName}".`,
    `Link: ${url}`,
    ``,
    `Motivo / prueba (foto fachada, NIT o datos de contacto de la recepción):`,
    ``,
    `Mi WhatsApp:`,
  ].join("\n");

  return `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
