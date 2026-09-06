import { whatsappChatHref } from "@/lib/whatsapp-contact";

export type RenewalReminderType = "t7" | "t1";

export type RenewalCandidate = {
  subscription_id: string;
  venue_id: string;
  expires_at: string;
  plan: string;
  reminder_type: RenewalReminderType;
  due_at: string;
};

/** Ventanas: T-7 = [6.5d, 7.5d], T-1 = [0.5d, 1.5d] desde ahora hasta expires_at. */
export function renewalWindows(now = new Date()) {
  const ms = now.getTime();
  const day = 24 * 60 * 60 * 1000;
  return {
    t7: {
      from: new Date(ms + 6.5 * day),
      to: new Date(ms + 7.5 * day),
    },
    t1: {
      from: new Date(ms + 0.5 * day),
      to: new Date(ms + 1.5 * day),
    },
  };
}

export function classifyRenewalType(
  expiresAtIso: string,
  now = new Date(),
): RenewalReminderType | null {
  const windows = renewalWindows(now);
  const exp = new Date(expiresAtIso);
  if (exp >= windows.t7.from && exp <= windows.t7.to) return "t7";
  if (exp >= windows.t1.from && exp <= windows.t1.to) return "t1";
  return null;
}

export function renewalWhatsAppMessage(input: {
  venueName: string;
  expiresAt: string;
  reminderType: RenewalReminderType;
  adminWa?: string | null;
}) {
  const when = new Date(input.expiresAt).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
  const label = input.reminderType === "t7" ? "en ~7 días" : "mañana";
  return (
    `Hola — tu plan Premium de *${input.venueName}* en BaFut vence ${label} (${when}). ` +
    `Si querés renovar, respondé este mensaje o pedí el comprobante Nequi/banco.`
  );
}

export function renewalWhatsAppHref(phoneDigits: string, message: string) {
  return whatsappChatHref(phoneDigits, message);
}

/** Preferencia de canal: WhatsApp si hay teléfono; email solo con Resend; si no, admin_queue. */
export function pickRenewalChannel(input: {
  whatsapp: string | null | undefined;
  email: string | null | undefined;
  resendConfigured: boolean;
}): "whatsapp" | "email" | "admin_queue" {
  if (input.whatsapp) return "whatsapp";
  if (input.resendConfigured && input.email) return "email";
  return "admin_queue";
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}
