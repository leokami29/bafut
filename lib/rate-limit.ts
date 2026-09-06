/**
 * Helpers compartidos para mensajes de rate limit (claim / upload / subscribe).
 * Los límites reales viven en Postgres (`private.assert_rate_limit`).
 * A2 (pago manual): en el RPC de solicitud premium usar scope `venue_subscribe`
 * (5/hora sugerido) — no tocar forms de pago desde aquí.
 */

export const RATE_LIMIT_SCOPES = {
  venueClaim: "venue_claim",
  venuePhotoUpload: "venue_photo_upload",
  /** Dueño solicita premium (A2). */
  venueSubscribe: "venue_subscribe",
  /** Admin crea suscripción (create_venue_subscription). */
  venueSubscribeAdmin: "venue_subscribe_admin",
} as const;

export function isRateLimitError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /demasiad|espera(r)? un rato|límite|rate.?limit/i.test(message);
}
