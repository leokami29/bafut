import { describe, expect, it } from "vitest";
import {
  filterMatchesByMode,
  matchFitsProfileLevel,
  selectUpcomingOutsideFilter,
} from "@/lib/match-feed-filters";
import type { MatchDetail } from "@/lib/types";

function slot(
  level: string,
  claimStatus: "accepted" | "pending" | null = null,
): MatchDetail["match_slots"][number] {
  return {
    id: `slot-${level}-${claimStatus ?? "open"}`,
    match_id: "m1",
    position: "mid",
    level,
    pitch_index: 0,
    created_at: "2026-01-01T00:00:00Z",
    slot_role: "starter",
    slot_claims: claimStatus
      ? [
          {
            id: "c1",
            slot_id: "s1",
            player_id: "p1",
            status: claimStatus,
            created_at: "2026-01-01T00:00:00Z",
            profiles: null,
          } as MatchDetail["match_slots"][number]["slot_claims"][number],
        ]
      : [],
  } as MatchDetail["match_slots"][number];
}


describe("matchFitsProfileLevel", () => {
  it("acepta cupo any o del mismo nivel", () => {
    expect(matchFitsProfileLevel({ match_slots: [slot("any")] }, "mid")).toBe(true);
    expect(matchFitsProfileLevel({ match_slots: [slot("mid")] }, "mid")).toBe(true);
  });

  it("rechaza otro nivel y cupos ya tomados", () => {
    expect(matchFitsProfileLevel({ match_slots: [slot("high")] }, "mid")).toBe(false);
    expect(matchFitsProfileLevel({ match_slots: [slot("mid", "accepted")] }, "mid")).toBe(false);
  });

  it("acepta si al menos un cupo abierto encaja", () => {
    expect(
      matchFitsProfileLevel({ match_slots: [slot("high"), slot("any")] }, "low"),
    ).toBe(true);
  });
});

describe("selectUpcomingOutsideFilter", () => {
  const open = [{ id: "hoy-1" }, { id: "hoy-2" }, { id: "manana-1" }, { id: "manana-2" }];

  it("muestra próximos aunque hoy tenga items", () => {
    const inWindow = [{ id: "hoy-1" }, { id: "hoy-2" }];
    expect(selectUpcomingOutsideFilter(open, inWindow, "hoy")).toEqual([
      { id: "manana-1" },
      { id: "manana-2" },
    ]);
  });

  it("vacío fuera de filtros hoy/3h", () => {
    expect(selectUpcomingOutsideFilter(open, [], "noche")).toEqual([]);
  });

  it("respeta el límite", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ id: `f-${i}` }));
    expect(selectUpcomingOutsideFilter(many, [], "3h", 3)).toHaveLength(3);
  });
});

describe("filterMatchesByMode", () => {
  const mPickup = {
    id: "m-pickup",
    match_mode: "pickup",
    match_slots: [slot("any")],
  };
  const mChallenge = {
    id: "m-challenge",
    match_mode: "challenge",
    match_slots: [slot("any")],
  };
  const mBench = {
    id: "m-bench",
    match_mode: "pickup",
    match_slots: [{ ...slot("any"), slot_role: "bench" }],
  };

  it("all devuelve todos los partidos", () => {
    expect(filterMatchesByMode([mPickup, mChallenge, mBench], "all")).toHaveLength(3);
  });

  it("challenge filtra solo los que buscan rival", () => {
    const result = filterMatchesByMode([mPickup, mChallenge, mBench], "challenge");
    expect(result).toEqual([mChallenge]);
  });

  it("bench filtra partidos con cupos de rotación abiertos", () => {
    const result = filterMatchesByMode([mPickup, mChallenge, mBench], "bench");
    expect(result).toEqual([mBench]);
  });

  it("pickup filtra partidos normales de completar", () => {
    const result = filterMatchesByMode([mPickup, mChallenge], "pickup");
    expect(result).toEqual([mPickup]);
  });
});

