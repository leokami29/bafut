import { describe, expect, it } from "vitest";
import {
  buildMatchSlotsPayload,
  sanitizeRotationRule,
  sanitizeTeamName,
  type IntentPayloadInput,
  type MatchCreationIntent,
} from "@/lib/match-intent-payload";
import {
  SPORTS,
  SPORT_RULES,
  POSITIONS,
  type Sport,
  type Format,
  type Position,
} from "@/lib/sport-rules";
import { playersPerSideFromFormat } from "@/lib/formations-catalog";
import {
  parseBenchCount,
  parseCostPerPerson,
  parsePitchSlotsJson,
  resolveFormationIdInput,
} from "@/lib/match-write";

describe("Adversarial Challenge Track 1 — Inconsistent Side & Role Combinations", () => {
  it("Invariant 1.1: In pickup mode (Intent 1 & 2), NO slot can have side === 'b' under any circumstance", () => {
    for (const sport of SPORTS) {
      for (const format of SPORT_RULES[sport].formats) {
        // Intent 1
        const res1 = buildMatchSlotsPayload({
          intent: "starter_slots",
          sport,
          format,
          starterCount: 1,
          benchCount: 2,
        });
        expect(res1.ok).toBe(true);
        if (res1.ok) {
          expect(res1.data.matchMode).toBe("pickup");
          expect(res1.data.slots.some((s) => s.side === "b")).toBe(false);
          expect(res1.data.totalRivalB).toBe(0);
        }

        // Intent 2
        const res2 = buildMatchSlotsPayload({
          intent: "bench_only",
          sport,
          format,
          benchCount: 2,
        });
        expect(res2.ok).toBe(true);
        if (res2.ok) {
          expect(res2.data.matchMode).toBe("pickup");
          expect(res2.data.slots.some((s) => s.side === "b")).toBe(false);
          expect(res2.data.totalRivalB).toBe(0);
        }
      }
    }
  });

  it("Invariant 1.2: In challenge mode (Intent 3), NO slot can have side === 'a' under any circumstance", () => {
    for (const sport of SPORTS) {
      for (const format of SPORT_RULES[sport].formats) {
        const res = buildMatchSlotsPayload({
          intent: "challenge",
          sport,
          format,
          benchCount: 2,
          hostTeamName: "Challenge FC",
        });
        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.data.matchMode).toBe("challenge");
          expect(res.data.slots.some((s) => s.side === "a")).toBe(false);
          expect(res.data.totalStartersA).toBe(0);
          expect(res.data.totalBenchA).toBe(0);
        }
      }
    }
  });

  it("Invariant 1.3: Every generated slot MUST strictly have slot_role === 'starter' | 'bench'", () => {
    const intents: MatchCreationIntent[] = ["starter_slots", "bench_only", "challenge"];
    for (const intent of intents) {
      const res = buildMatchSlotsPayload({
        intent,
        sport: "futbol",
        format: "5v5",
        starterCount: intent === "starter_slots" ? 3 : undefined,
        benchCount: 2,
        hostTeamName: "Test Team",
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        for (const slot of res.data.slots) {
          expect(["starter", "bench"]).toContain(slot.slot_role);
          expect(["a", "b"]).toContain(slot.side);
        }
      }
    }
  });

  it("Invariant 1.4: Bench slots MUST NEVER have pitch_index (always null)", () => {
    const intents: MatchCreationIntent[] = ["starter_slots", "bench_only", "challenge"];
    for (const intent of intents) {
      const res = buildMatchSlotsPayload({
        intent,
        sport: "futbol",
        format: "5v5",
        starterCount: intent === "starter_slots" ? 2 : undefined,
        benchCount: 3,
        hostTeamName: "Bench FC",
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        const benchSlots = res.data.slots.filter((s) => s.slot_role === "bench");
        expect(benchSlots.length).toBeGreaterThanOrEqual(1);
        expect(benchSlots.every((s) => s.pitch_index === null)).toBe(true);
      }
    }
  });

  it("Invariant 1.5: Side B slots MUST NEVER have pitch_index (always null)", () => {
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "11v11",
      benchCount: 4,
      hostTeamName: "Rival Eleven",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.slots.every((s) => s.pitch_index === null)).toBe(true);
    }
  });

  it("Invariant 1.6: Fuzz test across 500 pseudo-random inputs to prove side/role invariants", () => {
    const sports: Sport[] = ["futbol", "futbol_sala", "basquet", "voleibol", "padel"];
    const intents: MatchCreationIntent[] = ["starter_slots", "bench_only", "challenge"];

    let validPayloadCount = 0;

    for (let seed = 0; seed < 500; seed++) {
      const sport = sports[seed % sports.length];
      const formats = SPORT_RULES[sport].formats;
      const format = formats[seed % formats.length];
      const intent = intents[seed % intents.length];
      const benchCount = (seed % 6) - 1; // -1 to 4
      const starterCount = (seed % 14) - 2; // -2 to 11

      const res = buildMatchSlotsPayload({
        intent,
        sport,
        format,
        starterCount: intent === "starter_slots" ? starterCount : undefined,
        benchCount,
        hostTeamName: seed % 2 === 0 ? `Team ${seed}` : null,
      });

      if (res.ok) {
        validPayloadCount++;
        const { matchMode, slots, totalStartersA, totalBenchA, totalRivalB } = res.data;

        if (matchMode === "pickup") {
          expect(slots.every((s) => s.side === "a")).toBe(true);
          expect(totalRivalB).toBe(0);
        } else {
          expect(slots.every((s) => s.side === "b")).toBe(true);
          expect(totalStartersA).toBe(0);
          expect(totalBenchA).toBe(0);
        }

        for (const slot of slots) {
          if (slot.slot_role === "bench") {
            expect(slot.pitch_index).toBeNull();
          }
          if (slot.side === "b") {
            expect(slot.pitch_index).toBeNull();
          }
        }
      }
    }

    expect(validPayloadCount).toBeGreaterThan(50);
  });
});

describe("Adversarial Challenge Track 2 — Format Bounds & Math Overflow", () => {
  it("Invariant 2.1: Rejects starterCount exceeding perSide for ALL sports and ALL formats", () => {
    for (const sport of SPORTS) {
      for (const format of SPORT_RULES[sport].formats) {
        const perSide = playersPerSideFromFormat(format);

        // perSide should succeed
        const validRes = buildMatchSlotsPayload({
          intent: "starter_slots",
          sport,
          format,
          starterCount: perSide,
        });
        expect(validRes.ok).toBe(true);

        // perSide + 1 MUST fail
        const overflowRes = buildMatchSlotsPayload({
          intent: "starter_slots",
          sport,
          format,
          starterCount: perSide + 1,
        });
        expect(overflowRes.ok).toBe(false);
        if (!overflowRes.ok) {
          expect(overflowRes.error).toContain("no pueden superar el formato");
        }
      }
    }
  });

  it("Invariant 2.2: Rejects pitchSlots array exceeding perSide limit for all sports", () => {
    for (const sport of SPORTS) {
      for (const format of SPORT_RULES[sport].formats) {
        const perSide = playersPerSideFromFormat(format);
        const pitchSlots = Array.from({ length: perSide + 1 }, (_, i) => ({
          pitchIndex: i % 16,
          position: "any",
        }));

        const overflowRes = buildMatchSlotsPayload({
          intent: "starter_slots",
          sport,
          format,
          pitchSlots,
        });
        expect(overflowRes.ok).toBe(false);
      }
    }
  });

  it("Invariant 2.3: Rejects starterCount <= 0 in Intent 1", () => {
    const zeroRes = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 0,
    });
    expect(zeroRes.ok).toBe(false);

    const negRes = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: -5,
    });
    expect(negRes.ok).toBe(false);
  });

  it("Invariant 2.4: Bench bounds strictly enforced between 0 and 4 across all intents", () => {
    const intents: MatchCreationIntent[] = ["starter_slots", "bench_only", "challenge"];
    for (const intent of intents) {
      const neg = buildMatchSlotsPayload({
        intent,
        sport: "futbol",
        format: "5v5",
        starterCount: intent === "starter_slots" ? 3 : undefined,
        benchCount: -1,
      });
      expect(neg.ok).toBe(false);

      const over = buildMatchSlotsPayload({
        intent,
        sport: "futbol",
        format: "5v5",
        starterCount: intent === "starter_slots" ? 3 : undefined,
        benchCount: 5,
      });
      expect(over.ok).toBe(false);
    }
  });

  it("Invariant 2.5: Challenge mode strictly bounds Side B slots to < 16 (PostgreSQL guard_slot_side_insert trigger)", () => {
    // 11v11 with 4 bench = 15 slots (Allowed)
    const res15 = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "11v11",
      benchCount: 4,
    });
    expect(res15.ok).toBe(true);
    if (res15.ok) {
      expect(res15.data.slots.length).toBe(15);
      expect(res15.data.slots.length).toBeLessThan(16);
    }

    // Direct overflow attempt in challenge mode
    const resOver = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "11v11",
      benchCount: 5,
    });
    expect(resOver.ok).toBe(false);
  });
});

describe("Adversarial Challenge Track 3 — Rotation Pact Circumvention in Intent 2 ('Solo Banca')", () => {
  it("Invariant 3.1: Mandatory rotation pact cannot be null, empty, or whitespace in Intent 2", () => {
    // When rotationRule is undefined -> defaults to active rotation pact
    const resUndef = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: undefined,
    });
    expect(resUndef.ok).toBe(true);
    if (resUndef.ok) {
      expect(resUndef.data.rotationRule).toBe("Rotación activa continua");
    }

    // When rotationRule is null -> defaults to active rotation pact
    const resNull = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: null,
    });
    expect(resNull.ok).toBe(true);
    if (resNull.ok) {
      expect(resNull.data.rotationRule).toBe("Rotación activa continua");
    }

    // When rotationRule is empty string -> defaults to active rotation pact
    const resEmpty = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: "",
    });
    expect(resEmpty.ok).toBe(true);
    if (resEmpty.ok) {
      expect(resEmpty.data.rotationRule).toBe("Rotación activa continua");
    }

    // When rotationRule is spaces -> defaults to active rotation pact
    const resSpaces = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: "     ",
    });
    expect(resSpaces.ok).toBe(true);
    if (resSpaces.ok) {
      expect(resSpaces.data.rotationRule).toBe("Rotación activa continua");
    }
  });

  it("Invariant 3.2: Rejects rotationRule with invalid lengths (< 2 chars or > 120 chars)", () => {
    const resShort = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: "X",
    });
    expect(resShort.ok).toBe(false);

    const resLong = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: "X".repeat(121),
    });
    expect(resLong.ok).toBe(false);
  });

  it("Invariant 3.3: Intent 2 strictly requires 1 to 4 bench slots (0 bench is rejected)", () => {
    const resZero = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 0,
    });
    expect(resZero.ok).toBe(false);

    const resNone = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: undefined,
    });
    expect(resNone.ok).toBe(false);
  });

  it("Invariant 3.4: Rejects pitchSlots or starterCount in Intent 2", () => {
    const resPitch = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      pitchSlots: [{ pitchIndex: 0 }],
    });
    expect(resPitch.ok).toBe(false);
    if (!resPitch.ok) {
      expect(resPitch.error).toContain("no se deben seleccionar cupos titulares en cancha");
    }

    const resStarter = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      starterCount: 3,
    });
    expect(resStarter.ok).toBe(false);
  });
});

describe("Adversarial Challenge Track 4 — Robustness Under Extreme Numerical Values & Malformed Inputs", () => {
  it("Invariant 4.1: Extreme numerical values in starterCount and benchCount are safely rejected", () => {
    const extremeValues = [
      Infinity,
      -Infinity,
      NaN,
      1.5,
      -0.5,
      Number.MAX_SAFE_INTEGER,
      1e20,
    ];

    for (const val of extremeValues) {
      const resStarters = buildMatchSlotsPayload({
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        starterCount: val,
      });
      expect(resStarters.ok).toBe(false);

      const resBench = buildMatchSlotsPayload({
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        starterCount: 2,
        benchCount: val,
      });
      expect(resBench.ok).toBe(false);
    }
  });

  it("Invariant 4.2: Extreme pitchIndex values are safely rejected", () => {
    const badIndices = [-1, 16, 100, 2.5, NaN, Infinity, -Infinity];

    for (const idx of badIndices) {
      const res = buildMatchSlotsPayload({
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        pitchSlots: [{ pitchIndex: idx }],
      });
      expect(res.ok).toBe(false);
    }
  });

  it("Invariant 4.3: Prototype pollution attacks on sport, format, and formationId fail gracefully", () => {
    const pollutions = ["__proto__", "constructor", "prototype", "toString", "valueOf"];

    for (const poison of pollutions) {
      const resSport = buildMatchSlotsPayload({
        intent: "starter_slots",
        sport: poison,
        format: "5v5",
        starterCount: 2,
      });
      expect(resSport.ok).toBe(false);

      const resFormat = buildMatchSlotsPayload({
        intent: "starter_slots",
        sport: "futbol",
        format: poison,
        starterCount: 2,
      });
      expect(resFormat.ok).toBe(false);

      const resFormation = buildMatchSlotsPayload({
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        formationId: poison,
        starterCount: 2,
      });
      expect(resFormation.ok).toBe(false);

      const resIntent = buildMatchSlotsPayload({
        intent: poison as any,
        sport: "futbol",
        format: "5v5",
        starterCount: 2,
      });
      expect(resIntent.ok).toBe(false);
    }
  });

  it("Invariant 4.4: Cross-sport position injections are strictly rejected", () => {
    // Pádel with GK
    const resPadelGk = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "padel",
      format: "2v2",
      pitchSlots: [{ pitchIndex: 0, position: "gk" }],
    });
    expect(resPadelGk.ok).toBe(false);

    // Básquet with libero
    const resBasquetLibero = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "basquet",
      format: "5v5",
      pitchSlots: [{ pitchIndex: 0, position: "libero" }],
    });
    expect(resBasquetLibero.ok).toBe(false);

    // Fútbol with drive (pádel)
    const resFutbolDrive = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      pitchSlots: [{ pitchIndex: 0, position: "drive" }],
    });
    expect(resFutbolDrive.ok).toBe(false);
  });

  it("Invariant 4.5: needKeeper is respected only in sports that have a keeper", () => {
    // Fútbol has keeper -> slot 0 is 'gk'
    const resFutbol = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 3,
      needKeeper: true,
    });
    expect(resFutbol.ok).toBe(true);
    if (resFutbol.ok) {
      expect(resFutbol.data.slots[0].position).toBe("gk");
      expect(resFutbol.data.slots[1].position).toBe("any");
    }

    // Básquet has no keeper -> slot 0 remains 'any'
    const resBasquet = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "basquet",
      format: "3v3",
      starterCount: 2,
      needKeeper: true,
    });
    expect(resBasquet.ok).toBe(true);
    if (resBasquet.ok) {
      expect(resBasquet.data.slots[0].position).toBe("any");
    }
  });
});

describe("Adversarial Challenge Track 5 — Server Action Sanitizers & Helpers", () => {
  it("Invariant 5.1: parsePitchSlotsJson handles malformed JSON, arrays, and objects safely", () => {
    // Invalid JSON
    expect(parsePitchSlotsJson("{ bad json }", "futbol")).toEqual({
      error: "Los huecos de cancha no son válidos.",
    });

    // Empty string
    expect(parsePitchSlotsJson("", "futbol")).toBeNull();

    // Not an array
    expect(parsePitchSlotsJson("{\"pitch_index\": 0}", "futbol")).toEqual({
      error: "Marcá entre 1 y 12 huecos en la cancha.",
    });

    // Array with > 12 elements
    const array13 = JSON.stringify(Array.from({ length: 13 }, (_, i) => ({ pitch_index: i })));
    expect(parsePitchSlotsJson(array13, "futbol")).toEqual({
      error: "Marcá entre 1 y 12 huecos en la cancha.",
    });

    // Duplicate pitch indices
    const dups = JSON.stringify([
      { pitch_index: 2, position: "mid" },
      { pitch_index: 2, position: "fwd" },
    ]);
    expect(parsePitchSlotsJson(dups, "futbol")).toEqual({
      error: "Índice de cancha inválido.",
    });

    // Invalid position for sport
    const invalidPos = JSON.stringify([
      { pitch_index: 0, position: "libero" }, // libero not in fútbol
    ]);
    expect(parsePitchSlotsJson(invalidPos, "futbol")).toEqual({
      error: "Esa posición no aplica para el deporte.",
    });
  });

  it("Invariant 5.2: parseBenchCount safely handles non-integers, negatives, and overflow", () => {
    expect(parseBenchCount(undefined)).toBe(0);
    expect(parseBenchCount(null)).toBe(0);
    expect(parseBenchCount("")).toBe(0);
    expect(parseBenchCount("abc")).toBe(0);
    expect(parseBenchCount(-1)).toBe(0);
    expect(parseBenchCount(3.5)).toBe(0);
    expect(parseBenchCount(9)).toBe(0);
    expect(parseBenchCount(4)).toBe(4);
    expect(parseBenchCount("3")).toBe(3);
  });

  it("Invariant 5.3: resolveFormationIdInput rejects invalid IDs and cross-sport formations", () => {
    expect(resolveFormationIdInput("futbol-5v5-1-2-1", "futbol", "5v5")).toBe("futbol-5v5-1-2-1");
    expect(resolveFormationIdInput("futbol-5v5-1-2-1", "basquet", "5v5")).toEqual({
      error: "Esa formación no aplica para el deporte/formato.",
    });
    expect(resolveFormationIdInput("non-existent-formation", "futbol", "5v5")).toEqual({
      error: "Esa formación no aplica para el deporte/formato.",
    });
    expect(resolveFormationIdInput("x".repeat(81), "futbol", "5v5")).toEqual({
      error: "Formación no válida.",
    });
  });

  it("Invariant 5.4: parseCostPerPerson rejects negative and extreme costs", () => {
    expect(parseCostPerPerson("15000")).toBe(15000);
    expect(parseCostPerPerson("$ 20.000")).toBe(20000);
    expect(parseCostPerPerson("")).toBeNull();
    expect(parseCostPerPerson("100000000")).toEqual({ error: "El precio no es válido." });
  });

  it("Invariant 5.5: sanitizeTeamName strictly validates 2 to 60 characters", () => {
    expect(sanitizeTeamName(null)).toEqual({ ok: true, team: null });
    expect(sanitizeTeamName("")).toEqual({ ok: true, team: null });
    expect(sanitizeTeamName("   ")).toEqual({ ok: true, team: null });
    expect(sanitizeTeamName("A")).toEqual({
      ok: false,
      error: "El nombre de tu equipo debe tener entre 2 y 60 caracteres.",
    });
    expect(sanitizeTeamName("AB")).toEqual({ ok: true, team: "AB" });
    expect(sanitizeTeamName("A".repeat(60))).toEqual({ ok: true, team: "A".repeat(60) });
    expect(sanitizeTeamName("A".repeat(61))).toEqual({
      ok: false,
      error: "El nombre de tu equipo debe tener entre 2 y 60 caracteres.",
    });
  });

  it("Invariant 5.6: sanitizeRotationRule strictly validates 2 to 120 characters and provides active default", () => {
    expect(sanitizeRotationRule(null)).toEqual({ ok: true, rule: "Rotación activa continua" });
    expect(sanitizeRotationRule("")).toEqual({ ok: true, rule: "Rotación activa continua" });
    expect(sanitizeRotationRule("   ")).toEqual({ ok: true, rule: "Rotación activa continua" });
    expect(sanitizeRotationRule("X")).toEqual({
      ok: false,
      error: "La regla de rotación debe tener entre 2 y 120 caracteres.",
    });
    expect(sanitizeRotationRule("15")).toEqual({ ok: true, rule: "15" });
    expect(sanitizeRotationRule("R".repeat(120))).toEqual({ ok: true, rule: "R".repeat(120) });
    expect(sanitizeRotationRule("R".repeat(121))).toEqual({
      ok: false,
      error: "La regla de rotación debe tener entre 2 y 120 caracteres.",
    });
  });
});

describe("Adversarial Challenge Track 6 — Deep Stress Harness & Invariant Proofs", () => {
  it("Invariant 6.1: Intent 2 Mathematical Invariant Proof across 200 random perturbations", () => {
    const benchValues = [0, 1, 2, 3, 4, 5, -1, 10, 0.5, NaN, Infinity];
    const starterValues = [undefined, 0, 1, -1, 5, 10];
    const rules = [undefined, null, "", "   ", "X", "Valid Rule", "R".repeat(120), "R".repeat(121)];

    let passes = 0;
    for (const b of benchValues) {
      for (const s of starterValues) {
        for (const r of rules) {
          const res = buildMatchSlotsPayload({
            intent: "bench_only",
            sport: "futbol",
            format: "5v5",
            benchCount: b as any,
            starterCount: s,
            rotationRule: r,
          });

          if (res.ok) {
            passes++;
            // Mathematical proofs:
            // 1. Must be pickup
            expect(res.data.matchMode).toBe("pickup");
            // 2. totalStartersA must be 0
            expect(res.data.totalStartersA).toBe(0);
            // 3. totalRivalB must be 0
            expect(res.data.totalRivalB).toBe(0);
            // 4. bench count must be between 1 and 4
            expect(res.data.totalBenchA).toBeGreaterThanOrEqual(1);
            expect(res.data.totalBenchA).toBeLessThanOrEqual(4);
            // 5. rotation rule must NEVER be null, empty, or whitespace
            expect(res.data.rotationRule).not.toBeNull();
            expect(typeof res.data.rotationRule).toBe("string");
            expect(res.data.rotationRule!.trim().length).toBeGreaterThanOrEqual(2);
            // 6. all slots must be side 'a', slot_role 'bench', pitch_index null
            expect(res.data.slots.length).toBe(res.data.totalBenchA);
            expect(
              res.data.slots.every(
                (slot) => slot.side === "a" && slot.slot_role === "bench" && slot.pitch_index === null
              )
            ).toBe(true);
          }
        }
      }
    }

    expect(passes).toBeGreaterThan(0);
  });

  it("Invariant 6.2: Intent 3 Mathematical Invariant Proof across all sports and formats", () => {
    for (const sport of SPORTS) {
      for (const format of SPORT_RULES[sport].formats) {
        for (const bench of [0, 1, 2, 3, 4]) {
          const res = buildMatchSlotsPayload({
            intent: "challenge",
            sport,
            format,
            benchCount: bench,
            hostTeamName: "Host FC",
          });

          expect(res.ok).toBe(true);
          if (res.ok) {
            const perSide = playersPerSideFromFormat(format);
            // Invariant proofs:
            expect(res.data.matchMode).toBe("challenge");
            expect(res.data.totalStartersA).toBe(0);
            expect(res.data.totalBenchA).toBe(0);
            expect(res.data.totalRivalB).toBe(perSide + bench);
            expect(res.data.slots.length).toBe(perSide + bench);
            // Trigger safety invariant: strictly less than 16 slots on Side B
            expect(res.data.slots.length).toBeLessThan(16);
            // Every slot must be Side B with pitch_index null
            expect(res.data.slots.every((s) => s.side === "b" && s.pitch_index === null)).toBe(true);
            // Starters and bench roles match counts
            const starters = res.data.slots.filter((s) => s.slot_role === "starter");
            const benched = res.data.slots.filter((s) => s.slot_role === "bench");
            expect(starters.length).toBe(perSide);
            expect(benched.length).toBe(bench);
          }
        }
      }
    }
  });

  it("Invariant 6.3: Non-existent or invalid sports and formats never pass", () => {
    const invalidCombos = [
      { sport: "tennis", format: "1v1" },
      { sport: "futbol", format: "3v3" },
      { sport: "futbol_sala", format: "11v11" },
      { sport: "basquet", format: "6v6" },
      { sport: "voleibol", format: "5v5" },
      { sport: "padel", format: "5v5" },
    ];

    for (const combo of invalidCombos) {
      const res = buildMatchSlotsPayload({
        intent: "starter_slots",
        sport: combo.sport,
        format: combo.format,
        starterCount: 1,
      });
      expect(res.ok).toBe(false);
    }
  });
});
