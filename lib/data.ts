import { cache } from "react";
import { cookies } from "next/headers";
import { CITY_COOKIE, DEFAULT_CITY_SLUG } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { MatchDetail, ProfileWithContact } from "@/lib/types";

export type { City, Venue, Profile, Match, MatchSlot, SlotClaim, MatchDetail, ProfileWithContact } from "@/lib/types";
export { openSlotCount, slotIsOpen } from "@/lib/types";

const matchSelect = `
  *,
  venues (*),
  cities (*),
  profiles!host_id (id, display_name),
  match_slots (
    *,
    slot_claims (
      *,
      profiles (id, display_name)
    )
  )
`;

/** Detail-only: includes host level-trust counters. Do not use on radar feed. */
const matchDetailSelect = `
  *,
  venues (*),
  cities (*),
  profiles!host_id (id, display_name, level_feedback_count, level_ok_count),
  match_slots (
    *,
    slot_claims (
      *,
      profiles (id, display_name)
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

export const getVenuesByCity = cache(async (cityId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("city_id", cityId)
    .order("neighborhood")
    .order("name");
  if (error) {
    throw error;
  }
  return data;
});

export const getVenueBySlug = cache(async (cityId: string, slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("city_id", cityId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
});

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

export const getHostPendingClaimCount = cache(async (userId: string) => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("slot_claims")
    .select("id, matches!inner(host_id)", { count: "exact", head: true })
    .eq("status", "pending")
    .eq("matches.host_id", userId);
  if (error) {
    throw error;
  }
  return count ?? 0;
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
