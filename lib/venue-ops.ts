/** Helpers e-ops: expiración de subs y soft-delete de canchas (testables). */

export function shouldExpireSubscription(
  sub: { status: string; expires_at: string },
  nowMs: number = Date.now(),
): boolean {
  return sub.status === "active" && new Date(sub.expires_at).getTime() < nowMs;
}

/** Cancha visible en listados públicos (directorio, ficha por slug). */
export function isVenuePubliclyListed(venue: { deleted_at: string | null }): boolean {
  return venue.deleted_at == null;
}

export function filterPublicVenues<T extends { deleted_at: string | null }>(venues: T[]): T[] {
  return venues.filter(isVenuePubliclyListed);
}
