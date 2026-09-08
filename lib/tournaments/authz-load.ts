import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  canManageVenueTournaments,
  type AuthzVenueContext,
  type VenueStaffRole,
} from "@/lib/tournaments/authz";

type Db = SupabaseClient<Database>;

export async function loadVenueTournamentAuthz(
  supabase: Db,
  venueId: string,
  userId: string,
): Promise<AuthzVenueContext & { canManage: boolean }> {
  const tournamentsFlagEnabled = await isFeatureEnabled("venue_tournaments");

  const [
    { data: venue },
    { data: isAdmin },
    { data: staffRows },
    { data: subscriptions },
  ] = await Promise.all([
    supabase.from("venues").select("id, owner_id").eq("id", venueId).maybeSingle(),
    supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("venue_staff")
      .select("venue_id, user_id, role")
      .eq("venue_id", venueId)
      .eq("user_id", userId),
    supabase
      .from("venue_subscriptions")
      .select("plan, status, expires_at")
      .eq("venue_id", venueId),
  ]);

  const ctx: AuthzVenueContext = {
    venueId,
    ownerId: venue?.owner_id ?? null,
    subscriptions: subscriptions ?? [],
    staffRows: (staffRows ?? []).map((r) => ({
      venue_id: r.venue_id,
      user_id: r.user_id,
      role: r.role as VenueStaffRole,
    })),
    isPlatformAdmin: Boolean(isAdmin),
    tournamentsFlagEnabled,
  };

  return {
    ...ctx,
    canManage: canManageVenueTournaments(ctx, userId),
  };
}

/** Atajo vía RPC DB (misma regla que TS). */
export async function rpcCanManageVenueTournaments(
  supabase: Db,
  venueId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_manage_venue_tournaments", {
    p_venue_id: venueId,
  });
  if (error) return false;
  return Boolean(data);
}

/** Atajo vía RPC DB: scorer | manager | owner + premium + flag. */
export async function rpcCanScoreTournament(
  supabase: Db,
  venueId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_score_tournament", {
    p_venue_id: venueId,
  });
  if (error) return false;
  return Boolean(data);
}
