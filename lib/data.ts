import { cache } from "react";
import { cookies } from "next/headers";
import { CITY_COOKIE, DEFAULT_CITY_SLUG } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { MatchDetail } from "@/lib/types";

export type { City, Venue, Profile, Match, MatchSlot, SlotClaim, MatchDetail } from "@/lib/types";
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
  const { data, error } = await supabase
    .from("matches")
    .select(matchSelect)
    .eq("city_id", cityId)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at");
  if (error) {
    throw error;
  }
  return (data ?? []) as MatchDetail[];
});

export const getMatchByCode = cache(async (shareCode: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(matchSelect)
    .eq("share_code", shareCode)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data as MatchDetail | null;
});

export const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    throw error;
  }
  return data;
});

export async function getSessionUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}
