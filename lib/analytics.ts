/**
 * Lightweight GA4 event helper.
 * No-op when the measurement ID is missing or window.gtag is unavailable.
 */
export function trackEvent(name: string, params?: Record<string, string | number>) {
  if (
    typeof window === "undefined" ||
    !process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ||
    typeof window.gtag !== "function"
  ) {
    return;
  }
  window.gtag("event", name, params);
}

/** Funnel monetización B2B (A5) + Pedir turno. Nombres estables para GA4. */
export const FUNNEL_EVENTS = {
  venue_claim_submit: "venue_claim_submit",
  premium_paywall_view: "premium_paywall_view",
  nequi_proof_submit: "nequi_proof_submit",
  sub_activated: "sub_activated",
  turno_start: "turno_start",
  turno_proof_submit: "turno_proof_submit",
  turno_approved: "turno_approved",
} as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[keyof typeof FUNNEL_EVENTS];

/** Dueño envía reclamo de cancha (moderación). */
export function trackVenueClaimSubmit(params: {
  venue_id: string;
  venue_slug?: string;
}) {
  trackEvent(FUNNEL_EVENTS.venue_claim_submit, params);
}

/**
 * Vista del paywall premium (solicitud / Nequi).
 * Listo para A2 — llamar al montar la UI de pago del dueño.
 */
export function trackPremiumPaywallView(params: {
  venue_id: string;
  venue_slug?: string;
  plan?: string;
}) {
  trackEvent(FUNNEL_EVENTS.premium_paywall_view, params);
}

/**
 * Dueño sube comprobante Nequi/banco.
 * Listo para A2 — llamar tras submit exitoso del proof.
 */
export function trackNequiProofSubmit(params: {
  venue_id: string;
  venue_slug?: string;
  plan?: string;
}) {
  trackEvent(FUNNEL_EVENTS.nequi_proof_submit, params);
}

/** Admin (o approve de A2) activa suscripción. */
export function trackSubActivated(params: {
  venue_id: string;
  plan: string;
  payment_method?: string;
}) {
  trackEvent(FUNNEL_EVENTS.sub_activated, params);
}

/** Jugador abre /turno (inicio del funnel). */
export function trackTurnoStart(params: {
  venue_id: string;
  venue_slug?: string;
}) {
  trackEvent(FUNNEL_EVENTS.turno_start, params);
}

/** Jugador envía pedido con comprobante (submit_venue_booking ok). */
export function trackTurnoProofSubmit(params: {
  venue_id: string;
  venue_slug?: string;
  sport?: string;
  duration_min?: number;
}) {
  trackEvent(FUNNEL_EVENTS.turno_proof_submit, params);
}

/** Dueño aprueba el turno. */
export function trackTurnoApproved(params: {
  venue_id: string;
  venue_slug?: string;
  booking_id?: string;
}) {
  trackEvent(FUNNEL_EVENTS.turno_approved, params);
}
