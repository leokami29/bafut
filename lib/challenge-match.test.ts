import { describe, expect, it } from "vitest";
import {
  isChallengeMatch,
  matchDisplayStatus,
  openBenchSlotCount,
  openSideASlotCount,
  openSideBSlotCount,
  openStarterSlotCount,
  type MatchDetail,
} from "@/lib/types";
import {
  parseBenchCount,
  parseMatchMode,
  parseRotationRule,
  parseTeamName,
} from "@/lib/match-write";
import { playersPerSideFromFormat } from "@/lib/formations-catalog";

function makeSlot(
  id: string,
  side: "a" | "b",
  slotRole: "starter" | "bench",
  isClaimed = false,
): MatchDetail["match_slots"][number] {
  return {
    id,
    match_id: "m1",
    position: "mid",
    level: "any",
    pitch_index: null,
    side,
    slot_role: slotRole,
    created_at: "2026-01-01T00:00:00Z",
    slot_claims: isClaimed
      ? [
          {
            id: `claim-${id}`,
            slot_id: id,
            player_id: "p1",
            status: "accepted",
            created_at: "2026-01-01T00:00:00Z",
            profiles: { id: "p1", display_name: "Jugador" },
          } as MatchDetail["match_slots"][number]["slot_claims"][number],
        ]
      : [],
  } as MatchDetail["match_slots"][number];
}

describe("Challenge and Bench Domain Helpers", () => {
  it("cuenta correctamente titulares vs banca", () => {
    const slots = [
      makeSlot("s1", "a", "starter", false),
      makeSlot("s2", "a", "starter", true),
      makeSlot("s3", "a", "bench", false),
      makeSlot("s4", "a", "bench", false),
    ];
    const match = { match_slots: slots };

    expect(openStarterSlotCount(match)).toBe(1);
    expect(openBenchSlotCount(match)).toBe(2);
  });

  it("cuenta correctamente cupos por lado A y lado B", () => {
    const slots = [
      makeSlot("a1", "a", "starter", true),
      makeSlot("b1", "b", "starter", false),
      makeSlot("b2", "b", "starter", false),
      makeSlot("b3", "b", "starter", true),
    ];
    const match = { match_slots: slots };

    expect(openSideASlotCount(match)).toBe(0);
    expect(openSideBSlotCount(match)).toBe(2);
  });

  it("determina si es partido en modo reto", () => {
    expect(isChallengeMatch({ match_mode: "challenge" })).toBe(true);
    expect(isChallengeMatch({ match_mode: "pickup" })).toBe(false);
  });

  it("evalúa matchDisplayStatus para retos, rotación y estándar", () => {
    // Reto abierto con lado B disponible
    const challengeOpen = {
      status: "open",
      match_mode: "challenge",
      match_slots: [makeSlot("b1", "b", "starter", false)],
    };
    expect(matchDisplayStatus(challengeOpen)).toBe("challenge_open");

    // Reto con lado B completo
    const challengeFull = {
      status: "open",
      match_mode: "challenge",
      match_slots: [makeSlot("b1", "b", "starter", true)],
    };
    expect(matchDisplayStatus(challengeFull)).toBe("full");

    // Partido normal donde solo faltan suplentes
    const benchOnly = {
      status: "open",
      match_mode: "pickup",
      match_slots: [
        makeSlot("a1", "a", "starter", true),
        makeSlot("a2", "a", "bench", false),
      ],
    };
    expect(matchDisplayStatus(benchOnly)).toBe("bench_only");

    // Partido normal con titulares abiertos
    const standardOpen = {
      status: "open",
      match_mode: "pickup",
      match_slots: [
        makeSlot("a1", "a", "starter", false),
        makeSlot("a2", "a", "bench", false),
      ],
    };
    expect(matchDisplayStatus(standardOpen)).toBe("open");

    // Cancelado
    expect(
      matchDisplayStatus({
        status: "cancelled",
        match_mode: "pickup",
        match_slots: [makeSlot("a1", "a", "starter", false)],
      }),
    ).toBe("cancelled");
  });
});

describe("Parsing Helpers for Challenge & Bench Write", () => {
  it("parseMatchMode valida correctamente", () => {
    expect(parseMatchMode("challenge")).toBe("challenge");
    expect(parseMatchMode("pickup")).toBe("pickup");
    expect(parseMatchMode(null)).toBe("pickup");
    expect(parseMatchMode("random")).toBe("pickup");
  });

  it("parseTeamName valida longitud y espacios", () => {
    expect(parseTeamName("  Los Galácticos  ")).toBe("Los Galácticos");
    expect(parseTeamName("A")).toBeNull();
    expect(parseTeamName("")).toBeNull();
    expect(parseTeamName(null)).toBeNull();
  });

  it("parseBenchCount parsea enteros seguros", () => {
    expect(parseBenchCount("2")).toBe(2);
    expect(parseBenchCount(3)).toBe(3);
    expect(parseBenchCount("0")).toBe(0);
    expect(parseBenchCount("-1")).toBe(0);
    expect(parseBenchCount("100")).toBe(0);
    expect(parseBenchCount("abc")).toBe(0);
  });

  it("parseRotationRule valida longitud", () => {
    expect(parseRotationRule("Rotación cada 15 min")).toBe("Rotación cada 15 min");
    expect(parseRotationRule("   ")).toBeNull();
    expect(parseRotationRule(null)).toBeNull();
  });

  it("calcula correctamente cupos de lado B para reto de voleibol 6v6", () => {
    const format = "6v6";
    const sideBCount = playersPerSideFromFormat(format);
    const benchCount = 0;
    const challengeTargetLevel = "any";
    const position = "any";

    const slots: Array<{
      position: string;
      level: string;
      side: "a" | "b";
      slot_role: "starter" | "bench";
      pitch_index: number | null;
    }> = Array.from({ length: sideBCount }, () => ({
      position,
      level: challengeTargetLevel,
      side: "b" as const,
      slot_role: "starter" as const,
      pitch_index: null,
    }));

    if (benchCount > 0) {
      for (let i = 0; i < benchCount; i++) {
        slots.push({
          position: "any",
          level: challengeTargetLevel,
          side: "b" as const,
          slot_role: "bench" as const,
          pitch_index: null,
        });
      }
    }

    expect(slots).toHaveLength(6);
    expect(slots.every((s) => s.side === "b" && s.slot_role === "starter")).toBe(true);
  });
});
