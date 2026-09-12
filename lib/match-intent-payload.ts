import {
  formatAllowedForSport,
  isPosition,
  isSport,
  positionAllowedForSport,
  SPORT_RULES,
  type Format,
  type Position,
  type Sport,
} from "@/lib/sport-rules";
import {
  formationsForSportFormat,
  getFormationById,
  playersPerSideFromFormat,
} from "@/lib/formations-catalog";
import { LEVELS, type Level } from "@/lib/constants";

/**
 * The 3 mutually exclusive match creation intents (R1).
 */
export type MatchCreationIntent = "starter_slots" | "bench_only" | "challenge";

/**
 * Challenge modality for Intent 3.
 */
export type ChallengeModeType = "full_team" | "open_slots";

/**
 * A single pitch spot selected on the interactive formation board.
 */
export interface IntentPitchSlotInput {
  pitchIndex: number;
  position?: Position | string;
  level?: Level | string;
}

/**
 * Raw input payload submitted by the UI or Server Action.
 */
export interface IntentPayloadInput {
  intent: MatchCreationIntent;
  sport: Sport | string;
  format: Format | string;
  formationId?: string | null;
  pitchSlots?: IntentPitchSlotInput[];
  starterCount?: number;
  benchCount?: number;
  rotationRule?: string | null;
  hostTeamName?: string | null;
  challengeModeType?: ChallengeModeType;
  /** Optional position override for bulk starter slots */
  defaultPosition?: Position | string;
  /** Optional level override */
  defaultLevel?: Level | string;
  /** Flag indicating whether the team needs a goalkeeper */
  needKeeper?: boolean;
}

/**
 * A single sanitized, typed match slot ready for database insertion.
 */
export interface ValidatedSlot {
  side: "a" | "b";
  slot_role: "starter" | "bench";
  position: Position;
  level: Level;
  pitch_index: number | null;
}

/**
 * Complete validated match payload conforming to PostgreSQL constraints and triggers.
 */
export interface ValidatedMatchPayload {
  matchMode: "pickup" | "challenge";
  hostTeamName: string | null;
  rotationRule: string | null;
  slots: ValidatedSlot[];
  totalStartersA: number;
  totalBenchA: number;
  totalRivalB: number;
  totalBenchB?: number;
}

/**
 * Result type for pure domain validation.
 */
export type MatchPayloadResult =
  | { ok: true; data: ValidatedMatchPayload }
  | { ok: false; error: string };

const DEFAULT_ROTATION_RULE = "Rotación activa continua";

export function sanitizeTeamName(
  raw: unknown,
): { ok: true; team: string | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, team: null };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "El nombre de tu equipo debe tener entre 2 y 60 caracteres." };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: true, team: null };
  }
  if (trimmed.length < 2 || trimmed.length > 60) {
    return { ok: false, error: "El nombre de tu equipo debe tener entre 2 y 60 caracteres." };
  }
  return { ok: true, team: trimmed };
}

export function sanitizeRotationRule(
  raw: unknown,
): { ok: true; rule: string | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, rule: DEFAULT_ROTATION_RULE };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "La regla de rotación debe tener entre 2 y 120 caracteres." };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: true, rule: DEFAULT_ROTATION_RULE };
  }
  if (trimmed.length < 2 || trimmed.length > 120) {
    return { ok: false, error: "La regla de rotación debe tener entre 2 y 120 caracteres." };
  }
  return { ok: true, rule: trimmed };
}

/**
 * Pure, deterministic payload validator and slot builder.
 * Enforces sports rules, format math, and database invariants.
 */
export function buildMatchSlotsPayload(input: IntentPayloadInput): MatchPayloadResult {
  // 1. Validate Sport
  if (!isSport(input.sport as string)) {
    return { ok: false, error: "Elige un deporte válido." };
  }
  const sport = input.sport as Sport;

  // 2. Validate Format
  const formatStr = String(input.format ?? "").trim();
  if (!formatAllowedForSport(sport, formatStr as Format)) {
    return { ok: false, error: "Ese formato no aplica para el deporte." };
  }
  const format = formatStr as Format;
  const perSide = playersPerSideFromFormat(format);

  // 3. Validate Formation (if provided)
  let formationId: string | null = null;
  if (input.formationId && input.formationId.trim()) {
    const rawId = input.formationId.trim();
    let formation = getFormationById(rawId);
    if (!formation || formation.sport !== sport || formation.format !== format) {
      const allFormations = formationsForSportFormat(sport, format);
      const matched = allFormations.find(
        (f) =>
          f.id === rawId ||
          (f.name && rawId.toLowerCase().endsWith(f.name.toLowerCase())) ||
          (f.name && f.name.toLowerCase() === rawId.toLowerCase()) ||
          f.label.toLowerCase() === rawId.toLowerCase(),
      );
      if (matched) {
        formation = matched;
      }
    }
    if (!formation || formation.sport !== sport || formation.format !== format) {
      return { ok: false, error: "Esa formación no aplica para el deporte/formato." };
    }
    formationId = formation.id;
  }

  // 4. Sanitize Bench Count (0 to 4)
  const rawBench = input.benchCount ?? 0;
  if (!Number.isInteger(rawBench) || rawBench < 0 || rawBench > 4) {
    return { ok: false, error: "Los suplentes deben ser un número entre 0 y 4." };
  }
  const benchCount = rawBench;

  // 5. Sanitize Default Level & Position
  const defaultLevel: Level = (LEVELS as readonly string[]).includes(input.defaultLevel ?? "")
    ? (input.defaultLevel as Level)
    : "any";

  let defaultPosition: Position = "any";
  if (input.defaultPosition && input.defaultPosition !== "any") {
    if (!isPosition(input.defaultPosition) || !positionAllowedForSport(sport, input.defaultPosition as Position)) {
      return { ok: false, error: "Esa posición no aplica para el deporte." };
    }
    defaultPosition = input.defaultPosition as Position;
  }

  const needKeeper = Boolean(input.needKeeper && SPORT_RULES[sport].hasKeeper);

  // 6. Branch by Intent
  switch (input.intent) {
    case "starter_slots": {
      const slots: ValidatedSlot[] = [];
      const seenPitch = new Set<number>();

      if (input.pitchSlots && input.pitchSlots.length > 0) {
        if (input.pitchSlots.length > perSide) {
          return {
            ok: false,
            error: `Los cupos titulares no pueden superar el formato (${perSide} para ${format}).`,
          };
        }

        for (const pSlot of input.pitchSlots) {
          const idx = pSlot.pitchIndex;
          if (!Number.isInteger(idx) || idx < 0 || idx > 15) {
            return { ok: false, error: "Índice de cancha inválido." };
          }
          if (seenPitch.has(idx)) {
            return { ok: false, error: "Huecos duplicados en la cancha." };
          }
          seenPitch.add(idx);

          const posRaw = pSlot.position ?? "any";
          if (posRaw !== "any" && (!isPosition(posRaw) || !positionAllowedForSport(sport, posRaw as Position))) {
            return { ok: false, error: "Esa posición no aplica para el deporte." };
          }

          const lvlRaw = pSlot.level ?? "any";
          const slotLevel: Level = (LEVELS as readonly string[]).includes(lvlRaw) ? (lvlRaw as Level) : "any";

          slots.push({
            side: "a",
            slot_role: "starter",
            position: posRaw as Position,
            level: slotLevel,
            pitch_index: idx,
          });
        }
      } else {
        const rawStarters = input.starterCount ?? 0;
        if (!Number.isInteger(rawStarters) || rawStarters < 1) {
          return { ok: false, error: "Debes seleccionar al menos 1 cupo titular para tu equipo." };
        }
        if (rawStarters > perSide) {
          return {
            ok: false,
            error: `Los cupos titulares no pueden superar el formato (${perSide} para ${format}).`,
          };
        }

        for (let i = 0; i < rawStarters; i++) {
          slots.push({
            side: "a",
            slot_role: "starter",
            position: needKeeper && i === 0 ? "gk" : defaultPosition,
            level: defaultLevel,
            pitch_index: null,
          });
        }
      }

      let rotationRule: string | null = null;
      if (benchCount > 0) {
        const rotCheck = sanitizeRotationRule(input.rotationRule);
        if (!rotCheck.ok) {
          return { ok: false, error: rotCheck.error };
        }
        rotationRule = rotCheck.rule;

        for (let i = 0; i < benchCount; i++) {
          slots.push({
            side: "a",
            slot_role: "bench",
            position: "any",
            level: defaultLevel,
            pitch_index: null,
          });
        }
      }

      const teamCheck = sanitizeTeamName(input.hostTeamName);
      if (!teamCheck.ok) {
        return { ok: false, error: teamCheck.error };
      }

      const totalStarters = slots.filter((s) => s.slot_role === "starter").length;

      return {
        ok: true,
        data: {
          matchMode: "pickup",
          hostTeamName: teamCheck.team,
          rotationRule,
          slots,
          totalStartersA: totalStarters,
          totalBenchA: benchCount,
          totalRivalB: 0,
          totalBenchB: 0,
        },
      };
    }

    case "bench_only": {
      if ((input.pitchSlots && input.pitchSlots.length > 0) || (input.starterCount && input.starterCount > 0)) {
        return { ok: false, error: "En modo 'Solo Banca' no se deben seleccionar cupos titulares en cancha." };
      }

      if (benchCount < 1 || benchCount > 4) {
        return { ok: false, error: "Debes seleccionar entre 1 y 4 suplentes para la banca." };
      }

      const rotCheck = sanitizeRotationRule(input.rotationRule);
      if (!rotCheck.ok) {
        return { ok: false, error: rotCheck.error };
      }

      const teamCheck = sanitizeTeamName(input.hostTeamName);
      if (!teamCheck.ok) {
        return { ok: false, error: teamCheck.error };
      }

      const slots: ValidatedSlot[] = [];
      for (let i = 0; i < benchCount; i++) {
        slots.push({
          side: "a",
          slot_role: "bench",
          position: "any",
          level: defaultLevel,
          pitch_index: null,
        });
      }

      return {
        ok: true,
        data: {
          matchMode: "pickup",
          hostTeamName: teamCheck.team,
          rotationRule: rotCheck.rule,
          slots,
          totalStartersA: 0,
          totalBenchA: benchCount,
          totalRivalB: 0,
          totalBenchB: 0,
        },
      };
    }

    case "challenge": {
      const teamCheck = sanitizeTeamName(input.hostTeamName);
      if (!teamCheck.ok) {
        return { ok: false, error: teamCheck.error };
      }

      const totalSideB = perSide + benchCount;
      if (totalSideB >= 16) {
        return { ok: false, error: "El total de cupos para el rival no puede exceder 15 cupos." };
      }

      const slots: ValidatedSlot[] = [];
      for (let i = 0; i < perSide; i++) {
        slots.push({
          side: "b",
          slot_role: "starter",
          position: needKeeper && i === 0 ? "gk" : defaultPosition,
          level: defaultLevel,
          pitch_index: null,
        });
      }

      let rotationRule: string | null = null;
      if (benchCount > 0) {
        const rotCheck = sanitizeRotationRule(input.rotationRule);
        if (!rotCheck.ok) {
          return { ok: false, error: rotCheck.error };
        }
        rotationRule = rotCheck.rule;

        for (let i = 0; i < benchCount; i++) {
          slots.push({
            side: "b",
            slot_role: "bench",
            position: "any",
            level: defaultLevel,
            pitch_index: null,
          });
        }
      }

      return {
        ok: true,
        data: {
          matchMode: "challenge",
          hostTeamName: teamCheck.team,
          rotationRule,
          slots,
          totalStartersA: 0,
          totalBenchA: 0,
          totalRivalB: slots.length,
          totalBenchB: benchCount,
        },
      };
    }

    default: {
      return { ok: false, error: "Intención de convocatoria no válida." };
    }
  }
}
