# Strategy & Design Specification: `lib/match-intent-payload.ts`

**Document Version:** 1.0.0  
**Author:** explorer_m1_1 (Domain Logic & Payload Architecture Explorer)  
**Target File:** `lib/match-intent-payload.ts`  
**Target Test File:** `lib/match-intent-payload.test.ts`  
**Consumer:** `app/actions.ts` (`createMatchAction`)  
**Milestone:** M1: Domain Logic, Atomic Payload Builder & Server Action Remediation  

---

## 1. Executive Overview

This document specifies the exact domain design, interface contracts, invariant enforcement rules, and error handling for `lib/match-intent-payload.ts`. 

The primary deliverable is the pure domain function `buildMatchSlotsPayload(input: IntentPayloadInput): MatchPayloadResult`. It replaces fragmented, ad-hoc slot generation logic scattered across `app/actions.ts` with a centralized, 100% deterministic, and atomically validated builder.

### Core Objectives
1. **Model the 3 Creation Intents**:
   - **Intent 1 (`'starter_slots'`)**: Completing missing starters on Side A (via pitch spots or numeric count) with optional 0–4 bench substitutes.
   - **Intent 2 (`'bench_only'`)**: Starters already complete offline; strictly 0 starters in app, 1–4 bench substitutes on Side A with a mandatory active rotation pact.
   - **Intent 3 (`'challenge'`)**: Confrontation match; strictly `match_mode = 'challenge'`, host team name (2–60 chars), and Side B rival slots strictly equal to `playersPerSideFromFormat(format)` plus optional 0–4 rival bench slots.
2. **Prevent Illegal Combinations**:
   - Forbid `side = 'b'` when `match_mode = 'pickup'` (prevents triggering PostgreSQL exception in `private.guard_slot_side_insert`).
   - Forbid starters exceeding sports format capacity (`starters <= playersPerSideFromFormat(format)`).
   - Forbid negative slots or bench > 4.
   - Forbid duplicate `pitch_index` or values outside `[0, 15]`.
   - Prevent sport/position mismatches (e.g. `gk` in basketball or padel).
   - Guarantee total Side B slots never exceed 16 (PostgreSQL trigger guard limit).
3. **Decouple Validation from Database IO**:
   - Pure functions that can be tested in Vitest without database or network connections.

---

## 2. Interface Contracts & Detailed Typing

```typescript
import type { Format, Position, Sport } from "@/lib/sport-rules";
import type { Level } from "@/lib/constants";

/**
 * The 3 mutually exclusive match creation intents.
 */
export type MatchCreationIntent = "starter_slots" | "bench_only" | "challenge";

/**
 * Challenge matchup modality for Intent 3.
 * - 'full_team': An opposing captain accepts the challenge with a complete external squad.
 * - 'open_slots': Individual free agents can claim slots on Side B.
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
  totalBenchB: number;
}

/**
 * Result type for pure domain validation.
 */
export type MatchPayloadResult =
  | { ok: true; data: ValidatedMatchPayload }
  | { ok: false; error: string };
```

---

## 3. Invariant Enforcement & Validation Rules

### 3.1 Global Invariants (Applicable to all Intents)

| Rule # | Dimension | Condition / Constraint | Action on Violation | User-Facing Error Message |
|---|---|---|---|---|
| G-01 | Sport | Must exist in `SPORTS` (`'futbol'`, `'futbol_sala'`, `'basquet'`, `'voleibol'`, `'padel'`) | Reject | `"Elige un deporte válido."` |
| G-02 | Format | Must be valid for the sport via `formatAllowedForSport(sport, format)` | Reject | `"Ese formato no aplica para el deporte."` |
| G-03 | Format Math | `playersPerSide = playersPerSideFromFormat(format)` must be $\ge 1$ | Fallback to 5 if unparseable, or reject | `"Formato deportivo no válido."` |
| G-04 | Formation ID | If provided and non-empty, must match sport and format via `getFormationById` | Reject | `"Esa formación no aplica para el deporte/formato."` |
| G-05 | Bench Bounds | `benchCount` must be an integer between 0 and 4 | Reject | `"La cantidad de suplentes debe ser entre 0 y 4."` |
| G-06 | Pitch Index | Any `pitch_index` must be an integer between 0 and 15 | Reject | `"Índice de cancha inválido."` |
| G-07 | Pitch Duplication | No two starter slots may share the same `pitch_index` | Reject | `"Huecos duplicados en la cancha."` |
| G-08 | Position Check | Any assigned position must be valid and allowed for sport | Reject | `"Esa posición no aplica para el deporte."` |

---

### 3.2 Intent 1: "Completar mi Equipo Titular" (`intent = 'starter_slots'`)

- **Domain Semantics**: Host organizes a pickup match on Side A. Needs starters to fill missing spots on the pitch and can optionally add bench players.
- **Match Mode**: Strictly `'pickup'`.
- **Side Restriction**: Strictly `'a'` for all slots. **No slots may have `side = 'b'`.**
- **Starter Slots Rules**:
  - Starters can be defined either through `pitchSlots` (array of interactive pitch holes) or `starterCount` (numeric counter fallback).
  - If `pitchSlots` has items:
    - Count must be in range `[1, playersPerSide]`.
    - If `pitchSlots.length < 1`: Reject with `"Debes seleccionar al menos 1 cupo titular para tu equipo."`.
    - If `pitchSlots.length > playersPerSide`: Reject with `"Los cupos titulares no pueden superar el formato ({playersPerSide} para {format})."`.
    - Each slot gets `side: 'a'`, `slot_role: 'starter'`, `pitch_index: slot.pitchIndex`, `position: slot.position ?? 'any'`, `level: slot.level ?? 'any'`.
  - If `pitchSlots` is empty or omitted, and `starterCount` is provided:
    - `starterCount` must be an integer in range `[1, playersPerSide]`.
    - If `starterCount < 1`: Reject with `"Debes seleccionar al menos 1 cupo titular para tu equipo."`.
    - If `starterCount > playersPerSide`: Reject with `"Los cupos titulares no pueden superar el formato ({playersPerSide} para {format})."`.
    - Each slot gets `side: 'a'`, `slot_role: 'starter'`, `pitch_index: null`, `level: defaultLevel ?? 'any'`.
    - If `needKeeper && sport hasKeeper`, slot index 0 gets `position: 'gk'`; others get `defaultPosition ?? 'any'`.
  - If neither `pitchSlots` nor `starterCount` is provided (or both 0): Reject with `"Debes seleccionar al menos 1 cupo titular para tu equipo."`.
- **Bench Slots Rules**:
  - `benchCount` must be in range `[0, 4]`.
  - If `benchCount > 0`:
    - Generates `benchCount` slots with `side: 'a'`, `slot_role: 'bench'`, `pitch_index: null`, `position: 'any'`, `level: defaultLevel ?? 'any'`.
    - `rotationRule`:
      - If provided, must have trimmed length between 2 and 120 chars. If invalid: Reject with `"La regla de rotación debe tener entre 2 y 120 caracteres."`.
      - If omitted or empty: Fallback to `"Rotación activa continua"`.
  - If `benchCount === 0`:
    - `rotationRule` is set to `null`.
- **Side B Slots**:
  - Strictly 0 slots on Side B (`totalRivalB = 0`).
- **Host Team Name**:
  - Optional for pickup matches. If provided, sanitize to trimmed string between 2 and 60 chars or `null`.
- **Result Totals**:
  - `totalStartersA = startersCount`
  - `totalBenchA = benchCount`
  - `totalRivalB = 0`
  - `totalBenchB = 0`

---

### 3.3 Intent 2: "Solo Banca / Suplentes" (`intent = 'bench_only'`)

- **Domain Semantics**: Host has all starters confirmed offline (in WhatsApp/person). No starters are needed or allowed on the pitch. Host recruits 1 to 4 bench players with a mandatory rotation agreement.
- **Match Mode**: Strictly `'pickup'`.
- **Side Restriction**: Strictly `'a'` for all slots. **No slots may have `side = 'b'`.**
- **Starter Slots Rules**:
  - Starters must be **strictly 0**.
  - If `pitchSlots` has items or `starterCount > 0`:
    - Reject with `"En modo 'Solo Banca' no se deben seleccionar cupos titulares en cancha."`.
  - `totalStartersA = 0`.
- **Bench Slots Rules**:
  - `benchCount` is **mandatory** and must be in range `[1, 4]`.
  - If `benchCount < 1 || benchCount > 4`:
    - Reject with `"Debes indicar entre 1 y 4 suplentes para la banca."`.
  - Generates `benchCount` slots with:
    - `side: 'a'`
    - `slot_role: 'bench'`
    - `pitch_index: null`
    - `position: 'any'`
    - `level: defaultLevel ?? 'any'`
- **Rotation Pact Rules**:
  - `rotationRule` is **mandatory**.
  - If trimmed length is not between 2 and 120 chars:
    - If empty or null: fallback to `"Rotación activa continua"`.
    - If provided with length < 2 or > 120: Reject with `"La regla de rotación debe tener entre 2 y 120 caracteres."`.
- **Side B Slots**:
  - Strictly 0 slots on Side B (`totalRivalB = 0`).
- **Host Team Name**:
  - Optional (null or sanitized 2–60 chars).
- **Result Totals**:
  - `totalStartersA = 0`
  - `totalBenchA = benchCount`
  - `totalRivalB = 0`
  - `totalBenchB = 0`

---

### 3.4 Intent 3: "Reto a Equipo Rival" (`intent = 'challenge'`)

- **Domain Semantics**: Host team is fully assembled offline and challenges an opposing team. All open slots belong to Side B (the rival team).
- **Match Mode**: Strictly `'challenge'`.
- **Host Team Name**:
  - **Mandatory**. The host team must be identified.
  - Must be a trimmed string with length between 2 and 60 chars (complying with PostgreSQL check constraint `matches_host_team_name_len`).
  - If missing or `< 2` chars: Reject with `"Debes ingresar el nombre de tu equipo (entre 2 y 60 caracteres)."`
  - If `> 60` chars: Reject with `"El nombre del equipo no puede superar 60 caracteres."`
- **Side A Slots**:
  - Host team is complete offline. Strictly 0 slots on Side A (`totalStartersA = 0`, `totalBenchA = 0`).
- **Side B Starter Slots**:
  - Must be **exactly** `playersPerSideFromFormat(format)` slots.
  - Formats:
    - `voleibol 6v6` -> exactly 6 starters on Side B.
    - `futbol 5v5` -> exactly 5 starters on Side B.
    - `futbol 11v11` -> exactly 11 starters on Side B.
    - `padel 2v2` -> exactly 2 starters on Side B.
    - `basquet 3v3` -> exactly 3 starters on Side B.
  - All rival starter slots have:
    - `side: 'b'`
    - `slot_role: 'starter'`
    - `pitch_index: null`
    - `level: defaultLevel ?? 'any'`
    - `position`: if `needKeeper && sport hasKeeper`, index 0 is `"gk"`, others `defaultPosition ?? 'any'`.
- **Side B Bench Slots (Optional)**:
  - `benchCount`: integer in range `[0, 4]` (default 0).
  - If `benchCount > 0`:
    - Generates `benchCount` slots with:
      - `side: 'b'`
      - `slot_role: 'bench'`
      - `pitch_index: null`
      - `position: 'any'`
      - `level: defaultLevel ?? 'any'`
    - `rotationRule`: if provided, trimmed 2–120 chars; defaults to `"Rotación activa continua"`.
- **PostgreSQL Trigger Limit Guard**:
  - In `private.guard_slot_side_insert`, maximum Side B slots is `< 16`.
  - Total Side B slots = `playersPerSide + benchCount`.
  - If `totalSideBSlots >= 16`:
    - Reject with `"El total de cupos para el rival no puede exceder 15 cupos."`.
    - (e.g. 11v11 + 4 bench = 15 slots $\le 15$, which strictly avoids the 16-slot trigger exception).
- **Result Totals**:
  - `totalStartersA = 0`
  - `totalBenchA = 0`
  - `totalRivalB = playersPerSide`
  - `totalBenchB = benchCount`

---

## 4. Prevention of Illegal Combinations & Security Vulnerabilities

| Threat / Vulnerability | Mechanism of Prevention in `buildMatchSlotsPayload` | Underlying Database Guard |
|---|---|---|
| **Attempt to create Side B slots in pickup mode** | When `intent` is `starter_slots` or `bench_only`, slot builder hardcodes `side = 'a'`. Any caller attempting to pass `side = 'b'` is overridden or rejected. | `private.guard_slot_side_insert` throws `'No se puede abrir el lado B asi'`. |
| **Attempt to bypass starter limits (e.g. 8 starters in pádel 2v2)** | Validator enforces `startersCount <= playersPerSideFromFormat(format)`. In 2v2, max starters is 2. | Sport rules integrity. |
| **Negative bench count or bench overflow** | Validator rejects `benchCount < 0` or `benchCount > 4`. | PostgreSQL slot count bounds. |
| **Missing rotation pact in Solo Banca** | Validator enforces `rotationRule` presence, trimming and fallback to standard pact. | `matches_rotation_rule_len` check constraint. |
| **Short or blank team name in Reto** | Validator strictly rejects empty strings or strings `< 2` or `> 60` chars. | `matches_host_team_name_len` check constraint (`2 <= char_length <= 60`). |
| **Duplicate pitch indexes on field** | Tracks a `Set<number>` of pitch indexes; duplicate throws error immediately. | Prevents visual collisions on tactical board. |
| **Side mutation after creation** | Slots generated with immutable sides ('a' or 'b'). | `private.guard_slot_match_id` trigger throws `'No se puede cambiar el lado del cupo'`. |

---

## 5. Algorithmic Specification: `buildMatchSlotsPayload`

```typescript
export function buildMatchSlotsPayload(input: IntentPayloadInput): MatchPayloadResult {
  // 1. Validate Sport
  if (!isSport(input.sport)) {
    return { ok: false, error: "Elige un deporte válido." };
  }
  const sport = input.sport as Sport;

  // 2. Validate Format
  const format = String(input.format ?? "").trim() as Format;
  if (!formatAllowedForSport(sport, format)) {
    return { ok: false, error: "Ese formato no aplica para el deporte." };
  }
  const playersPerSide = playersPerSideFromFormat(format);

  // 3. Validate Formation (if provided)
  let formationId: string | null = null;
  if (input.formationId && input.formationId.trim()) {
    const formation = getFormationById(input.formationId.trim());
    if (!formation || formation.sport !== sport || formation.format !== format) {
      return { ok: false, error: "Esa formación no aplica para el deporte/formato." };
    }
    formationId = formation.id;
  }

  // 4. Sanitize Bench Count
  const rawBench = input.benchCount ?? 0;
  if (!Number.isInteger(rawBench) || rawBench < 0 || rawBench > 4) {
    return { ok: false, error: "La cantidad de suplentes debe ser entre 0 y 4." };
  }
  const benchCount = rawBench;

  // 5. Sanitize Default Position & Level
  const defaultLevel: Level = (LEVELS as readonly string[]).includes(input.defaultLevel ?? "")
    ? (input.defaultLevel as Level)
    : "any";

  const defaultPosition: Position =
    input.defaultPosition && isPosition(input.defaultPosition) && positionAllowedForSport(sport, input.defaultPosition)
      ? input.defaultPosition
      : "any";

  const needKeeper = Boolean(input.needKeeper && SPORT_RULES[sport].hasKeeper);

  // 6. Branch by Intent
  switch (input.intent) {
    case "starter_slots": {
      // Must not create side B slots
      const slots: ValidatedSlot[] = [];
      const seenPitch = new Set<number>();

      if (input.pitchSlots && input.pitchSlots.length > 0) {
        if (input.pitchSlots.length > playersPerSide) {
          return {
            ok: false,
            error: `Los cupos titulares no pueden superar el formato (${playersPerSide} para ${format}).`,
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
          if (!isPosition(posRaw) || !positionAllowedForSport(sport, posRaw)) {
            return { ok: false, error: "Esa posición no aplica para el deporte." };
          }

          const lvlRaw = pSlot.level ?? "any";
          const slotLevel: Level = (LEVELS as readonly string[]).includes(lvlRaw) ? (lvlRaw as Level) : "any";

          slots.push({
            side: "a",
            slot_role: "starter",
            position: posRaw,
            level: slotLevel,
            pitch_index: idx,
          });
        }
      } else {
        const rawStarters = input.starterCount ?? 0;
        if (!Number.isInteger(rawStarters) || rawStarters < 1) {
          return { ok: false, error: "Debes seleccionar al menos 1 cupo titular para tu equipo." };
        }
        if (rawStarters > playersPerSide) {
          return {
            ok: false,
            error: `Los cupos titulares no pueden superar el formato (${playersPerSide} para ${format}).`,
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

      // Add bench if requested
      let sanitizedRotationRule: string | null = null;
      if (benchCount > 0) {
        sanitizedRotationRule = sanitizeRotationRule(input.rotationRule);
        if (sanitizedRotationRule === null) {
          return { ok: false, error: "La regla de rotación debe tener entre 2 y 120 caracteres." };
        }
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

      return {
        ok: true,
        data: {
          matchMode: "pickup",
          hostTeamName: sanitizeTeamName(input.hostTeamName),
          rotationRule: sanitizedRotationRule,
          slots,
          totalStartersA: slots.filter((s) => s.slot_role === "starter").length,
          totalBenchA: benchCount,
          totalRivalB: 0,
          totalBenchB: 0,
        },
      };
    }

    case "bench_only": {
      // Starters must be 0
      if ((input.pitchSlots && input.pitchSlots.length > 0) || (input.starterCount && input.starterCount > 0)) {
        return { ok: false, error: "En modo 'Solo Banca' no se deben seleccionar cupos titulares en cancha." };
      }

      if (benchCount < 1 || benchCount > 4) {
        return { ok: false, error: "Debes indicar entre 1 y 4 suplentes para la banca." };
      }

      const sanitizedRotationRule = sanitizeRotationRule(input.rotationRule);
      if (sanitizedRotationRule === null) {
        return { ok: false, error: "La regla de rotación debe tener entre 2 y 120 caracteres." };
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
          hostTeamName: sanitizeTeamName(input.hostTeamName),
          rotationRule: sanitizedRotationRule,
          slots,
          totalStartersA: 0,
          totalBenchA: benchCount,
          totalRivalB: 0,
          totalBenchB: 0,
        },
      };
    }

    case "challenge": {
      const sanitizedTeam = sanitizeTeamName(input.hostTeamName);
      if (!sanitizedTeam) {
        return { ok: false, error: "Debes ingresar el nombre de tu equipo (entre 2 y 60 caracteres)." };
      }

      // Check PostgreSQL Side B limit
      const totalSideB = playersPerSide + benchCount;
      if (totalSideB >= 16) {
        return { ok: false, error: "El total de cupos para el rival no puede exceder 15 cupos." };
      }

      const slots: ValidatedSlot[] = [];
      for (let i = 0; i < playersPerSide; i++) {
        slots.push({
          side: "b",
          slot_role: "starter",
          position: needKeeper && i === 0 ? "gk" : defaultPosition,
          level: defaultLevel,
          pitch_index: null,
        });
      }

      let sanitizedRotationRule: string | null = null;
      if (benchCount > 0) {
        sanitizedRotationRule = sanitizeRotationRule(input.rotationRule);
        if (sanitizedRotationRule === null) {
          return { ok: false, error: "La regla de rotación debe tener entre 2 y 120 caracteres." };
        }
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
          hostTeamName: sanitizedTeam,
          rotationRule: sanitizedRotationRule,
          slots,
          totalStartersA: 0,
          totalBenchA: 0,
          totalRivalB: playersPerSide,
          totalBenchB: benchCount,
        },
      };
    }

    default: {
      return { ok: false, error: "Intención de convocatoria no válida." };
    }
  }
}
```

### Helper Sanitizers

```typescript
export function sanitizeTeamName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return null;
  return trimmed;
}

export function sanitizeRotationRule(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") {
    return "Rotación activa continua";
  }
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "Rotación activa continua";
  if (trimmed.length < 2 || trimmed.length > 120) return null;
  return trimmed;
}
```

---

## 6. Server Action Integration Strategy (`createMatchAction`)

In `app/actions.ts`, `createMatchAction` is modified to delegate slot validation and payload building directly to `buildMatchSlotsPayload`:

```typescript
// 1. In app/actions.ts: Extract intent with backward-compatibility fallback
const rawIntent = formData.get("intent");
let intent: MatchCreationIntent;
if (rawIntent === "starter_slots" || rawIntent === "bench_only" || rawIntent === "challenge") {
  intent = rawIntent;
} else if (matchMode === "challenge") {
  intent = "challenge";
} else if (benchCount > 0 && (!formData.get("open_count") || formData.get("open_count") === "0")) {
  intent = "bench_only";
} else {
  intent = "starter_slots";
}

// 2. Call pure domain builder
const payloadResult = buildMatchSlotsPayload({
  intent,
  sport,
  format,
  formationId,
  pitchSlots: pitchParsed && "slots" in pitchParsed ? pitchParsed.slots : undefined,
  starterCount: Number(formData.get("open_count") ?? 0),
  benchCount,
  rotationRule: String(formData.get("rotation_rule") ?? ""),
  hostTeamName: String(formData.get("host_team_name") ?? ""),
  defaultPosition: position,
  defaultLevel: level,
  needKeeper,
});

if (!payloadResult.ok) {
  return { error: payloadResult.error };
}

// 3. Destructure verified data
const { matchMode: verifiedMode, hostTeamName: verifiedTeam, rotationRule: verifiedRule, slots } = payloadResult.data;

// 4. Insert matches row with verified fields
// ...

// 5. Insert match_slots with atomic rollback on error
// ...
```

---

## 7. Vitest Test Plan for `lib/match-intent-payload.test.ts`

To be implemented by Worker M1:

### Test Suite Structure
1. **Suite 1: Intent 1 ("starter_slots")**
   - Generates valid starter slots on Side A with interactive `pitchSlots`.
   - Generates valid starter slots on Side A with numeric `starterCount`.
   - Assigns `'gk'` to first slot if `needKeeper` is true on soccer.
   - Appends bench slots on Side A when `benchCount > 0` and sets default rotation rule.
   - Rejects starter count exceeding format capacity (e.g. 3 starters in padel 2v2).
   - Rejects duplicate `pitchIndex`.
   - Rejects invalid `pitchIndex` (< 0 or > 15).
   - Rejects invalid positions for the chosen sport.
2. **Suite 2: Intent 2 ("bench_only")**
   - Generates strictly 0 starters and 1–4 bench slots on Side A.
   - Rejects if `benchCount < 1` or `benchCount > 4`.
   - Rejects if `pitchSlots` or `starterCount > 0` are provided.
   - Enforces `rotationRule` (defaults to `"Rotación activa continua"` if empty string).
   - Rejects rotation rule with invalid length (< 2 or > 120 chars).
   - Confirms `matchMode = 'pickup'` and Side B slots count is 0.
3. **Suite 3: Intent 3 ("challenge")**
   - Generates exactly `playersPerSideFromFormat(format)` starters on Side B.
   - Sets `matchMode = 'challenge'`.
   - Rejects missing or invalid `hostTeamName` (< 2 or > 60 chars).
   - Generates rival bench slots on Side B if `benchCount > 0`.
   - Enforces Side B total slots $\le 15$ to respect Postgres `< 16` trigger guard.
   - Confirms Side A slots count is 0.
4. **Suite 4: Security & Prevention of Illegal Combinations**
   - Confirms no slots ever have `side = 'b'` when intent is `starter_slots` or `bench_only`.
   - Confirms negative bench count is rejected.
   - Confirms unsupported sport or format is rejected.
