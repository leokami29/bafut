import type { Tables } from "@/lib/database.types";

export type City = Tables<"cities">;
export type Venue = Tables<"venues">;
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

export function pendingClaimCountForHost(match: Pick<MatchDetail, "match_slots">) {
  return match.match_slots.reduce(
    (sum, slot) => sum + slot.slot_claims.filter((claim) => claim.status === "pending").length,
    0,
  );
}
