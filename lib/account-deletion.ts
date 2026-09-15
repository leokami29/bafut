/** Debe coincidir con el intervalo SQL en schedule_own_account_deletion (30 days). */
export const ACCOUNT_PURGE_DAYS = 30;

export const DELETED_PLAYER_LABEL = "Jugador eliminado";

export type AccountDeletionFields = {
  deletion_scheduled_at?: string | null;
  purge_at?: string | null;
  deleted_at?: string | null;
  display_name?: string | null;
};

export function isProfilePurged(profile: AccountDeletionFields): boolean {
  return profile.deleted_at != null;
}

export function isDeletionScheduled(profile: AccountDeletionFields): boolean {
  return (
    !isProfilePurged(profile) &&
    profile.deletion_scheduled_at != null &&
    profile.purge_at != null
  );
}

export function canCancelAccountDeletion(profile: AccountDeletionFields, now = new Date()): boolean {
  if (!isDeletionScheduled(profile) || !profile.purge_at) return false;
  return new Date(profile.purge_at) > now;
}

/** Lógica espejo de schedule_own_account_deletion (idempotencia de purge_at). */
export function resolvePurgeSchedule(
  existing: Pick<AccountDeletionFields, "deletion_scheduled_at" | "purge_at">,
  now = new Date(),
): { deletion_scheduled_at: string; purge_at: string } {
  if (existing.deletion_scheduled_at && existing.purge_at) {
    return {
      deletion_scheduled_at: existing.deletion_scheduled_at,
      purge_at: existing.purge_at,
    };
  }
  const scheduled = now.toISOString();
  const purge = new Date(now.getTime() + ACCOUNT_PURGE_DAYS * 86_400_000).toISOString();
  return { deletion_scheduled_at: scheduled, purge_at: purge };
}

export function displayNameForProfile(
  profile: Pick<AccountDeletionFields, "display_name" | "deleted_at">,
): string {
  if (isProfilePurged(profile)) {
    return DELETED_PLAYER_LABEL;
  }
  return profile.display_name?.trim() || DELETED_PLAYER_LABEL;
}

export function formatPurgeDate(purgeAt: string, locale = "es-CO"): string {
  return new Date(purgeAt).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}

export const SOLE_ADMIN_DELETION_ERROR =
  "Sos el único administrador de BaFut. Designá otro admin antes de eliminar tu cuenta.";
