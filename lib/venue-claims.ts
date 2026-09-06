import { normalizeWhatsapp } from "@/lib/whatsapp-contact";

export type ClaimVenueInput = {
  whatsapp: string;
  email?: string;
  note: string;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CO_MOBILE_RE = /^573\d{9}$/;
const NOTE_MIN = 10;
const NOTE_MAX = 500;

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
