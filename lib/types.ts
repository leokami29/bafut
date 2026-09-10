import type { Tables } from "@/lib/database.types";

export type City = Tables<"cities">;
export type Venue = Tables<"venues">;
/** Venue del directorio con flag de suscripción premium activa. */
export type VenueWithPremium = Venue & { is_premium: boolean };
export type Profile = Tables<"profiles">;
export type ProfileWithContact = Profile & { whatsapp: string | null };
export type Match = Tables<"matches">;
export type MatchSlot = Tables<"match_slots">;
export type SlotClaim = Tables<"slot_claims">;

export type ClaimWithPlayer = SlotClaim & {
  profiles: Pick<Profile, "id" | "display_name"> | null;
};

export type SlotWithClaims = MatchSlot & {
  slot_claims: ClaimWithPlayer[];
};

export type MatchDetail = Match & {
  venues: Venue;
  cities: City;
  /** Feed omit level counters; match detail may include them for the host badge. */
  profiles: Pick<Profile, "id" | "display_name"> &
    Partial<Pick<Profile, "level_feedback_count" | "level_ok_count">>;
  match_slots: SlotWithClaims[];
};

export function slotIsOpen(slot: SlotWithClaims) {
  return !slot.slot_claims.some((claim) => claim.status === "accepted");
}

export function openSlotCount(match: Pick<MatchDetail, "match_slots">) {
  return match.match_slots.filter(slotIsOpen).length;
}

/** Posiciones de cupos aún abiertos (para copy agrupado). */
export function openSlotPositions(match: Pick<MatchDetail, "match_slots">) {
  return match.match_slots.filter(slotIsOpen).map((slot) => slot.position);
}

export function pendingClaimCountForHost(match: Pick<MatchDetail, "match_slots">) {
  return match.match_slots.reduce(
    (sum, slot) => sum + slot.slot_claims.filter((claim) => claim.status === "pending").length,
    0,
  );
}

export function acceptedClaimCount(match: Pick<MatchDetail, "match_slots">) {
  return match.match_slots.reduce(
    (sum, slot) => sum + slot.slot_claims.filter((claim) => claim.status === "accepted").length,
    0,
  );
}

export function matchCanBeHostEdited(
  match: Pick<Match, "host_id" | "status" | "starts_at">,
  userId: string | null | undefined,
  now = new Date(),
) {
  return (
    Boolean(userId) &&
    match.host_id === userId &&
    match.status === "open" &&
    match.starts_at > now.toISOString()
  );
}

export function slotIsBench(slot: Pick<MatchSlot, "slot_role">) {
  return slot.slot_role === "bench";
}

export function openStarterSlotCount(match: Pick<MatchDetail, "match_slots">) {
  return match.match_slots.filter((s) => !slotIsBench(s) && slotIsOpen(s)).length;
}

export function openBenchSlotCount(match: Pick<MatchDetail, "match_slots">) {
  return match.match_slots.filter((s) => slotIsBench(s) && slotIsOpen(s)).length;
}

export function openSideASlotCount(match: Pick<MatchDetail, "match_slots">) {
  return match.match_slots.filter((s) => s.side !== "b" && slotIsOpen(s)).length;
}

export function openSideBSlotCount(match: Pick<MatchDetail, "match_slots">) {
  return match.match_slots.filter((s) => s.side === "b" && slotIsOpen(s)).length;
}

export function isChallengeMatch(match: Pick<Match, "match_mode">) {
  return match.match_mode === "challenge";
}

export type MatchDisplayState =
  | "cancelled"
  | "challenge_open"
  | "bench_only"
  | "open"
  | "full";

export function matchDisplayStatus(
  match: Pick<MatchDetail, "status" | "match_mode" | "match_slots">,
): MatchDisplayState {
  if (match.status === "cancelled") return "cancelled";
  const totalOpen = openSlotCount(match);
  if (totalOpen === 0) return "full";

  if (isChallengeMatch(match)) {
    const sideBOpen = openSideBSlotCount(match);
    if (sideBOpen > 0) return "challenge_open";
    const benchOpen = openBenchSlotCount(match);
    if (benchOpen > 0) return "bench_only";
    return "full";
  }

  const starterOpen = openStarterSlotCount(match);
  if (starterOpen > 0) return "open";
  const benchOpen = openBenchSlotCount(match);
  if (benchOpen > 0) return "bench_only";
  return "full";
}

