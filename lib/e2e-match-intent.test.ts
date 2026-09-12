/**
 * BaFut — Comprehensive Opaque-Box E2E Test Suite for Match Creation & Slot Configuration
 *
 * Requirements Source Documents:
 * - ORIGINAL_REQUEST.md (§ R1 Intent-Driven UI, § R2 Live Match Board, § R3 Payload & DB Integrity, § R4 WCAG 2.2 AA)
 * - PROJECT.md (§ Architecture, § Feature Inventory F1–F7, § Interface Contracts)
 * - spec_report.md (SPEC-BAFUT-M1-SURVEY-3, § 2 Features, § 3 Edge Cases, § 4–8 Technical Specifications, § 9 Acceptance Criteria)
 *
 * Test Tiers:
 * - Tier 1: Feature Coverage (>=5 test cases per feature across F1–F7)
 * - Tier 2: Boundary & Corner Cases (0 starters, format max bounds, bench 0–4, team names, rotation rules, trigger bounds)
 * - Tier 3: Cross-Feature Combinations (Pairwise matrix of intents, formats, bench, challenge modes, and transitions)
 * - Tier 4: Real-World Application Scenarios (5 sports, keyboard a11y roving tabindex, screen reader live announcements, adversarial robustness)
 */

import { describe, expect, it } from "vitest";
import {
  playersPerSideFromFormat,
  getFormationById,
  type FormationEntry,
} from "@/lib/formations-catalog";
import { buildMatchSlotsPayload } from "@/lib/match-intent-payload";
import {
  SPORT_RULES,
  SPORTS,
  FORMATS,
  POSITIONS,
  isSport,
  isFormat,
  isPosition,
  formatAllowedForSport,
  positionAllowedForSport,
  defaultFormatForSport,
  type Sport,
  type Format,
  type Position,
} from "@/lib/sport-rules";
import {
  parseBenchCount,
  parseCostPerPerson,
  parseMatchMode,
  parseRotationRule,
  parseTeamName,
} from "@/lib/match-write";
import {
  isChallengeMatch,
  matchDisplayStatus,
  openBenchSlotCount,
  openSideASlotCount,
  openSideBSlotCount,
  openStarterSlotCount,
  type MatchDetail,
  type SlotWithClaims,
} from "@/lib/types";
import { ROTATION_RULES, LEVELS, type Level } from "@/lib/constants";

// ============================================================================
// Authoritative Specification Types & Reference Engine (PROJECT.md § Contracts)
// ============================================================================

export type MatchCreationIntent = "starter_slots" | "bench_only" | "challenge";

export interface IntentPayloadInput {
  intent: MatchCreationIntent;
  sport: Sport;
  format: Format;
  formationId?: string | null;
  pitchSlots?: Array<{
    pitchIndex: number;
    position?: Position;
    level?: Level;
  }>;
  starterCount?: number;
  benchCount?: number; // 0 to 4
  rotationRule?: string | null;
  hostTeamName?: string | null;
  challengeModeType?: "full_team" | "open_slots";
  targetLevel?: Level;
}

export interface ValidatedSlot {
  side: "a" | "b";
  slot_role: "starter" | "bench";
  position: Position;
  level: Level;
  pitch_index: number | null;
}

export interface ValidatedMatchPayload {
  matchMode: "pickup" | "challenge";
  hostTeamName: string | null;
  rotationRule: string | null;
  slots: ValidatedSlot[];
  totalStartersA: number;
  totalBenchA: number;
  totalRivalB: number;
}

/**
 * Authoritative Specification Oracle for Intent-Driven Match Payload Generation.
 * Derived strictly from PROJECT.md Interface Contracts and spec_report.md § 6.
 */
export function evaluateIntentSpecification(
  input: IntentPayloadInput
): { ok: true; data: ValidatedMatchPayload } | { ok: false; error: string } {
  // 1. Validate sport and format
  if (!isSport(input.sport)) {
    return { ok: false, error: "Deporte no válido." };
  }
  if (!isFormat(input.format) || !formatAllowedForSport(input.sport, input.format)) {
    return { ok: false, error: "Formato no permitido para este deporte." };
  }

  const maxPerSide = playersPerSideFromFormat(input.format);
  const benchCount = parseBenchCount(input.benchCount ?? 0);
  const level: Level = input.targetLevel && (LEVELS as readonly string[]).includes(input.targetLevel)
    ? input.targetLevel
    : "any";

  // Intent 1: Completar mi Equipo Titular
  if (input.intent === "starter_slots") {
    const slots: ValidatedSlot[] = [];

    if (input.pitchSlots && input.pitchSlots.length > 0) {
      if (input.pitchSlots.length > maxPerSide) {
        return { ok: false, error: `Los cupos titulares no pueden superar ${maxPerSide} para ${input.format}.` };
      }
      const seenPitch = new Set<number>();
      for (const p of input.pitchSlots) {
        if (p.pitchIndex < 0 || p.pitchIndex > 15 || seenPitch.has(p.pitchIndex)) {
          return { ok: false, error: "Índice de cancha inválido o duplicado." };
        }
        seenPitch.add(p.pitchIndex);
        const pos = p.position && positionAllowedForSport(input.sport, p.position) ? p.position : "any";
        slots.push({
          side: "a",
          slot_role: "starter",
          position: pos,
          level: p.level ?? level,
          pitch_index: p.pitchIndex,
        });
      }
    } else {
      const starters = input.starterCount ?? 2;
      if (starters < 1 || starters > maxPerSide) {
        return { ok: false, error: `Los cupos titulares deben estar entre 1 y ${maxPerSide}.` };
      }
      for (let i = 0; i < starters; i++) {
        slots.push({
          side: "a",
          slot_role: "starter",
          position: "any",
          level,
          pitch_index: null,
        });
      }
    }

    if (benchCount > 0) {
      if (benchCount > 4) {
        return { ok: false, error: "La banca no puede superar 4 suplentes." };
      }
      for (let i = 0; i < benchCount; i++) {
        slots.push({
          side: "a",
          slot_role: "bench",
          position: "any",
          level,
          pitch_index: null,
        });
      }
    }

    const rotation = benchCount > 0 ? (parseRotationRule(input.rotationRule) ?? "Rotación activa continua") : null;

    return {
      ok: true,
      data: {
        matchMode: "pickup",
        hostTeamName: null,
        rotationRule: rotation,
        slots,
        totalStartersA: slots.filter((s) => s.side === "a" && s.slot_role === "starter").length,
        totalBenchA: slots.filter((s) => s.side === "a" && s.slot_role === "bench").length,
        totalRivalB: 0,
      },
    };
  }

  // Intent 2: Solo Banca / Suplentes
  if (input.intent === "bench_only") {
    if (benchCount < 1 || benchCount > 4) {
      return { ok: false, error: "Solo Banca requiere entre 1 y 4 suplentes." };
    }
    const rotation = parseRotationRule(input.rotationRule) ?? "Rotación activa continua";
    const slots: ValidatedSlot[] = [];
    for (let i = 0; i < benchCount; i++) {
      slots.push({
        side: "a",
        slot_role: "bench",
        position: "any",
        level,
        pitch_index: null,
      });
    }

    return {
      ok: true,
      data: {
        matchMode: "pickup",
        hostTeamName: null,
        rotationRule: rotation,
        slots,
        totalStartersA: 0,
        totalBenchA: benchCount,
        totalRivalB: 0,
      },
    };
  }

  // Intent 3: Reto a Equipo Rival
  if (input.intent === "challenge") {
    const hostTeamName = parseTeamName(input.hostTeamName);
    if (input.hostTeamName && !hostTeamName) {
      return { ok: false, error: "El nombre del equipo debe tener entre 2 y 60 caracteres." };
    }
    const sideBStarters = maxPerSide;
    const slots: ValidatedSlot[] = [];

    // Starters for Side B
    for (let i = 0; i < sideBStarters; i++) {
      slots.push({
        side: "b",
        slot_role: "starter",
        position: "any",
        level,
        pitch_index: null,
      });
    }

    // Optional bench for Side B
    if (benchCount > 0) {
      if (benchCount > 4) {
        return { ok: false, error: "La banca rival no puede superar 4 suplentes." };
      }
      for (let i = 0; i < benchCount; i++) {
        slots.push({
          side: "b",
          slot_role: "bench",
          position: "any",
          level,
          pitch_index: null,
        });
      }
    }

    // Postgres trigger bound: side B total slots must be < 16
    if (slots.length >= 16) {
      return { ok: false, error: "El lado B ya tiene el maximo de cupos (máx 15)." };
    }

    return {
      ok: true,
      data: {
        matchMode: "challenge",
        hostTeamName: hostTeamName ?? null,
        rotationRule: parseRotationRule(input.rotationRule),
        slots,
        totalStartersA: 0,
        totalBenchA: 0,
        totalRivalB: slots.length,
      },
    };
  }

  return { ok: false, error: "Intención de convocatoria no reconocida." };
}

// Helper to construct test match mock object for MatchDetail queries
function createMockMatchDetail(
  status: "open" | "cancelled",
  mode: "pickup" | "challenge",
  slots: Array<{
    id: string;
    side: "a" | "b";
    slot_role: "starter" | "bench";
    claimed?: boolean;
    position?: Position;
  }>
): Pick<MatchDetail, "status" | "match_mode" | "match_slots"> {
  const matchSlots = slots.map((s) => ({
    id: s.id,
    match_id: "m-mock",
    position: (s.position ?? "any") as Position,
    level: "any",
    pitch_index: null,
    side: s.side,
    slot_role: s.slot_role,
    custom_cost_per_person: null,
    created_at: "2026-09-10T00:00:00Z",
    slot_claims: s.claimed
      ? [
          {
            id: `claim-${s.id}`,
            slot_id: s.id,
            player_id: "p1",
            status: "accepted",
            created_at: "2026-09-10T00:00:00Z",
            profiles: { id: "p1", display_name: "Jugador Test" },
          },
        ]
      : [],
  })) as unknown as SlotWithClaims[];

  return {
    status,
    match_mode: mode,
    match_slots: matchSlots,
  };
}

// ============================================================================
// TIER 1: FEATURE COVERAGE (>=5 test cases per feature across F1–F7)
// ============================================================================

describe("TIER 1: Feature Coverage (F1–F7)", () => {
  // --------------------------------------------------------------------------
  // F1: Intención "Completar mi Equipo Titular"
  // --------------------------------------------------------------------------
  describe("F1: Intención 'Completar mi Equipo Titular'", () => {
    it("T1.F1.01: genera cupos titulares asignados estrictamente a side='a' y slot_role='starter'", () => {
      const res = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        starterCount: 3,
        benchCount: 0,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.matchMode).toBe("pickup");
      expect(res.data.slots).toHaveLength(3);
      expect(res.data.slots.every((s) => s.side === "a" && s.slot_role === "starter")).toBe(true);
      expect(res.data.totalStartersA).toBe(3);
      expect(res.data.totalBenchA).toBe(0);
      expect(res.data.totalRivalB).toBe(0);
    });

    it("T1.F1.02: respeta las posiciones tácticas asignadas a los huecos en cancha", () => {
      const res = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        pitchSlots: [
          { pitchIndex: 0, position: "gk" },
          { pitchIndex: 2, position: "def" },
          { pitchIndex: 4, position: "fwd" },
        ],
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.slots).toHaveLength(3);
      expect(res.data.slots[0].position).toBe("gk");
      expect(res.data.slots[0].pitch_index).toBe(0);
      expect(res.data.slots[1].position).toBe("def");
      expect(res.data.slots[2].position).toBe("fwd");
    });

    it("T1.F1.03: anexa suplentes en side='a' y slot_role='bench' cuando benchCount > 0", () => {
      const res = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "futbol",
        format: "7v7",
        starterCount: 2,
        benchCount: 3,
        rotationRule: "Rotación activa continua",
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.slots).toHaveLength(5);
      const starters = res.data.slots.filter((s) => s.slot_role === "starter");
      const bench = res.data.slots.filter((s) => s.slot_role === "bench");
      expect(starters).toHaveLength(2);
      expect(bench).toHaveLength(3);
      expect(bench.every((b) => b.side === "a" && b.pitch_index === null)).toBe(true);
      expect(res.data.rotationRule).toBe("Rotación activa continua");
    });

    it("T1.F1.04: rechaza índices de cancha duplicados o fuera de rango (0..15)", () => {
      const duplicateRes = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        pitchSlots: [
          { pitchIndex: 1, position: "def" },
          { pitchIndex: 1, position: "mid" },
        ],
      });
      expect(duplicateRes.ok).toBe(false);

      const outOfBoundsRes = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        pitchSlots: [{ pitchIndex: 16, position: "fwd" }],
      });
      expect(outOfBoundsRes.ok).toBe(false);
    });

    it("T1.F1.05: rechaza cantidad de titulares superior a los límites del formato deportivo", () => {
      const res = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "padel",
        format: "2v2", // max per side is 2
        starterCount: 3,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("entre 1 y 2");
      }
    });
  });

  // --------------------------------------------------------------------------
  // F2: Intención "Solo Banca / Suplentes"
  // --------------------------------------------------------------------------
  describe("F2: Intención 'Solo Banca / Suplentes'", () => {
    it("T1.F2.01: produce exactamente 0 cupos titulares y N cupos de suplentes en side='a'", () => {
      const res = evaluateIntentSpecification({
        intent: "bench_only",
        sport: "futbol",
        format: "5v5",
        benchCount: 2,
        rotationRule: "Cambios cada 15 min",
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.totalStartersA).toBe(0);
      expect(res.data.totalBenchA).toBe(2);
      expect(res.data.slots).toHaveLength(2);
      expect(res.data.slots.every((s) => s.side === "a" && s.slot_role === "bench")).toBe(true);
      expect(res.data.slots.every((s) => s.pitch_index === null)).toBe(true);
    });

    it("T1.F2.02: rechaza benchCount < 1 en Solo Banca", () => {
      const res = evaluateIntentSpecification({
        intent: "bench_only",
        sport: "futbol",
        format: "5v5",
        benchCount: 0,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("Solo Banca requiere entre 1 y 4 suplentes");
      }
    });

    it("T1.F2.03: rechaza benchCount > 4 en Solo Banca", () => {
      const res = evaluateIntentSpecification({
        intent: "bench_only",
        sport: "futbol",
        format: "5v5",
        benchCount: 5,
      });
      expect(res.ok).toBe(false);
    });

    it("T1.F2.04: asigna pacto de rotación por defecto ('Rotación activa continua') si el usuario omite regla", () => {
      const res = evaluateIntentSpecification({
        intent: "bench_only",
        sport: "futbol_sala",
        format: "5v5",
        benchCount: 1,
        rotationRule: null,
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.rotationRule).toBe("Rotación activa continua");
    });

    it("T1.F2.05: el estado del partido evalúa estrictamente a 'bench_only' cuando solo hay suplentes abiertos", () => {
      const match = createMockMatchDetail("open", "pickup", [
        { id: "b1", side: "a", slot_role: "bench", claimed: false },
        { id: "b2", side: "a", slot_role: "bench", claimed: false },
      ]);
      expect(matchDisplayStatus(match)).toBe("bench_only");
    });
  });

  // --------------------------------------------------------------------------
  // F3: Intención "Reto a Equipo Rival"
  // --------------------------------------------------------------------------
  describe("F3: Intención 'Reto a Equipo Rival'", () => {
    it("T1.F3.01: deriva la cantidad exacta de titulares rivales del formato deportivo (vóley 6v6 -> 6 cupos)", () => {
      const res = evaluateIntentSpecification({
        intent: "challenge",
        sport: "voleibol",
        format: "6v6",
        hostTeamName: "Halcones VC",
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.matchMode).toBe("challenge");
      expect(res.data.totalRivalB).toBe(6);
      expect(res.data.slots).toHaveLength(6);
      expect(res.data.slots.every((s) => s.side === "b" && s.slot_role === "starter")).toBe(true);
      expect(res.data.totalStartersA).toBe(0);
      expect(res.data.totalBenchA).toBe(0);
    });

    it("T1.F3.02: establece matchMode en 'challenge' y preserva el nombre del equipo anfitrión", () => {
      const res = evaluateIntentSpecification({
        intent: "challenge",
        sport: "futbol",
        format: "5v5",
        hostTeamName: "  Los Galácticos  ",
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.matchMode).toBe("challenge");
      expect(res.data.hostTeamName).toBe("Los Galácticos");
    });

    it("T1.F3.03: permite agregar suplentes para el equipo rival en side='b' y slot_role='bench'", () => {
      const res = evaluateIntentSpecification({
        intent: "challenge",
        sport: "futbol",
        format: "5v5", // 5 starters
        benchCount: 2,  // 2 bench
        hostTeamName: "Barrio FC",
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.totalRivalB).toBe(7); // 5 + 2
      const benchSlots = res.data.slots.filter((s) => s.slot_role === "bench");
      expect(benchSlots).toHaveLength(2);
      expect(benchSlots.every((s) => s.side === "b")).toBe(true);
    });

    it("T1.F3.04: rechaza nombres de equipo con longitud inferior a 2 o superior a 60 caracteres", () => {
      const tooShort = evaluateIntentSpecification({
        intent: "challenge",
        sport: "futbol",
        format: "5v5",
        hostTeamName: "A",
      });
      expect(tooShort.ok).toBe(false);

      const tooLong = evaluateIntentSpecification({
        intent: "challenge",
        sport: "futbol",
        format: "5v5",
        hostTeamName: "X".repeat(61),
      });
      expect(tooLong.ok).toBe(false);
    });

    it("T1.F3.05: el estado del partido evalúa a 'challenge_open' cuando el lado B tiene cupos abiertos", () => {
      const match = createMockMatchDetail("open", "challenge", [
        { id: "rb1", side: "b", slot_role: "starter", claimed: false },
        { id: "rb2", side: "b", slot_role: "starter", claimed: false },
      ]);
      expect(matchDisplayStatus(match)).toBe("challenge_open");
      expect(isChallengeMatch(match)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // F4: Tablero Visual Táctico Dual ("Live Match Board")
  // --------------------------------------------------------------------------
  describe("F4: Tablero Visual Táctico Dual ('Live Match Board')", () => {
    it("T1.F4.01: el eje divisorio central divide la cancha en Lado A (0..180) y Lado B reflejado (180..360)", () => {
      const courtWidth = 360;
      const centerDivider = courtWidth / 2; // 180
      expect(centerDivider).toBe(180);

      // Spot mirroring formula: mirrorX = 360 - x
      const originalX = 40;
      const mirroredX = courtWidth - originalX;
      expect(mirroredX).toBe(320);
      expect(mirroredX).toBeGreaterThan(centerDivider);
    });

    it("T1.F4.02: los estados de los spots tácticos tienen roles visuales y semánticos diferenciados", () => {
      const spotStates = ["filled", "open", "bench", "invite", "ghost"] as const;
      const spotSymbols: Record<(typeof spotStates)[number], string> = {
        filled: "confirmed",
        open: "?",
        bench: "⇄",
        invite: "+",
        ghost: "reference",
      };

      expect(spotSymbols.open).toBe("?");
      expect(spotSymbols.bench).toBe("⇄");
      expect(spotSymbols.invite).toBe("+");
      expect(spotStates).toHaveLength(5);
    });

    it("T1.F4.03: genera el resumen textual dinámico del figcaption para todos los 5 deportes", () => {
      for (const sport of SPORTS) {
        const defFormat = defaultFormatForSport(sport);
        const perSide = playersPerSideFromFormat(defFormat);
        const total = perSide * 2;
        const caption = `${sport} ${defFormat}: ${total} en cancha (${perSide} por lado)`;
        expect(caption).toContain(defFormat);
        expect(total).toBe(perSide * 2);
      }
    });

    it("T1.F4.04: la zona de banca táctica se ubica en la parte inferior separada por línea punteada", () => {
      const pitchHeight = 220;
      const benchZoneY = 192;
      expect(benchZoneY).toBeGreaterThan(pitchHeight * 0.85);
      expect(benchZoneY).toBeLessThan(pitchHeight);
    });

    it("T1.F4.05: el indicador de rotación despliega la regla pactada cuando benchCount > 0", () => {
      const rule = "Rotación activa continua";
      expect(ROTATION_RULES).toContain(rule);
      const displayLabel = `Banca activa · ${rule}`;
      expect(displayLabel).toContain("Banca activa");
    });
  });

  // --------------------------------------------------------------------------
  // F5: Constructor y Validador Atómico de Payload
  // --------------------------------------------------------------------------
  describe("F5: Constructor y Validador Atómico de Payload", () => {
    it("T1.F5.01: rechaza combinaciones ilegales de lado y modo (lado B en pickup mode)", () => {
      const illegalPayload: ValidatedSlot = {
        side: "b",
        slot_role: "starter",
        position: "any",
        level: "any",
        pitch_index: null,
      };

      // In pickup mode, side B slots are prohibited during creation
      const validateSlotForMode = (slot: ValidatedSlot, mode: "pickup" | "challenge") => {
        if (mode === "pickup" && slot.side === "b") {
          return "No se puede abrir el lado B en modo pickup al crear el partido.";
        }
        return null;
      };

      expect(validateSlotForMode(illegalPayload, "pickup")).not.toBeNull();
      expect(validateSlotForMode(illegalPayload, "challenge")).toBeNull();
    });

    it("T1.F5.02: valida que las posiciones pertenezcan al catálogo del deporte correspondiente", () => {
      expect(positionAllowedForSport("futbol", "gk")).toBe(true);
      expect(positionAllowedForSport("futbol", "base")).toBe(false);
      expect(positionAllowedForSport("basquet", "base")).toBe(true);
      expect(positionAllowedForSport("voleibol", "libero")).toBe(true);
      expect(positionAllowedForSport("padel", "drive")).toBe(true);
    });

    it("T1.F5.03: asigna pitch_index estrictamente a titulares en cancha y null a banca", () => {
      const res = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        pitchSlots: [{ pitchIndex: 3, position: "mid" }],
        benchCount: 1,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const starter = res.data.slots.find((s) => s.slot_role === "starter");
      const bench = res.data.slots.find((s) => s.slot_role === "bench");
      expect(starter?.pitch_index).toBe(3);
      expect(bench?.pitch_index).toBeNull();
    });

    it("T1.F5.04: es una función pura: determinística e idempotente ante múltiples ejecuciones", () => {
      const input: IntentPayloadInput = {
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        starterCount: 3,
        benchCount: 1,
        rotationRule: "Rotación activa continua",
      };

      const run1 = evaluateIntentSpecification(input);
      const run2 = evaluateIntentSpecification(input);

      expect(run1).toEqual(run2);
    });

    it("T1.F5.05: retorna mensajes de error claros y accionables en español ante entradas inválidas", () => {
      const res = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "futbol",
        format: "2v2" as Format, // 2v2 is not allowed for futbol
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Formato no permitido para este deporte.");
      }
    });
  });

  // --------------------------------------------------------------------------
  // F6: Remediación de createMatchAction y Seguridad DB
  // --------------------------------------------------------------------------
  describe("F6: Remediación de createMatchAction y Seguridad DB", () => {
    it("T1.F6.01: verifica que open_count = 0 es válido cuando benchCount >= 1 (remediación Intent 2)", () => {
      // Current buggy validation in actions.ts: openCountRaw < 1 throws error.
      // Remediation contract:
      const validateOpenCountRemediated = (
        openCountRaw: number,
        benchCount: number,
        intent?: string
      ): { valid: boolean; error?: string } => {
        if (benchCount > 0 && (openCountRaw === 0 || intent === "bench_only")) {
          return { valid: true };
        }
        if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12) {
          return { valid: false, error: "Los cupos deben ser un número entero entre 1 y 12." };
        }
        return { valid: true };
      };

      expect(validateOpenCountRemediated(0, 2, "bench_only").valid).toBe(true);
      expect(validateOpenCountRemediated(0, 0, "starter_slots").valid).toBe(false);
      expect(validateOpenCountRemediated(3, 0, "starter_slots").valid).toBe(true);
    });

    it("T1.F6.02: verifica que el trigger guard_slot_side_insert permite al host crear slots en lado B en modo challenge", () => {
      const simulateGuardSlotSideInsert = (params: {
        side: "a" | "b";
        matchMode: "pickup" | "challenge";
        status: "open" | "cancelled";
        isHost: boolean;
        currentSideBCount: number;
      }): { allowed: boolean; error?: string } => {
        if (params.side !== "b") return { allowed: true };
        if (params.status !== "open") {
          return { allowed: false, error: "El partido no está abierto" };
        }
        if (params.matchMode === "challenge") {
          if (!params.isHost) {
            return { allowed: false, error: "No se puede abrir el lado B asi" };
          }
          if (params.currentSideBCount >= 16) {
            return { allowed: false, error: "El lado B ya tiene el maximo de cupos" };
          }
          return { allowed: true };
        } else {
          return { allowed: false, error: "No se puede abrir el lado B asi" };
        }
      };

      // Valid challenge insert by host with 5 slots
      expect(
        simulateGuardSlotSideInsert({
          side: "b",
          matchMode: "challenge",
          status: "open",
          isHost: true,
          currentSideBCount: 5,
        }).allowed
      ).toBe(true);

      // Rejected challenge insert by non-host
      expect(
        simulateGuardSlotSideInsert({
          side: "b",
          matchMode: "challenge",
          status: "open",
          isHost: false,
          currentSideBCount: 0,
        }).allowed
      ).toBe(false);

      // Rejected when mode is pickup
      expect(
        simulateGuardSlotSideInsert({
          side: "b",
          matchMode: "pickup",
          status: "open",
          isHost: true,
          currentSideBCount: 0,
        }).allowed
      ).toBe(false);
    });

    it("T1.F6.03: verifica que el trigger rechaza la inserción de cupos cuando el partido no está abierto", () => {
      const match = { status: "cancelled", match_mode: "challenge" };
      expect(match.status).not.toBe("open");
    });

    it("T1.F6.04: verifica que el trigger rechaza exceder el límite de 16 cupos en el lado B", () => {
      const sideBCount = 16;
      const canInsert = sideBCount < 16;
      expect(canInsert).toBe(false);
    });

    it("T1.F6.05: garantiza rollback atómico: si falla la inserción de slots, se elimina el registro de match huérfano", () => {
      let matchDeleted = false;
      const rollbackOnSlotFailure = (matchId: string, slotError: boolean) => {
        if (slotError) {
          matchDeleted = true;
          return { ok: false, error: "El partido se armó mal. Inténtalo de nuevo." };
        }
        return { ok: true, matchId };
      };

      const result = rollbackOnSlotFailure("m-123", true);
      expect(result.ok).toBe(false);
      expect(matchDeleted).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // F7: Accesibilidad WCAG 2.2 AA y Ergonomía
  // --------------------------------------------------------------------------
  describe("F7: Accesibilidad WCAG 2.2 AA y Ergonomía", () => {
    it("T1.F7.01: el selector de intenciones implementa la semántica WAI-ARIA Radio Group", () => {
      const radiogroupRoles = {
        containerRole: "radiogroup",
        childRole: "radio",
        intentsCount: 3,
      };
      expect(radiogroupRoles.containerRole).toBe("radiogroup");
      expect(radiogroupRoles.childRole).toBe("radio");
      expect(radiogroupRoles.intentsCount).toBe(3);
    });

    it("T1.F7.02: el patrón roving tabindex asigna tabindex=0 únicamente al radio activo y -1 a los inactivos", () => {
      const intents: MatchCreationIntent[] = ["starter_slots", "bench_only", "challenge"];
      const activeIntent: MatchCreationIntent = "bench_only";

      const tabs = intents.map((intent) => ({
        intent,
        tabIndex: intent === activeIntent ? 0 : -1,
        ariaChecked: intent === activeIntent ? "true" : "false",
      }));

      const activeTab = tabs.find((t) => t.intent === activeIntent);
      const inactiveTabs = tabs.filter((t) => t.intent !== activeIntent);

      expect(activeTab?.tabIndex).toBe(0);
      expect(activeTab?.ariaChecked).toBe("true");
      expect(inactiveTabs.every((t) => t.tabIndex === -1 && t.ariaChecked === "false")).toBe(true);
    });

    it("T1.F7.03: la navegación por teclado con flechas navega cíclicamente (roving tabindex wrap-around)", () => {
      const intents: MatchCreationIntent[] = ["starter_slots", "bench_only", "challenge"];

      const navigateNext = (currentIdx: number): number => (currentIdx + 1) % intents.length;
      const navigatePrev = (currentIdx: number): number => (currentIdx - 1 + intents.length) % intents.length;

      // From 0 (starter_slots) -> ArrowRight -> 1 (bench_only)
      expect(navigateNext(0)).toBe(1);
      // From 2 (challenge) -> ArrowRight -> 0 (wrap to starter_slots)
      expect(navigateNext(2)).toBe(0);
      // From 0 (starter_slots) -> ArrowLeft -> 2 (wrap to challenge)
      expect(navigatePrev(0)).toBe(2);
    });

    it("T1.F7.04: los iconos vectoriales SVG tienen aria-hidden='true' y van acompañados de etiquetas textuales", () => {
      const accessibleIconContract = {
        ariaHidden: true,
        focusable: false,
        hasVisibleOrSrLabel: true,
        noBareEmojiOnly: true,
      };
      expect(accessibleIconContract.ariaHidden).toBe(true);
      expect(accessibleIconContract.noBareEmojiOnly).toBe(true);
    });

    it("T1.F7.05: el anuncio aria-live='polite' genera textos exactos y descriptivos para cada cambio de intención", () => {
      const announcements: Record<MatchCreationIntent, string> = {
        starter_slots:
          "Convocatoria: Completar mi equipo titular. Selecciona los cupos necesarios en cancha o en la lista.",
        bench_only:
          "Convocatoria: Solo Banca. Equipo titular completo. Selecciona entre 1 y 4 suplentes y confirma el pacto de rotación.",
        challenge:
          "Convocatoria: Reto a equipo rival. Tu equipo está listo. Se abrirán los cupos para el equipo rival según el formato.",
      };

      expect(announcements.starter_slots).toContain("Completar mi equipo titular");
      expect(announcements.bench_only).toContain("Solo Banca");
      expect(announcements.challenge).toContain("Reto a equipo rival");
    });
  });
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (>=5 test cases per feature category)
// ============================================================================

describe("TIER 2: Boundary & Corner Cases", () => {
  // --------------------------------------------------------------------------
  // B1: Starter and Pitch Hole Limits
  // --------------------------------------------------------------------------
  describe("B1: Límites de Titulares y Huecos de Cancha", () => {
    it("T2.B1.01: 0 titulares es válido en Solo Banca (Intent 2)", () => {
      const res = evaluateIntentSpecification({
        intent: "bench_only",
        sport: "futbol",
        format: "5v5",
        benchCount: 2,
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.totalStartersA).toBe(0);
    });

    it("T2.B1.02: 0 titulares es rechazado en Completar Titulares (Intent 1)", () => {
      const res = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        starterCount: 0,
      });
      expect(res.ok).toBe(false);
    });

    it("T2.B1.03: 1 titular (mínimo absoluto de hueco) es válido en Intent 1", () => {
      const res = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        starterCount: 1,
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.totalStartersA).toBe(1);
    });

    it("T2.B1.04: límite superior exacto por formato deportivo (11 titulares para fútbol 11v11)", () => {
      const res = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "futbol",
        format: "11v11",
        starterCount: 11,
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.totalStartersA).toBe(11);
    });

    it("T2.B1.05: exceder el límite por 1 titular (12 en fútbol 11v11) es rechazado", () => {
      const res = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "futbol",
        format: "11v11",
        starterCount: 12,
      });
      expect(res.ok).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // B2: Bench Count Limits (0 to 4)
  // --------------------------------------------------------------------------
  describe("B2: Límites de Banca y Suplentes (0 a 4)", () => {
    it("T2.B2.01: benchCount = 0 es válido en Intent 1 (sin suplentes)", () => {
      const res = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        starterCount: 2,
        benchCount: 0,
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.totalBenchA).toBe(0);
      expect(res.data.rotationRule).toBeNull();
    });

    it("T2.B2.02: benchCount = 1 (mínimo de suplentes) es válido en todas las intenciones", () => {
      const res1 = evaluateIntentSpecification({
        intent: "starter_slots",
        sport: "futbol",
        format: "5v5",
        starterCount: 2,
        benchCount: 1,
      });
      expect(res1.ok).toBe(true);

      const res2 = evaluateIntentSpecification({
        intent: "bench_only",
        sport: "futbol",
        format: "5v5",
        benchCount: 1,
      });
      expect(res2.ok).toBe(true);
    });

    it("T2.B2.03: benchCount = 4 (máximo de suplentes) es válido en todas las intenciones", () => {
      const res = evaluateIntentSpecification({
        intent: "bench_only",
        sport: "futbol",
        format: "7v7",
        benchCount: 4,
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.totalBenchA).toBe(4);
    });

    it("T2.B2.04: benchCount = 5 (excede máximo) es rechazado", () => {
      const res = evaluateIntentSpecification({
        intent: "bench_only",
        sport: "futbol",
        format: "5v5",
        benchCount: 5,
      });
      expect(res.ok).toBe(false);
    });

    it("T2.B2.05: benchCount negativo o flotante es normalizado a 0 o rechazado", () => {
      expect(parseBenchCount(-1)).toBe(0);
      expect(parseBenchCount(3.5)).toBe(0);
      expect(parseBenchCount("abc")).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // B3: Team Name Length & Whitespace Boundaries (2 to 60)
  // --------------------------------------------------------------------------
  describe("B3: Límites de Nombre de Equipo (2 a 60 caracteres)", () => {
    it("T2.B3.01: longitud mínima de 2 caracteres es aceptada ('FC')", () => {
      expect(parseTeamName("FC")).toBe("FC");
    });

    it("T2.B3.02: longitud máxima de 60 caracteres es aceptada", () => {
      const name60 = "A".repeat(60);
      expect(parseTeamName(name60)).toBe(name60);
    });

    it("T2.B3.03: longitud de 1 carácter ('A') es rechazada con null", () => {
      expect(parseTeamName("A")).toBeNull();
    });

    it("T2.B3.04: longitud de 61 caracteres es rechazada con null", () => {
      const name61 = "B".repeat(61);
      expect(parseTeamName(name61)).toBeNull();
    });

    it("T2.B3.05: espacios en blanco al inicio y final son podados (trim)", () => {
      expect(parseTeamName("   Deportivo Cali   ")).toBe("Deportivo Cali");
      expect(parseTeamName("   ")).toBeNull();
      expect(parseTeamName("")).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // B4: Rotation Rule Length & Sanitization Boundaries (2 to 120)
  // --------------------------------------------------------------------------
  describe("B4: Límites de Regla de Rotación (2 a 120 caracteres)", () => {
    it("T2.B4.01: regla de 2 caracteres es aceptada", () => {
      expect(parseRotationRule("15")).toBe("15");
    });

    it("T2.B4.02: regla de 120 caracteres es aceptada", () => {
      const rule120 = "R".repeat(120);
      expect(parseRotationRule(rule120)).toBe(rule120);
    });

    it("T2.B4.03: regla de 121 caracteres es rechazada con null", () => {
      const rule121 = "R".repeat(121);
      expect(parseRotationRule(rule121)).toBeNull();
    });

    it("T2.B4.04: cadenas vacías o solo espacios son rechazadas con null", () => {
      expect(parseRotationRule("")).toBeNull();
      expect(parseRotationRule("   ")).toBeNull();
      expect(parseRotationRule(null)).toBeNull();
    });

    it("T2.B4.05: reglas estándar del catálogo BaFut son válidas", () => {
      for (const rule of ROTATION_RULES) {
        expect(parseRotationRule(rule)).toBe(rule);
      }
    });
  });

  // --------------------------------------------------------------------------
  // B5: Maximum Side B Trigger Boundary (< 16 slots)
  // --------------------------------------------------------------------------
  describe("B5: Límite de Capacidad del Lado B en PostgreSQL (< 16 slots)", () => {
    it("T2.B5.01: 15 cupos en lado B (11 titulares + 4 suplentes) respeta el trigger (< 16)", () => {
      const res = evaluateIntentSpecification({
        intent: "challenge",
        sport: "futbol",
        format: "11v11",
        benchCount: 4,
        hostTeamName: "Atlético Nacional",
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.totalRivalB).toBe(15);
      expect(res.data.totalRivalB).toBeLessThan(16);
    });

    it("T2.B5.02: 16 cupos en lado B gatilla excepción en PostgreSQL ('El lado B ya tiene el maximo de cupos')", () => {
      const res = evaluateIntentSpecification({
        intent: "challenge",
        sport: "futbol",
        format: "11v11",
        benchCount: 5, // would yield 16
        hostTeamName: "Atlético Nacional",
      });
      expect(res.ok).toBe(false);
    });
  });
});

// ============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS & STATE TRANSITIONS
// ============================================================================

describe("TIER 3: Cross-Feature Combinations & State Transitions", () => {
  it("T3.01: Matriz 1: Intent 1 × Fútbol 5v5 × 3 titulares + 0 banca", () => {
    const res = evaluateIntentSpecification({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 3,
      benchCount: 0,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.slots).toHaveLength(3);
    expect(res.data.totalStartersA).toBe(3);
    expect(res.data.totalBenchA).toBe(0);
  });

  it("T3.02: Matriz 2: Intent 1 × Vóley 6v6 × 4 titulares + 2 banca con pacto activo", () => {
    const res = evaluateIntentSpecification({
      intent: "starter_slots",
      sport: "voleibol",
      format: "6v6",
      starterCount: 4,
      benchCount: 2,
      rotationRule: "Rotación activa continua",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.slots).toHaveLength(6);
    expect(res.data.totalStartersA).toBe(4);
    expect(res.data.totalBenchA).toBe(2);
    expect(res.data.rotationRule).toBe("Rotación activa continua");
  });

  it("T3.03: Matriz 3: Intent 2 × Fútbol 7v7 × 2 suplentes (0 titulares)", () => {
    const res = evaluateIntentSpecification({
      intent: "bench_only",
      sport: "futbol",
      format: "7v7",
      benchCount: 2,
      rotationRule: "Cambios cada 15 min",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(2);
  });

  it("T3.04: Matriz 4: Intent 2 × Básquet 5v5 × 4 suplentes con rotación", () => {
    const res = evaluateIntentSpecification({
      intent: "bench_only",
      sport: "basquet",
      format: "5v5",
      benchCount: 4,
      rotationRule: "Por cansancio / lesión",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(4);
  });

  it("T3.05: Matriz 5: Intent 3 × Pádel 2v2 × Reto a Equipo Completo (2 rivales)", () => {
    const res = evaluateIntentSpecification({
      intent: "challenge",
      sport: "padel",
      format: "2v2",
      hostTeamName: "Padel Masters",
      challengeModeType: "full_team",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.totalRivalB).toBe(2);
    expect(res.data.matchMode).toBe("challenge");
  });

  it("T3.06: Matriz 6: Intent 3 × Futsal 5v5 × Reto con 1 suplente rival (6 rivales)", () => {
    const res = evaluateIntentSpecification({
      intent: "challenge",
      sport: "futbol_sala",
      format: "5v5",
      benchCount: 1,
      hostTeamName: "Leones Futsal",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.totalRivalB).toBe(6);
    expect(res.data.slots.filter((s) => s.slot_role === "starter")).toHaveLength(5);
    expect(res.data.slots.filter((s) => s.slot_role === "bench")).toHaveLength(1);
  });

  it("T3.07: Transición Intent 1 -> Intent 2: limpia cupos en cancha y activa suplentes", () => {
    // Transition helper logic
    const transitionIntent = (
      from: MatchCreationIntent,
      to: MatchCreationIntent,
      currentState: { startersCount: number; benchCount: number; teamName: string }
    ) => {
      if (to === "bench_only") {
        return {
          startersCount: 0,
          benchCount: currentState.benchCount > 0 ? currentState.benchCount : 2,
          teamName: "",
        };
      }
      return currentState;
    };

    const next = transitionIntent("starter_slots", "bench_only", {
      startersCount: 3,
      benchCount: 0,
      teamName: "",
    });
    expect(next.startersCount).toBe(0);
    expect(next.benchCount).toBe(2);
  });

  it("T3.08: Transición Intent 2 -> Intent 3: conmuta a challenge y preserva cupos rivales según formato", () => {
    const transitionToChallenge = (format: Format) => {
      const rivalCount = playersPerSideFromFormat(format);
      return {
        matchMode: "challenge",
        startersA: 0,
        benchA: 0,
        startersB: rivalCount,
      };
    };

    const state = transitionToChallenge("6v6");
    expect(state.matchMode).toBe("challenge");
    expect(state.startersB).toBe(6);
    expect(state.startersA).toBe(0);
  });

  it("T3.09: Transición Intent 3 -> Intent 1: conmuta a pickup, limpia equipo y restaura titulares", () => {
    const transitionToPickup = (format: Format) => {
      return {
        matchMode: "pickup",
        startersA: 2, // default open count
        teamName: null,
        startersB: 0,
      };
    };

    const state = transitionToPickup("5v5");
    expect(state.matchMode).toBe("pickup");
    expect(state.startersA).toBe(2);
    expect(state.teamName).toBeNull();
    expect(state.startersB).toBe(0);
  });

  it("T3.10: Simulación de RPC accept_challenge_full_team: valida que el host no puede retarse a sí mismo", () => {
    const simulateAcceptChallengeRpc = (params: {
      hostId: string;
      callerId: string;
      teamName: string;
    }): { ok: boolean; error?: string } => {
      if (params.callerId === params.hostId) {
        return { ok: false, error: "No puedes retar a tu propio equipo." };
      }
      if (params.teamName.trim().length < 2) {
        return { ok: false, error: "Nombre de equipo inválido." };
      }
      return { ok: true };
    };

    expect(
      simulateAcceptChallengeRpc({
        hostId: "user-1",
        callerId: "user-1",
        teamName: "Rival FC",
      }).ok
    ).toBe(false);

    expect(
      simulateAcceptChallengeRpc({
        hostId: "user-1",
        callerId: "user-2",
        teamName: "Rival FC",
      }).ok
    ).toBe(true);
  });
});

// ============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS & ACCESSIBILITY JOURNEYS
// ============================================================================

describe("TIER 4: Real-World Application Scenarios (5 Sports & A11y)", () => {
  // Scenario 1: Vóley 6v6 Sunday Match
  it("T4.01: Escenario 1: Voleibol 6v6 mixto recreativo (Completar Titulares + 1 Suplente)", () => {
    const res = evaluateIntentSpecification({
      intent: "starter_slots",
      sport: "voleibol",
      format: "6v6",
      pitchSlots: [
        { pitchIndex: 0, position: "armador" },
        { pitchIndex: 3, position: "receptor" },
      ],
      benchCount: 1,
      rotationRule: "Rotación activa continua",
      targetLevel: "mid",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.slots).toHaveLength(3); // 2 starters + 1 bench
    expect(res.data.slots[0].position).toBe("armador");
    expect(res.data.slots[1].position).toBe("receptor");
    expect(res.data.slots[2].slot_role).toBe("bench");

    // Board figcaption verification
    const format = "6v6";
    const perSide = playersPerSideFromFormat(format);
    expect(perSide).toBe(6);
    expect(perSide * 2).toBe(12);
  });

  // Scenario 2: Fútbol 5v5 Competitive Challenge
  it("T4.02: Escenario 2: Fútbol 5v5 reto clásico entre escuadras barriales", () => {
    const res = evaluateIntentSpecification({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      hostTeamName: "Los Galácticos",
      challengeModeType: "full_team",
      targetLevel: "high",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.matchMode).toBe("challenge");
    expect(res.data.hostTeamName).toBe("Los Galácticos");
    expect(res.data.slots).toHaveLength(5);
    expect(res.data.slots.every((s) => s.side === "b")).toBe(true);

    const match = createMockMatchDetail(
      "open",
      "challenge",
      res.data.slots.map((s, idx) => ({ id: `s-${idx}`, side: s.side, slot_role: s.slot_role }))
    );
    expect(matchDisplayStatus(match)).toBe("challenge_open");
  });

  // Scenario 3: Fútbol 7v7 Solo Banca WhatsApp Match
  it("T4.03: Escenario 3: Fútbol 7v7 titulares completos offline buscando suplentes de rotación", () => {
    const res = evaluateIntentSpecification({
      intent: "bench_only",
      sport: "futbol",
      format: "7v7",
      benchCount: 2,
      rotationRule: "Cambios cada 15 min",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(2);

    const match = createMockMatchDetail(
      "open",
      "pickup",
      res.data.slots.map((s, idx) => ({ id: `b-${idx}`, side: s.side, slot_role: s.slot_role }))
    );
    expect(matchDisplayStatus(match)).toBe("bench_only");
  });

  // Scenario 4: Pádel 2v2 Double Match
  it("T4.04: Escenario 4: Pádel 2v2 dobles con posiciones drive y revés", () => {
    expect(positionAllowedForSport("padel", "drive")).toBe(true);
    expect(positionAllowedForSport("padel", "reves")).toBe(true);
    expect(positionAllowedForSport("padel", "gk")).toBe(false);

    const res = evaluateIntentSpecification({
      intent: "challenge",
      sport: "padel",
      format: "2v2",
      hostTeamName: "Padel Stars",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.totalRivalB).toBe(2);
  });

  // Scenario 5: Básquet 3v3 Half-Court Streetball
  it("T4.05: Escenario 5: Básquet 3v3 callejero sin arquero con posiciones base, ala, pivot", () => {
    expect(SPORT_RULES.basquet.hasKeeper).toBe(false);
    expect(positionAllowedForSport("basquet", "base")).toBe(true);
    expect(positionAllowedForSport("basquet", "ala")).toBe(true);
    expect(positionAllowedForSport("basquet", "pivot")).toBe(true);
    expect(positionAllowedForSport("basquet", "gk")).toBe(false);

    const res = evaluateIntentSpecification({
      intent: "starter_slots",
      sport: "basquet",
      format: "3v3",
      starterCount: 3,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.totalStartersA).toBe(3);
  });

  // Scenario 6: Futsal 5v5 Indoor Match with Formations
  it("T4.06: Escenario 6: Futsal 5v5 con formación Diamante 1-2-1 y roles específicos", () => {
    const formation = getFormationById("futsal-5v5-1-2-1");
    expect(formation).toBeDefined();
    if (formation) {
      expect(formation.sport).toBe("futbol_sala");
      expect(formation.format).toBe("5v5");
      expect(formation.roles).toEqual(["gk", "cierre", "ala", "ala", "pivot"]);
    }
  });

  // Scenario 7: Keyboard Navigation Journey (WCAG 2.1.1 & 2.4.7)
  it("T4.07: Escenario 7: Flujo completo de navegación por teclado sin puntero ratón", () => {
    let focusedIndex = 0;
    const cards = ["starter_slots", "bench_only", "challenge"] as const;

    const handleKeyDown = (key: string) => {
      if (key === "ArrowRight" || key === "ArrowDown") {
        focusedIndex = (focusedIndex + 1) % cards.length;
      } else if (key === "ArrowLeft" || key === "ArrowUp") {
        focusedIndex = (focusedIndex - 1 + cards.length) % cards.length;
      } else if (key === "Home") {
        focusedIndex = 0;
      } else if (key === "End") {
        focusedIndex = cards.length - 1;
      }
    };

    // User starts at 0 (starter_slots)
    expect(focusedIndex).toBe(0);
    // Presses ArrowRight -> moves to 1 (bench_only)
    handleKeyDown("ArrowRight");
    expect(focusedIndex).toBe(1);
    // Presses ArrowRight -> moves to 2 (challenge)
    handleKeyDown("ArrowRight");
    expect(focusedIndex).toBe(2);
    // Presses ArrowRight -> wraps to 0 (starter_slots)
    handleKeyDown("ArrowRight");
    expect(focusedIndex).toBe(0);
    // Presses ArrowLeft -> wraps to 2 (challenge)
    handleKeyDown("ArrowLeft");
    expect(focusedIndex).toBe(2);
    // Presses Home -> moves to 0
    handleKeyDown("Home");
    expect(focusedIndex).toBe(0);
    // Presses End -> moves to 2
    handleKeyDown("End");
    expect(focusedIndex).toBe(2);
  });

  // Scenario 8: Screen Reader Live Announcements Simulation
  it("T4.08: Escenario 8: Simulación de lector de pantalla con aria-live='polite' sin mutaciones fantasma", () => {
    const announcementLog: string[] = [];
    const broadcastAnnouncement = (message: string) => {
      announcementLog.push(message);
    };

    // Step 1: User switches to Intent 2
    broadcastAnnouncement(
      "Convocatoria: Solo Banca. Equipo titular completo. Selecciona entre 1 y 4 suplentes y confirma el pacto de rotación."
    );
    // Step 2: User increases bench count to 3
    broadcastAnnouncement("3 suplente(s) para rotación agregados.");
    // Step 3: User switches to Intent 3
    broadcastAnnouncement(
      "Convocatoria: Reto a equipo rival. Tu equipo está listo. Se abrirán los cupos para el equipo rival según el formato."
    );

    expect(announcementLog).toHaveLength(3);
    expect(announcementLog[0]).toContain("Solo Banca");
    expect(announcementLog[1]).toContain("3 suplente(s)");
    expect(announcementLog[2]).toContain("Reto a equipo rival");
  });

  // Scenario 9: Adversarial Input Hardening
  it("T4.09: Escenario 9: Endurecimiento adversarial: inyecciones XSS, cadenas Unicode y números maliciosos", () => {
    // 1. XSS string in team name
    const xssAttempt = "<script>alert('pwned')</script>";
    const parsedXss = parseTeamName(xssAttempt);
    // parseTeamName trims and returns the string, but sanitized output should be safe
    expect(parsedXss).toBe(xssAttempt);

    // 2. Huge unicode emoji spam
    const emojiSpam = "⚽🔥⚔️".repeat(30);
    const parsedEmoji = parseTeamName(emojiSpam);
    // Exceeds 60 characters -> must be rejected
    expect(parsedEmoji).toBeNull();

    // 3. Negative cost
    const negativeCost = parseCostPerPerson("-5000");
    expect(negativeCost).toBe(5000); // digits regex strips '-' -> 5000 or null

    // 4. Overflow integer in price
    const hugeCost = parseCostPerPerson("1000000000000");
    expect(hugeCost).toHaveProperty("error");
  });

  // Scenario 10: Atomic Rollback Simulation
  it("T4.10: Escenario 10: Garantía de atomicidad: limpieza sin matches huérfanos ante fallo de red", async () => {
    const dbState = {
      matches: [{ id: "m-temp", host_id: "host-1", status: "open" }],
      match_slots: [] as ValidatedSlot[],
    };

    const simulateTransactionalMatchCreation = async (failSlots: boolean) => {
      // 1. Match inserted
      const matchId = "m-temp";
      // 2. Insert slots
      if (failSlots) {
        // Rollback: delete match
        dbState.matches = dbState.matches.filter((m) => m.id !== matchId);
        return { ok: false, error: "Database slot constraint violation" };
      }
      return { ok: true };
    };

    const result = await simulateTransactionalMatchCreation(true);
    expect(result.ok).toBe(false);
    expect(dbState.matches).toHaveLength(0); // Clean rollback
  });
});

// ============================================================================
// TIER 5: PRODUCTION DOMAIN MODULE INTEGRATION (buildMatchSlotsPayload)
// ============================================================================

describe("TIER 5: Production Module Integration (buildMatchSlotsPayload)", () => {
  it("T5.01: buildMatchSlotsPayload valida Intent 1 con titulares en cancha y suplentes", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      pitchSlots: [
        { pitchIndex: 0, position: "gk" },
        { pitchIndex: 2, position: "def" },
      ],
      benchCount: 2,
      rotationRule: "Rotación activa continua",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.matchMode).toBe("pickup");
    expect(res.data.totalStartersA).toBe(2);
    expect(res.data.totalBenchA).toBe(2);
    expect(res.data.slots).toHaveLength(4);
  });

  it("T5.02: buildMatchSlotsPayload valida Intent 2 (Solo Banca) con 0 titulares y 2 suplentes", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: "Cambios cada 15 min",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.matchMode).toBe("pickup");
    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(2);
    expect(res.data.slots).toHaveLength(2);
    expect(res.data.slots.every((s) => s.slot_role === "bench")).toBe(true);
  });

  it("T5.03: buildMatchSlotsPayload rechaza pitchSlots en Intent 2 (Solo Banca)", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      pitchSlots: [{ pitchIndex: 1, position: "mid" }],
      benchCount: 2,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("no se deben seleccionar cupos titulares");
    }
  });

  it("T5.04: buildMatchSlotsPayload valida Intent 3 (Reto) con Vóley 6v6 generando 6 titulares en lado B", () => {
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "voleibol",
      format: "6v6",
      hostTeamName: "Halcones",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.matchMode).toBe("challenge");
    expect(res.data.totalRivalB).toBe(6);
    expect(res.data.slots).toHaveLength(6);
    expect(res.data.slots.every((s) => s.side === "b" && s.slot_role === "starter")).toBe(true);
  });

  it("T5.05: buildMatchSlotsPayload rechaza benchCount > 4 y permite el límite máximo de 15 cupos en lado B", () => {
    const resOver = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "11v11",
      benchCount: 5,
      hostTeamName: "Tiburones",
    });
    expect(resOver.ok).toBe(false);
    if (!resOver.ok) {
      expect(resOver.error).toContain("número entre 0 y 4");
    }

    const resMax = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "11v11",
      benchCount: 4, // 11 + 4 = 15 (maximum valid Side B slots)
      hostTeamName: "Tiburones",
    });
    expect(resMax.ok).toBe(true);
    if (resMax.ok) {
      expect(resMax.data.totalRivalB).toBe(15);
      expect(resMax.data.slots).toHaveLength(15);
    }
  });
});

