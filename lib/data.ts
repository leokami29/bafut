import { cache } from "react";
import { cookies } from "next/headers";
import { CITY_COOKIE, DEFAULT_CITY_SLUG } from "@/lib/constants";
import { mapDayOccupancyRpcRow } from "@/lib/occupancy";
import { statsFromActivity, type PlayerCardStats } from "@/lib/player-card";
import { createClient } from "@/lib/supabase/server";
import { tryCreateServiceClient } from "@/lib/supabase/admin";
import type { MatchDetail, Profile, ProfileWithContact, VenueWithPremium } from "@/lib/types";
import { venueHasActivePremium } from "@/lib/venue-premium";

export type {
  City,
  Venue,
  VenueWithPremium,
  Profile,
  Match,
  MatchSlot,
  SlotClaim,
  MatchDetail,
  ProfileWithContact,
  ClaimPreviewProfile,
} from "@/lib/types";
export { openSlotCount, slotIsOpen } from "@/lib/types";

const matchSelect = `
  *,
  venues (*),
  cities (*),
  profiles!host_id (id, display_name, avatar_path),
  match_slots (
    *,
    slot_claims (
      *,
      profiles (id, display_name, avatar_path)
    )
  )
`;

/** Detail-only: includes host level-trust counters + claim preview fields. Do not use on radar feed. */
const matchDetailSelect = `
  *,
  venues (*),
  cities (*),
  profiles!host_id (id, display_name, avatar_path, level_feedback_count, level_ok_count),
  match_slots (
    *,
    slot_claims (
      *,
      profiles (
        id,
        display_name,
        avatar_path,
        card_share_code,
        preferred_sport,
        preferred_position,
        preferred_format,
        level,
        terms_accepted_at
      )
    )
  )
`;

export const getCities = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cities").select("*").order("name");
  if (error) {
    throw error;
  }
  return data;
});

export const getCityBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cities").select("*").eq("slug", slug).maybeSingle();
  if (error) {
    throw error;
  }
  return data;
});

export async function getActiveCity() {
  const jar = await cookies();
  const slug = jar.get(CITY_COOKIE)?.value ?? DEFAULT_CITY_SLUG;
  const [requested, fallback] = await Promise.all([
    getCityBySlug(slug),
    slug === DEFAULT_CITY_SLUG ? Promise.resolve(null) : getCityBySlug(DEFAULT_CITY_SLUG),
  ]);
  return requested ?? fallback;
}

export const getVenuesByCity = cache(async (cityId: string): Promise<VenueWithPremium[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select(
      `
      *,
      venue_subscriptions (
        status,
        plan,
        expires_at
      )
    `,
    )
    .eq("city_id", cityId)
    .is("deleted_at", null)
    .order("neighborhood")
    .order("name");
  if (error) {
    throw error;
  }
  return (data ?? []).map(({ venue_subscriptions, ...venue }) => ({
    ...venue,
    is_premium: venueHasActivePremium(venue_subscriptions),
  }));
});

export const getVenueBySlug = cache(
  async (cityId: string, slug: string): Promise<VenueWithPremium | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("venues")
      .select(
        `
      *,
      venue_subscriptions (
        status,
        plan,
        expires_at
      )
    `,
      )
      .eq("city_id", cityId)
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }
    const { venue_subscriptions, ...venue } = data;
    return {
      ...venue,
      is_premium: venueHasActivePremium(venue_subscriptions),
    };
  },
);

export const getUpcomingMatches = cache(async (cityId: string) => {
  const supabase = await createClient();
  const { data: ids, error: rpcError } = await supabase.rpc("list_upcoming_open_match_ids", {
    p_city_id: cityId,
    p_limit: 50,
  });
  if (rpcError) {
    throw rpcError;
  }
  const matchIds = ids ?? [];
  if (matchIds.length === 0) {
    return [] as MatchDetail[];
  }

  const { data, error } = await supabase
    .from("matches")
    .select(matchSelect)
    .in("id", matchIds)
    .order("starts_at");
  if (error) {
    throw error;
  }

  const byId = new Map((data ?? []).map((row) => [row.id, row as MatchDetail]));
  return matchIds.map((id) => byId.get(id)).filter((row): row is MatchDetail => Boolean(row));
});

export const getMatchByCode = cache(async (shareCode: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(matchDetailSelect)
    .eq("share_code", shareCode)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data as MatchDetail | null;
});

/** Partidos armados por el host (excluye cancelados). Solo para señal en detalle. */
export const getHostMatchCount = cache(async (hostId: string) => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("host_id", hostId)
    .neq("status", "cancelled");
  if (error) {
    throw error;
  }
  return count ?? 0;
});

export const getProfile = cache(async (userId: string): Promise<ProfileWithContact | null> => {
  const supabase = await createClient();
  const [{ data: profile, error }, { data: contact }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("profile_contacts").select("whatsapp").eq("user_id", userId).maybeSingle(),
  ]);
  if (error) {
    throw error;
  }
  if (!profile) {
    return null;
  }
  return { ...profile, whatsapp: contact?.whatsapp ?? null };
});

export type PublicPlayerCard = {
  profile: Profile;
  cityName: string | null;
  stats: PlayerCardStats;
};

/** Carta pública por código corto — sin WhatsApp ni contacto. */
export const getPublicPlayerCardByCode = cache(async (cardCode: string): Promise<PublicPlayerCard | null> => {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("card_share_code", cardCode)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!profile) {
    return null;
  }

  const [stats, cityResult] = await Promise.all([
    getPlayerCardStats(profile.id),
    profile.city_id
      ? supabase.from("cities").select("name").eq("id", profile.city_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (cityResult.error) {
    throw cityResult.error;
  }

  return {
    profile: profile as Profile,
    cityName: cityResult.data?.name ?? null,
    stats,
  };
});

/** Canchas públicas de la ciudad del jugador filtradas por su deporte (para "Dónde jugar"). */
export const getVenuesForPlayerSport = cache(
  async (cityId: string | null, sport: string | null, limit = 6): Promise<VenueWithPremium[]> => {
    if (!cityId || !sport) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("venues")
      .select(
        `
        *,
        venue_subscriptions (
          status,
          plan,
          expires_at
        )
      `,
      )
      .eq("city_id", cityId)
      .is("deleted_at", null)
      .contains("sports", [sport])
      .order("is_verified", { ascending: false })
      .order("name")
      .limit(limit);
    if (error) {
      throw error;
    }
    return (data ?? []).map(({ venue_subscriptions, ...venue }) => ({
      ...venue,
      is_premium: venueHasActivePremium(venue_subscriptions),
    }));
  },
);

export type PlayerRecentMatch = {
  id: string;
  share_code: string;
  starts_at: string;
  sport: string;
  format: string;
  status: string;
  venue_name: string;
  venue_slug: string;
  city_timezone: string;
  hosted: boolean;
};

/** Partidos recientes del jugador (host o cupo aceptado), más nuevos primero. */
export const getPlayerRecentMatches = cache(
  async (userId: string, limit = 6): Promise<PlayerRecentMatch[]> => {
    const supabase = await createClient();
    const lookback = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: hostedRows, error: hostedError }, { data: claimRows, error: claimError }] =
      await Promise.all([
        supabase
          .from("matches")
          .select("id, share_code, starts_at, sport, format, status, venues(name, slug), cities(timezone)")
          .eq("host_id", userId)
          .neq("status", "cancelled")
          .gte("starts_at", lookback)
          .order("starts_at", { ascending: false })
          .limit(limit),
        supabase
          .from("slot_claims")
          .select(
            "match_id, matches!inner(id, share_code, starts_at, sport, format, status, venues(name, slug), cities(timezone))",
          )
          .eq("player_id", userId)
          .eq("status", "accepted")
          .gte("matches.starts_at", lookback)
          .order("created_at", { ascending: false })
          .limit(limit),
      ]);
    if (hostedError) throw hostedError;
    if (claimError) throw claimError;

    const out = new Map<string, PlayerRecentMatch>();

    for (const row of hostedRows ?? []) {
      const venue = Array.isArray(row.venues) ? row.venues[0] : row.venues;
      const city = Array.isArray(row.cities) ? row.cities[0] : row.cities;
      out.set(row.id, {
        id: row.id,
        share_code: row.share_code,
        starts_at: row.starts_at,
        sport: row.sport,
        format: row.format,
        status: row.status,
        venue_name: venue?.name ?? "Cancha",
        venue_slug: venue?.slug ?? "",
        city_timezone: city?.timezone ?? "America/Bogota",
        hosted: true,
      });
    }

    for (const row of claimRows ?? []) {
      const match = Array.isArray(row.matches) ? row.matches[0] : row.matches;
      if (!match || out.has(match.id)) continue;
      const venue = Array.isArray(match.venues) ? match.venues[0] : match.venues;
      const city = Array.isArray(match.cities) ? match.cities[0] : match.cities;
      out.set(match.id, {
        id: match.id,
        share_code: match.share_code,
        starts_at: match.starts_at,
        sport: match.sport,
        format: match.format,
        status: match.status,
        venue_name: venue?.name ?? "Cancha",
        venue_slug: venue?.slug ?? "",
        city_timezone: city?.timezone ?? "America/Bogota",
        hosted: false,
      });
    }

    return [...out.values()]
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
      .slice(0, limit);
  },
);

function matchFromClaim(row: { matches: unknown }) {
  const match = Array.isArray(row.matches) ? row.matches[0] : row.matches;
  return match as { starts_at?: string; status?: string } | null;
}

export const getPlayerCardStats = cache(async (userId: string): Promise<PlayerCardStats> => {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [{ data: claims }, { data: hosted }, { data: counters }] = await Promise.all([
    supabase
      .from("slot_claims")
      .select("status, matches!inner(starts_at, status)")
      .eq("player_id", userId),
    supabase.from("matches").select("starts_at, status").eq("host_id", userId),
    supabase
      .from("profiles")
      .select("level_ok_count, level_feedback_count")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const accepted = (claims ?? []).filter((claim) => claim.status === "accepted");
  const decided = (claims ?? []).filter(
    (claim) => claim.status === "accepted" || claim.status === "rejected",
  );
  const played = accepted.filter((claim) => {
    const match = matchFromClaim(claim);
    return Boolean(match?.starts_at && match.starts_at < now && match.status !== "cancelled");
  }).length;
  const hostedPlayed = (hosted ?? []).filter(
    (match) => match.starts_at < now && match.status !== "cancelled",
  ).length;

  return statsFromActivity({
    played,
    hosted: hostedPlayed,
    confirmed: accepted.length,
    decidedClaims: decided.length,
    levelOk: counters?.level_ok_count ?? 0,
    levelFeedback: counters?.level_feedback_count ?? 0,
  });
});

export type HostPendingInbox = {
  count: number;
  /** Deep-link al partido con pedidos; cae a la lista si no hay target. */
  href: string;
};

type PendingClaimMatchRow = {
  id: string;
  created_at: string;
  matches:
    | { host_id: string; share_code: string; starts_at: string; status: string }
    | { host_id: string; share_code: string; starts_at: string; status: string }[]
    | null;
};

function pendingClaimMatch(
  row: PendingClaimMatchRow,
): { share_code: string; starts_at: string; status: string } | null {
  const match = Array.isArray(row.matches) ? row.matches[0] : row.matches;
  if (!match?.share_code) return null;
  return match;
}

/** Pedidos pendientes del host + deep-link al partido (#cupos) más urgente. */
export const getHostPendingInbox = cache(async (userId: string): Promise<HostPendingInbox> => {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("slot_claims")
    .select("id, created_at, matches!inner(host_id, share_code, starts_at, status)", {
      count: "exact",
    })
    .eq("status", "pending")
    .eq("matches.host_id", userId)
    .order("created_at", { ascending: true })
    .limit(40);
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as PendingClaimMatchRow[];
  const total = count ?? rows.length;
  if (total === 0) {
    return { count: 0, href: "/perfil/partidos" };
  }

  const nowIso = new Date().toISOString();
  const targets = rows
    .map(pendingClaimMatch)
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .filter((m) => m.status !== "cancelled");

  const upcoming = targets
    .filter((m) => m.starts_at > nowIso)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const pick = upcoming[0] ?? [...targets].sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];

  return {
    count: total,
    href: pick ? `/p/${pick.share_code}#cupos` : "/perfil/partidos",
  };
});

export const getHostPendingClaimCount = cache(async (userId: string) => {
  const inbox = await getHostPendingInbox(userId);
  return inbox.count;
});

export const getMyHostedMatches = cache(async (userId: string) => {
  const supabase = await createClient();
  // Look back far enough to cover the post-match level-feedback window (end + 7d).
  const lookbackMs = 8 * 24 * 60 * 60 * 1000;
  const { data, error } = await supabase
    .from("matches")
    .select(matchSelect)
    .eq("host_id", userId)
    .gte("starts_at", new Date(Date.now() - lookbackMs).toISOString())
    .order("starts_at", { ascending: false })
    .limit(40);
  if (error) {
    throw error;
  }
  return (data ?? []) as MatchDetail[];
});

/** Ocupaciones open de una cancha en un rango [dayStart, dayEnd). */
export const getVenueDayOccupancy = cache(
  async (venueId: string, dayStartIso: string, dayEndIso: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_venue_day_occupancy", {
      p_venue_id: venueId,
      p_day_start: dayStartIso,
      p_day_end: dayEndIso,
    });
    if (error) {
      throw error;
    }
    return (data ?? []).map((row) => mapDayOccupancyRpcRow(row));
  },
);

/** Claim ids for which the user already submitted level feedback. */
export const getSubmittedLevelFeedbackClaimIds = cache(async (userId: string, claimIds: string[]) => {
  if (claimIds.length === 0) {
    return new Set<string>();
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_level_feedback")
    .select("claim_id")
    .eq("from_user_id", userId)
    .in("claim_id", claimIds);
  if (error) {
    throw error;
  }
  return new Set((data ?? []).map((row) => row.claim_id));
});

export const getMyClaimedMatches = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase
    .from("slot_claims")
    .select("id, status, match_id, created_at")
    .eq("player_id", userId)
    .in("status", ["pending", "accepted", "rejected", "withdrawn"])
    .order("created_at", { ascending: false })
    .limit(40);
  if (claimsError) {
    throw claimsError;
  }
  const matchIds = [...new Set((claims ?? []).map((c) => c.match_id))];
  if (matchIds.length === 0) {
    return [];
  }
  const { data: matches, error } = await supabase.from("matches").select(matchSelect).in("id", matchIds);
  if (error) {
    throw error;
  }
  const byId = new Map((matches ?? []).map((row) => [row.id, row as MatchDetail]));
  return (claims ?? [])
    .map((claim) => {
      const match = byId.get(claim.match_id);
      if (!match) return null;
      return { claim, match };
    })
    .filter((row): row is { claim: NonNullable<(typeof claims)[number]>; match: MatchDetail } => Boolean(row));
});

export async function getSessionUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

/** ¿Este usuario es editor/admin de BaFut? (RLS: solo puede leer su propia fila). */
export const getIsAdmin = cache(async (userId: string | null): Promise<boolean> => {
  if (!userId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
});

/** Rutas de objeto (bucket venue-photos) subidas por el dueño, en orden. */
export const getVenuePhotoPaths = cache(async (venueId: string): Promise<string[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("venue_photos")
    .select("url")
    .eq("venue_id", venueId)
    .order("sort_order", { ascending: true });
  return (data ?? []).map((row) => row.url);
});

/**
 * Estado de reclamos para el flujo "reclamar cancha":
 * - hasPendingClaim: la cancha tiene ALGÚN reclamo en revisión (visible público por RPC).
 * - ownClaim: último reclamo del usuario sobre esa cancha (RLS: solo ve el propio).
 */
export const getVenueClaimState = cache(async (venueId: string, userId: string | null) => {
  const supabase = await createClient();
  const { data: hasPending } = await supabase.rpc("venue_has_pending_claim", {
    p_venue_id: venueId,
  });

  type OwnClaim = {
    id: string;
    status: string;
    created_at: string;
    reviewed_at: string | null;
    reject_reason: string | null;
  };
  let ownRows: OwnClaim[] | null = null;
  if (userId) {
    const { data } = await supabase
      .from("venue_claims")
      .select("id, status, created_at, reviewed_at, reject_reason")
      .eq("venue_id", venueId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    ownRows = data as OwnClaim[] | null;
  }

  return {
    hasPendingClaim: Boolean(hasPending),
    ownClaim: ownRows?.[0] ?? null,
  };
});

export type OwnedVenue = {
  id: string;
  name: string;
  slug: string;
  neighborhood: string | null;
  sports: string[];
  is_verified: boolean;
  activePlan: string | null;
  subscriptionExpiresAt: string | null;
};

/** Canchas donde el usuario es el dueño asignado (reclamo aprobado). */
export const getOwnedVenues = cache(async (userId: string): Promise<OwnedVenue[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select(
      `id, name, slug, neighborhood, sports, is_verified,
       venue_subscriptions ( plan, status, expires_at )`,
    )
    .eq("owner_id", userId)
    .order("name");
  if (error) {
    throw error;
  }
  return (data ?? []).map((venue) => {
    const subs = (venue.venue_subscriptions ?? []) as Array<{
      plan: string;
      status: string;
      expires_at: string;
    }>;
    const active = subs
      .filter((s) => s.status === "active" && new Date(s.expires_at).getTime() > Date.now())
      .sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0];
    return {
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      neighborhood: venue.neighborhood,
      sports: venue.sports,
      is_verified: venue.is_verified,
      activePlan: active?.plan ?? null,
      subscriptionExpiresAt: active?.expires_at ?? null,
    };
  });
});

export type UserVenueClaim = {
  id: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reject_reason: string | null;
  venue: { name: string; slug: string } | null;
};

/** Historial de reclamos del usuario sobre canchas (RLS: solo los propios). */
export const getUserVenueClaims = cache(async (userId: string): Promise<UserVenueClaim[]> => {  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venue_claims")
    .select(
      `id, status, created_at, reviewed_at, reject_reason,
       venues ( name, slug )`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
    reject_reason: row.reject_reason,
    venue: row.venues as { name: string; slug: string } | null,
  }));
});

/** Contadores para el acceso "Mis canchas" en el perfil. */
export const getVenueOwnerSummary = cache(async (userId: string) => {
  const supabase = await createClient();
  const [owned, pending] = await Promise.all([
    supabase.from("venues").select("id", { count: "exact", head: true }).eq("owner_id", userId),
    supabase
      .from("venue_claims")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending"),
  ]);
  return {
    ownedCount: owned.count ?? 0,
    pendingCount: pending.count ?? 0,
  };
});

export type VenuePublicPriceSlot = {
  id: string;
  sport: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  price_cop: number;
};

export type VenuePublicPricingDefault = {
  sport: string;
  day_of_week: number;
  default_price_cop: number;
};

export type VenuePublicPromotion = {
  id: string;
  sport: string;
  name: string;
  kind: "override_slot" | "discount_pct";
  override_price_cop: number | null;
  discount_pct: number | null;
  start_time: string | null;
  end_time: string | null;
  days_of_week: number[] | null;
  date_start: string | null;
  date_end: string | null;
  lead_time_minutes: number;
};

export type VenuePublicPricing = {
  slots: VenuePublicPriceSlot[];
  defaults: VenuePublicPricingDefault[];
  mins: Array<{ sport: string; min_minutes: number }>;
  promotions: VenuePublicPromotion[];
};

/** Precios públicos de una cancha (RLS: SELECT para anon/authenticated). */
export const getVenuePublicPricing = cache(async (venueId: string): Promise<VenuePublicPricing> => {
  const supabase = await createClient();
  const [{ data: slots }, { data: mins }, { data: defaults }, { data: promotions }] =
    await Promise.all([
      supabase
        .from("venue_price_slots")
        .select("id, sport, day_of_week, start_time, end_time, price_cop")
        .eq("venue_id", venueId)
        .order("day_of_week")
        .order("start_time"),
      supabase.from("venue_pricing_min").select("sport, min_minutes").eq("venue_id", venueId),
      supabase
        .from("venue_pricing_default")
        .select("sport, day_of_week, default_price_cop")
        .eq("venue_id", venueId),
      supabase
        .from("venue_promotions")
        .select(
          "id, sport, name, kind, override_price_cop, discount_pct, start_time, end_time, days_of_week, date_start, date_end, lead_time_minutes",
        )
        .eq("venue_id", venueId)
        .eq("active", true)
        .order("created_at", { ascending: false }),
    ]);

  return {
    slots: slots ?? [],
    defaults: defaults ?? [],
    mins: mins ?? [],
    promotions: (promotions ?? []).map((p) => ({
      ...p,
      kind: p.kind as "override_slot" | "discount_pct",
    })),
  };
});

export type HomeCommunityStats = {
  totalUsers: number;
  totalSlots: number;
  openSlots: number;
  totalMatches: number;
  totalVenues: number;
  publicVenues: number;
  privateVenues: number;
  totalTournaments: number;
  activeTournaments: number;
  sports: {
    padel: number;
    futbol: number;
    basquet: number;
    voleibol: number;
  };
};

export const getHomeCommunityStats = cache(
  async (cityId?: string): Promise<HomeCommunityStats> => {
    const supabase = tryCreateServiceClient() ?? (await createClient());

    let venuesQ = supabase
      .from("venues")
      .select("id, venue_kind, sports, city_id")
      .is("deleted_at", null);
    let matchesQ = supabase
      .from("matches")
      .select("id", { count: "exact", head: true });
    let slotsQ = supabase
      .from("match_slots")
      .select("id", { count: "exact", head: true });
    let profilesQ = supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    let tournamentsQ = supabase
      .from("tournaments")
      .select("id, status, visibility, venue_id");

    if (cityId) {
      venuesQ = venuesQ.eq("city_id", cityId);
      matchesQ = matchesQ.eq("city_id", cityId);
    }

    const [
      { data: venuesData },
      { count: matchesCount },
      { count: slotsCount },
      { count: profilesCount },
      { data: tournamentsData },
    ] = await Promise.all([
      venuesQ,
      matchesQ,
      slotsQ,
      profilesQ,
      tournamentsQ,
    ]);

    const venues = venuesData ?? [];
    const totalVenues = venues.length;
    const publicVenues = venues.filter((v) => v.venue_kind === "publica").length;
    const privateVenues = venues.filter((v) => v.venue_kind !== "publica").length;

    const padelVenues = venues.filter((v) => v.sports?.includes("padel")).length;
    const futbolVenues = venues.filter((v) =>
      v.sports?.some((s) => s === "futbol" || s === "futbol_sala"),
    ).length;
    const basquetVenues = venues.filter((v) => v.sports?.includes("basquet")).length;
    const voleibolVenues = venues.filter((v) => v.sports?.includes("voleibol")).length;

    const tournaments = tournamentsData ?? [];
    const venueIds = new Set(venues.map((v) => v.id));
    const filteredTournaments = cityId
      ? tournaments.filter((t) => venueIds.has(t.venue_id))
      : tournaments;
    const publishedTournaments = filteredTournaments.filter(
      (t) => t.visibility === "published",
    );
    const activeTournaments = publishedTournaments.filter(
      (t) => t.status === "active" || t.status === "registration",
    );

    return {
      totalUsers: profilesCount ?? 0,
      totalSlots: slotsCount ?? 0,
      openSlots: slotsCount ?? 0,
      totalMatches: matchesCount ?? 0,
      totalVenues,
      publicVenues,
      privateVenues,
      totalTournaments: publishedTournaments.length,
      activeTournaments: activeTournaments.length,
      sports: {
        padel: padelVenues,
        futbol: futbolVenues,
        basquet: basquetVenues,
        voleibol: voleibolVenues,
      },
    };
  },
);

