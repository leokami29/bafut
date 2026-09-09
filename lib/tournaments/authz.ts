import { venueHasActivePremium } from "@/lib/venue-premium";

export const TOURNAMENT_SPORTS = ["futbol", "voleibol", "basquet", "padel"] as const;
export type TournamentSport = (typeof TOURNAMENT_SPORTS)[number];

export const TOURNAMENT_FORMATS = [
  "single_elim",
  "double_elim",
  "round_robin",
  "groups_knockout",
] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export const TOURNAMENT_STATUSES = [
  "draft",
  "registration",
  "active",
  "completed",
  "archived",
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const VENUE_STAFF_ROLES = ["manager", "scorer"] as const;
export type VenueStaffRole = (typeof VENUE_STAFF_ROLES)[number];

/** Máx. torneos concurrentes (registration|active) por cancha. */
export const MAX_ACTIVE_TOURNAMENTS_PER_VENUE = 2;

/** Límite MVP de equipos/participantes por torneo. */
export const MAX_PARTICIPANTS_PER_TOURNAMENT = 16;

/** Techo duro del schema (potencias de 2 para elim). */
export const MAX_PARTICIPANTS_PER_TOURNAMENT_HARD = 32;

export type VenueStaffRow = {
  venue_id: string;
  user_id: string;
  role: VenueStaffRole;
};

export type AuthzVenueContext = {
  venueId: string;
  ownerId: string | null;
  /** Suscripciones de la cancha (plan/status/expires_at). */
  subscriptions: Array<{ status: string; plan: string; expires_at: string }> | null | undefined;
  /** Filas de venue_staff del usuario para esta cancha (o vacías). */
  staffRows: VenueStaffRow[] | null | undefined;
  isPlatformAdmin?: boolean;
  /** Kill-switch `venue_tournaments` (env/DB). */
  tournamentsFlagEnabled: boolean;
};

function staffRoleFor(
  ctx: AuthzVenueContext,
  userId: string,
): VenueStaffRole | null {
  const row = (ctx.staffRows ?? []).find(
    (s) => s.venue_id === ctx.venueId && s.user_id === userId,
  );
  return row?.role ?? null;
}

export function isVenueOwner(
  ctx: Pick<AuthzVenueContext, "ownerId">,
  userId: string | null | undefined,
) {
  return Boolean(userId && ctx.ownerId && ctx.ownerId === userId);
}

export function hasTournamentPremium(ctx: AuthzVenueContext) {
  return venueHasActivePremium(ctx.subscriptions);
}

/**
 * Puede administrar torneos (crear, seeds, staff, archivar):
 * flag on + premium activo + (owner | manager | platform admin).
 */
export function canManageVenueTournaments(
  ctx: AuthzVenueContext,
  userId: string | null | undefined,
) {
  if (!userId || !ctx.tournamentsFlagEnabled || !hasTournamentPremium(ctx)) return false;
  if (ctx.isPlatformAdmin) return true;
  if (isVenueOwner(ctx, userId)) return true;
  return staffRoleFor(ctx, userId) === "manager";
}

/**
 * Puede cargar acta / confirmar marcador:
 * flag on + premium activo + (owner | manager | scorer | platform admin).
 */
export function canScoreTournament(
  ctx: AuthzVenueContext,
  userId: string | null | undefined,
) {
  if (!userId || !ctx.tournamentsFlagEnabled || !hasTournamentPremium(ctx)) return false;
  if (ctx.isPlatformAdmin) return true;
  if (isVenueOwner(ctx, userId)) return true;
  const role = staffRoleFor(ctx, userId);
  return role === "manager" || role === "scorer";
}

/** Acceso al panel admin de torneos (ver skeleton / paywall), sin exigir premium. */
export function canAccessVenueTournamentsAdmin(
  ctx: Omit<AuthzVenueContext, "tournamentsFlagEnabled" | "subscriptions"> & {
    tournamentsFlagEnabled?: boolean;
    subscriptions?: AuthzVenueContext["subscriptions"];
  },
  userId: string | null | undefined,
) {
  if (!userId) return false;
  if (ctx.isPlatformAdmin) return true;
  if (isVenueOwner(ctx, userId)) return true;
  const role = staffRoleFor(
    {
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      staffRows: ctx.staffRows,
      isPlatformAdmin: ctx.isPlatformAdmin,
      subscriptions: ctx.subscriptions ?? null,
      tournamentsFlagEnabled: ctx.tournamentsFlagEnabled ?? true,
    },
    userId,
  );
  return role === "manager" || role === "scorer";
}

/**
 * Motivo por el que el panel de torneos no deja operar (o `ok`).
 * Orden: rol → flag → premium (para mensajes claros en UI).
 */
export type VenueTournamentsGateReason =
  | "ok"
  | "forbidden"
  | "flag_off"
  | "no_premium";

export function resolveVenueTournamentsGate(
  ctx: AuthzVenueContext,
  userId: string | null | undefined,
): VenueTournamentsGateReason {
  if (!canAccessVenueTournamentsAdmin(ctx, userId)) return "forbidden";
  if (!ctx.tournamentsFlagEnabled) return "flag_off";
  if (!hasTournamentPremium(ctx)) return "no_premium";
  return "ok";
}

/** Copy estable para paywall / bloqueos del admin de torneos. */
export function venueTournamentsGateCopy(reason: VenueTournamentsGateReason): {
  title: string;
  body: string;
  ctaPremium?: boolean;
  ctaFlags?: boolean;
} {
  switch (reason) {
    case "forbidden":
      return {
        title: "Acceso denegado",
        body: "No tenés permisos para administrar torneos de esta cancha. Pedile acceso al dueño o a un manager.",
      };
    case "flag_off":
      return {
        title: "Torneos desactivados",
        body: "El módulo de torneos está apagado a nivel plataforma (flag venue_tournaments). Un admin de BaFut (billing/super) puede activarlo en Mesa → Flags. Tener Premium solo no alcanza mientras el flag esté OFF.",
        ctaFlags: true,
      };
    case "no_premium":
      return {
        title: "Se necesita Premium",
        body: "Los torneos son una función del plan Premium activo. Activá o renová Premium para crear llaves, inscribir equipos y cargar resultados.",
        ctaPremium: true,
      };
    case "ok":
      return {
        title: "Torneos",
        body: "Organizá campeonatos premium con llaves y actas.",
      };
  }
}
