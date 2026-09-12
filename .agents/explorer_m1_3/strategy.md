# Test Strategy & Specification: `lib/match-intent-payload.test.ts`
**Milestone:** M1 — Domain Logic, Atomic Payload Builder & Server Action Remediation  
**Author:** explorer_m1_3 (Unit Test Strategy & Vitest Harness Explorer)  
**Target Module Under Test:** `lib/match-intent-payload.ts`  
**Test Suite Path:** `lib/match-intent-payload.test.ts`  
**Date:** 2026-09-10  

---

## 1. Executive Summary & Test Objectives

The match creation workflow in BaFut transitions from a legacy, loosely-typed two-step form to an **Intent-Driven Architecture (R1 & R3)**. At the center of this architecture is the pure, deterministic domain builder function:
```typescript
buildMatchSlotsPayload(input: IntentPayloadInput): { ok: true; data: ValidatedMatchPayload } | { ok: false; error: string }
```

### Objectives of the Test Suite
1. **Verify Equivalence Classes across 3 Convocatoria Intents:**
   - **Intent 1 (`starter_slots`):** Recruiting missing starters on Side A (with optional rotation bench 0–4).
   - **Intent 2 (`bench_only`):** Starters complete offline; exactly 0 starters on Side A and 1–4 substitutes with mandatory active rotation pact.
   - **Intent 3 (`challenge`):** Host squad complete offline; creates `playersPerSideFromFormat(format)` starters on Side B (plus optional 0–4 bench on Side B), setting `matchMode = 'challenge'`.
2. **Verify Multi-Sport Format Math & Rules:**
   - Fútbol 5v5 (5 per side, GK allowed, default formation Diamante).
   - Vóley 6v6 (6 per side, no GK, positions armador/central/opuesto/receptor/libero).
   - Básquet 3v3 (3 per side, no GK, positions base/ala/pivot).
   - Pádel 2v2 (2 per side, no GK, positions drive/reves).
   - Multi-format scalability: Fútbol 6v6, 7v7, 8v8, 11v11, Futsal 5v5, Básquet 5v5, Vóley 2v2, Pádel 4v4.
3. **Rigorous Boundary Value Testing:**
   - Format limits: Starters count exceeding `playersPerSideFromFormat(format)`, 0 starters in Intent 1.
   - Pitch index boundaries: valid indexes `0..15`, rejection of `< 0`, `> 15`, and duplicates.
   - Bench boundaries: `0, 1, 4, 5, -1` (verifying 0 is allowed for Intent 1 & 3, strictly rejected for Intent 2).
   - Host team name boundaries: `0, 1, 2, 60, 61` characters, whitespace trimming (aligned with PostgreSQL check constraint `matches_host_team_name_len`).
   - Rotation rule boundaries: `0, 1, 2, 120, 121` characters, whitespace trimming (aligned with PostgreSQL check constraint `matches_rotation_rule_len`).
4. **Security & Integrity Invariants:**
   - **No Side B in Pickup Mode:** Under `intent: 'starter_slots'` and `intent: 'bench_only'`, every slot must be strictly `side: 'a'`. Zero Side B slots permitted.
   - **No Side A in Challenge Mode:** Under `intent: 'challenge'`, host squad is complete offline; every slot must be strictly `side: 'b'`. Zero Side A slots permitted.
   - **Database Trigger Invariant (`guard_slot_side_insert`):** Challenge mode total Side B slots must never exceed 15 (`v_side_b_count < 16`).
   - **Strict Slot Roles & Sides:** Only `'starter' | 'bench'` and `'a' | 'b'`.
   - **Pitch Index Invariant:** Only starters from pitch selection have non-null `pitch_index`. Bench slots and rival slots must ALWAYS have `pitch_index: null`.
   - **Sport Position & Level Invariant:** Position must be allowed for the sport (or `'any'`), and level must be one of `'any' | 'low' | 'mid' | 'high'`.

---

## 2. Type Contracts & Architectural Interfaces

Defined in `PROJECT.md` § Interface Contracts:

```typescript
import type { Sport } from "@/lib/sport-rules";

export type MatchCreationIntent = 'starter_slots' | 'bench_only' | 'challenge';

export interface IntentPayloadInput {
  intent: MatchCreationIntent;
  sport: Sport;
  format: string; // e.g. '5v5', '6v6', '3v3', '2v2'
  formationId?: string | null;
  pitchSlots?: Array<{
    pitchIndex: number;
    position?: string;
    level?: string;
  }>;
  starterCount?: number; // for quick numeric starter picks
  benchCount?: number;   // 0 to 4
  rotationRule?: string | null;
  hostTeamName?: string | null;
  challengeModeType?: 'full_team' | 'open_slots';
}

export interface ValidatedMatchPayload {
  matchMode: 'pickup' | 'challenge';
  hostTeamName: string | null;
  rotationRule: string | null;
  slots: Array<{
    side: 'a' | 'b';
    slot_role: 'starter' | 'bench';
    position: string;
    level: string;
    pitch_index: number | null;
  }>;
  totalStartersA: number;
  totalBenchA: number;
  totalRivalB: number;
}

export function buildMatchSlotsPayload(
  input: IntentPayloadInput
): { ok: true; data: ValidatedMatchPayload } | { ok: false; error: string };
```

---

## 3. Comprehensive Testing Matrix

### Table 1: Happy Path Equivalence Classes

| ID | Intent | Sport | Format | Input Details | Expected `matchMode` | Side A Starters | Side A Bench | Side B Total | Key Invariant Assertions |
|---|---|---|---|---|---|---|---|---|---|
| **HP-01** | `starter_slots` | `futbol` | `5v5` | `starterCount: 3`, `benchCount: 0` | `'pickup'` | 3 (pitch_index: null) | 0 | 0 | All slots `side='a'`, `slot_role='starter'`; `totalStartersA=3`, `totalBenchA=0`, `totalRivalB=0` |
| **HP-02** | `starter_slots` | `futbol` | `5v5` | `pitchSlots`: 2 spots (gk, def), `benchCount: 1`, `rotationRule: "Rotación activa continua"` | `'pickup'` | 2 (pitch_index: 0, 1) | 1 (pitch_index: null) | 0 | Slots preserve pitch indices; bench slot appended with `slot_role='bench'`; `totalStartersA=2`, `totalBenchA=1` |
| **HP-03** | `starter_slots` | `voleibol` | `6v6` | `pitchSlots`: 4 spots (armador, central, opuesto, receptor), `benchCount: 2` | `'pickup'` | 4 | 2 | 0 | Valid volleyball positions; `totalStartersA=4`, `totalBenchA=2`, `totalRivalB=0` |
| **HP-04** | `starter_slots` | `basquet` | `3v3` | `starterCount: 2`, `benchCount: 1` | `'pickup'` | 2 | 1 | 0 | 2 starters <= 3 capacity; `totalStartersA=2`, `totalBenchA=1` |
| **HP-05** | `starter_slots` | `padel` | `2v2` | `pitchSlots`: 1 spot (drive), `benchCount: 0` | `'pickup'` | 1 | 0 | 0 | 1 starter <= 2 capacity; `totalStartersA=1`, `totalBenchA=0` |
| **HP-06** | `bench_only` | `futbol` | `5v5` | `benchCount: 2`, `rotationRule: "Rotación fija cada 15 min"` | `'pickup'` | **0** | 2 | 0 | Critical Intent 2 requirement: 0 starters, exactly 2 bench slots on Side A; `totalStartersA=0`, `totalBenchA=2` |
| **HP-07** | `bench_only` | `voleibol` | `6v6` | `benchCount: 1`, `rotationRule: "Rotación activa continua"` | `'pickup'` | **0** | 1 | 0 | Exactly 1 bench slot; `totalStartersA=0`, `totalBenchA=1` |
| **HP-08** | `bench_only` | `basquet` | `3v3` | `benchCount: 3`, `rotationRule: "Pacto libre acordado"` | `'pickup'` | **0** | 3 | 0 | Exactly 3 bench slots; `totalStartersA=0`, `totalBenchA=3` |
| **HP-09** | `bench_only` | `padel` | `2v2` | `benchCount: 4`, `rotationRule: "Rotación por sets"` | `'pickup'` | **0** | 4 | 0 | Max bench boundary (4); `totalStartersA=0`, `totalBenchA=4` |
| **HP-10** | `challenge` | `futbol` | `5v5` | `hostTeamName: "Los Galácticos"`, `benchCount: 0`, `challengeModeType: 'full_team'` | `'challenge'` | **0** | **0** | 5 | Exactly 5 Side B starters; 0 Side A slots; `hostTeamName="Los Galácticos"`; `totalRivalB=5` |
| **HP-11** | `challenge` | `voleibol` | `6v6` | `hostTeamName: "Halcones VC"`, `benchCount: 2`, `challengeModeType: 'open_slots'` | `'challenge'` | **0** | **0** | 8 | Exactly 6 Side B starters + 2 Side B bench = 8 total; 0 Side A slots; `totalRivalB=8` |
| **HP-12** | `challenge` | `basquet` | `3v3` | `hostTeamName: "Rucker Park"`, `benchCount: 1` | `'challenge'` | **0** | **0** | 4 | Exactly 3 Side B starters + 1 Side B bench = 4 total; `totalRivalB=4` |
| **HP-13** | `challenge` | `padel` | `2v2` | `hostTeamName: "Top Spin"`, `benchCount: 0` | `'challenge'` | **0** | **0** | 2 | Exactly 2 Side B starters; `totalRivalB=2` |
| **HP-14** | `challenge` | `futbol` | `11v11` | `hostTeamName: "Atlético BaFut"`, `benchCount: 4` | `'challenge'` | **0** | **0** | 15 | 11 starters + 4 bench = 15 total Side B; passes PostgreSQL `< 16` trigger guard |

---

### Table 2: Boundary Value Testing Matrix

| ID | Boundary Category | Test Value | Expected Behavior | Rationale / Target Rule |
|---|---|---|---|---|
| **BV-01** | Starter Limits (Exceeded) | `futbol 5v5`, `starterCount: 6` | `ok: false`, error | `starterCount > playersPerSideFromFormat("5v5")` (5) |
| **BV-02** | Starter Limits (Exceeded) | `padel 2v2`, `starterCount: 3` | `ok: false`, error | `starterCount > playersPerSideFromFormat("2v2")` (2) |
| **BV-03** | Starter Limits (Exceeded) | `basquet 3v3`, `pitchSlots.length: 4` | `ok: false`, error | `pitchSlots > playersPerSideFromFormat("3v3")` (3) |
| **BV-04** | Starter Limits (Zero) | `intent: 'starter_slots'`, `starterCount: 0` | `ok: false`, error | Intent 1 requires at least 1 starter hole |
| **BV-05** | Starter Limits (Negative) | `starterCount: -1` | `ok: false`, error | Negative starter count disallowed |
| **BV-06** | Starter Limits (Max Valid) | `futbol 5v5`, `starterCount: 5` | `ok: true`, 5 starters | Upper valid boundary for format capacity |
| **BV-07** | Pitch Index (Negative) | `pitchIndex: -1` | `ok: false`, error | Pitch index must be `0..15` |
| **BV-08** | Pitch Index (Exceeded) | `pitchIndex: 16` | `ok: false`, error | Pitch index must be `0..15` |
| **BV-09** | Pitch Index (Duplicates) | `pitchSlots`: `[{pitchIndex: 2}, {pitchIndex: 2}]` | `ok: false`, error | Duplicate pitch hole selection disallowed |
| **BV-10** | Bench Limit (0 in Intent 1) | `intent: 'starter_slots'`, `benchCount: 0` | `ok: true`, 0 bench | Allowed (no bench needed) |
| **BV-11** | Bench Limit (0 in Intent 2) | `intent: 'bench_only'`, `benchCount: 0` | `ok: false`, error | **Violates Intent 2 core contract**: Solo Banca requires `1..4` bench |
| **BV-12** | Bench Limit (1 - Min Valid) | `intent: 'bench_only'`, `benchCount: 1` | `ok: true`, 1 bench | Lower valid boundary for bench |
| **BV-13** | Bench Limit (4 - Max Valid) | `benchCount: 4` | `ok: true`, 4 bench | Upper valid boundary for bench |
| **BV-14** | Bench Limit (5 - Exceeded) | `benchCount: 5` | `ok: false`, error | Exceeds max allowable bench (4) |
| **BV-15** | Bench Limit (Negative) | `benchCount: -1` | `ok: false`, error | Negative bench disallowed |
| **BV-16** | Host Team Name (1 char) | `hostTeamName: "A"` | `ok: false`, error | Violates `matches_host_team_name_len` (min 2 chars) |
| **BV-17** | Host Team Name (Spaces) | `hostTeamName: "   "` | `ok: true` (null) or `error` | Trimmed empty -> null or rejected if required |
| **BV-18** | Host Team Name (2 chars) | `hostTeamName: "FC"` | `ok: true`, `"FC"` | Lower bound for `matches_host_team_name_len` |
| **BV-19** | Host Team Name (60 chars)| `hostTeamName: "A".repeat(60)` | `ok: true`, 60 chars | Upper bound for `matches_host_team_name_len` |
| **BV-20** | Host Team Name (61 chars)| `hostTeamName: "A".repeat(61)` | `ok: false`, error | Exceeds `matches_host_team_name_len` (> 60) |
| **BV-21** | Rotation Rule (Empty in I2) | `intent: 'bench_only'`, `rotationRule: ""` | `ok: true` (fallback) or `error` | In Intent 2, rotation rule is mandatory; must fallback or reject |
| **BV-22** | Rotation Rule (1 char) | `rotationRule: "X"` | `ok: false`, error | Violates `matches_rotation_rule_len` (min 2 chars) |
| **BV-23** | Rotation Rule (2 chars) | `rotationRule: "15"` | `ok: true`, `"15"` | Lower bound for `matches_rotation_rule_len` |
| **BV-24** | Rotation Rule (120 chars)| `rotationRule: "R".repeat(120)` | `ok: true`, 120 chars | Upper bound for `matches_rotation_rule_len` |
| **BV-25** | Rotation Rule (121 chars)| `rotationRule: "R".repeat(121)` | `ok: false`, error | Exceeds `matches_rotation_rule_len` (> 120) |

---

### Table 3: Security & Invariant Enforcement Matrix

| ID | Invariant Category | Vulnerability / Threat Condition | Enforcement Rule in `buildMatchSlotsPayload` | Test Verification Method |
|---|---|---|---|---|
| **SEC-01** | Pickup Mode Isolation | Malicious client injecting `side: 'b'` in `starter_slots` or `bench_only` | Payload builder NEVER assigns `side: 'b'` when `intent !== 'challenge'`. | Assert `slots.every(s => s.side === 'a')` for Intent 1 and Intent 2. |
| **SEC-02** | Challenge Mode Isolation | Malicious client injecting Side A slots in `challenge` | Payload builder NEVER assigns `side: 'a'` when `intent === 'challenge'`. Host squad is offline. | Assert `slots.every(s => s.side === 'b')` for Intent 3. |
| **SEC-03** | Database Trigger Limit | Attempting > 15 Side B slots in `challenge` | `trigger guard_slot_side_insert` throws when `v_side_b_count >= 16`. | Max 11 starters + max 4 bench = 15 total Side B. Rejects any configuration where total Side B >= 16. |
| **SEC-04** | Role Domain Integrity | Arbitrary string in `slot_role` (e.g. `'coach'`, `'admin'`, `'sub'`) | Typed strictly as `'starter' | 'bench'` conforming to `match_slots_slot_role_check`. | Assert `slots.every(s => s.slot_role === 'starter' || s.slot_role === 'bench')`. |
| **SEC-05** | Side Domain Integrity | Arbitrary string in `side` (e.g. `'c'`, `'away'`, `'both'`) | Typed strictly as `'a' | 'b'`. | Assert `slots.every(s => s.side === 'a' || s.side === 'b')`. |
| **SEC-06** | Pitch Index Containment | Bench slot having non-null `pitch_index` | Bench players rotate on sidelines; `pitch_index` must strictly be `null`. | Assert `slots.filter(s => s.slot_role === 'bench').every(s => s.pitch_index === null)`. |
| **SEC-07** | Rival Pitch Index Containment | Rival starter having non-null `pitch_index` | Rival positions on Side B are not placed on host formation pitch. | Assert `slots.filter(s => s.side === 'b').every(s => s.pitch_index === null)`. |
| **SEC-08** | Sport-Position Mismatch | Passing soccer position (`'gk'`) in basketball or volleyball | Validated against `positionAllowedForSport(sport, position)`. | Return `{ ok: false, error: ... }` if position is invalid for sport. |
| **SEC-09** | Level Domain Sanitization | Passing invalid level string (e.g. `'pro'`, `'god'`) | Enforced strictly in `['any', 'low', 'mid', 'high']`. | Fallback to `'any'` or return `{ ok: false, error: ... }`. |
| **SEC-10** | Format-Sport Mismatch | Passing `padel` with format `'11v11'` or `futbol` with format `'2v2'` | Validated against `formatAllowedForSport(sport, format)`. | Return `{ ok: false, error: "Ese formato no aplica para el deporte." }`. |

---

## 4. Vitest Test Suite Code Specification (`lib/match-intent-payload.test.ts`)

Below is the complete, runnable unit test suite specification that Worker M1 can implement directly in `lib/match-intent-payload.test.ts`.

```typescript
import { describe, expect, it } from "vitest";
import {
  buildMatchSlotsPayload,
  type IntentPayloadInput,
} from "@/lib/match-intent-payload";

describe("buildMatchSlotsPayload — Intent 1: starter_slots (Happy Paths)", () => {
  it("construye correctamente Intent 1 para fútbol 5v5 con 3 titulares y 0 suplentes (quick count)", () => {
    const input: IntentPayloadInput = {
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 3,
      benchCount: 0,
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("pickup");
    expect(res.data.hostTeamName).toBeNull();
    expect(res.data.totalStartersA).toBe(3);
    expect(res.data.totalBenchA).toBe(0);
    expect(res.data.totalRivalB).toBe(0);
    expect(res.data.slots).toHaveLength(3);

    // Todos los slots deben ser de Side A y starter
    expect(res.data.slots.every((s) => s.side === "a" && s.slot_role === "starter")).toBe(true);
    // Sin selección de cancha, pitch_index debe ser null
    expect(res.data.slots.every((s) => s.pitch_index === null)).toBe(true);
  });

  it("construye correctamente Intent 1 para fútbol 5v5 con selección táctica en cancha y 1 suplente", () => {
    const input: IntentPayloadInput = {
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      formationId: "futbol-5v5-Diamante",
      pitchSlots: [
        { pitchIndex: 0, position: "gk", level: "mid" },
        { pitchIndex: 2, position: "mid", level: "high" },
      ],
      benchCount: 1,
      rotationRule: "Rotación activa continua",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("pickup");
    expect(res.data.totalStartersA).toBe(2);
    expect(res.data.totalBenchA).toBe(1);
    expect(res.data.totalRivalB).toBe(0);
    expect(res.data.slots).toHaveLength(3);

    // Titular 1: arquero en índice 0
    expect(res.data.slots[0]).toEqual({
      side: "a",
      slot_role: "starter",
      position: "gk",
      level: "mid",
      pitch_index: 0,
    });
    // Titular 2: volante en índice 2
    expect(res.data.slots[1]).toEqual({
      side: "a",
      slot_role: "starter",
      position: "mid",
      level: "high",
      pitch_index: 2,
    });
    // Suplente 1: banca en Side A, pitch_index null
    expect(res.data.slots[2]).toEqual({
      side: "a",
      slot_role: "bench",
      position: "any",
      level: "any",
      pitch_index: null,
    });
    expect(res.data.rotationRule).toBe("Rotación activa continua");
  });

  it("construye correctamente Intent 1 para vóley 6v6 con 4 titulares y 2 suplentes", () => {
    const input: IntentPayloadInput = {
      intent: "starter_slots",
      sport: "voleibol",
      format: "6v6",
      pitchSlots: [
        { pitchIndex: 0, position: "armador", level: "any" },
        { pitchIndex: 1, position: "central", level: "any" },
        { pitchIndex: 2, position: "opuesto", level: "any" },
        { pitchIndex: 3, position: "receptor", level: "any" },
      ],
      benchCount: 2,
      rotationRule: "Rotación fija cada 15 min",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("pickup");
    expect(res.data.totalStartersA).toBe(4);
    expect(res.data.totalBenchA).toBe(2);
    expect(res.data.totalRivalB).toBe(0);
    expect(res.data.slots).toHaveLength(6);
    expect(res.data.slots.slice(0, 4).every((s) => s.slot_role === "starter")).toBe(true);
    expect(res.data.slots.slice(4).every((s) => s.slot_role === "bench")).toBe(true);
  });

  it("construye correctamente Intent 1 para básquet 3v3 con 2 titulares y 1 suplente", () => {
    const input: IntentPayloadInput = {
      intent: "starter_slots",
      sport: "basquet",
      format: "3v3",
      pitchSlots: [
        { pitchIndex: 0, position: "base", level: "mid" },
        { pitchIndex: 1, position: "pivot", level: "high" },
      ],
      benchCount: 1,
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.totalStartersA).toBe(2);
    expect(res.data.totalBenchA).toBe(1);
    expect(res.data.slots).toHaveLength(3);
  });

  it("construye correctamente Intent 1 para pádel 2v2 con 1 titular faltante", () => {
    const input: IntentPayloadInput = {
      intent: "starter_slots",
      sport: "padel",
      format: "2v2",
      pitchSlots: [{ pitchIndex: 1, position: "reves", level: "mid" }],
      benchCount: 0,
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.totalStartersA).toBe(1);
    expect(res.data.totalBenchA).toBe(0);
    expect(res.data.slots[0].position).toBe("reves");
    expect(res.data.slots[0].pitch_index).toBe(1);
  });
});

describe("buildMatchSlotsPayload — Intent 2: bench_only (Happy Paths)", () => {
  it("construye correctamente Intent 2 para fútbol 5v5 con 0 titulares y 2 suplentes", () => {
    const input: IntentPayloadInput = {
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: "Rotación activa continua",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("pickup");
    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(2);
    expect(res.data.totalRivalB).toBe(0);
    expect(res.data.slots).toHaveLength(2);
    expect(res.data.slots.every((s) => s.side === "a" && s.slot_role === "bench")).toBe(true);
    expect(res.data.slots.every((s) => s.pitch_index === null)).toBe(true);
    expect(res.data.rotationRule).toBe("Rotación activa continua");
  });

  it("construye correctamente Intent 2 para vóley 6v6 con 1 suplente y pacto obligatorio", () => {
    const input: IntentPayloadInput = {
      intent: "bench_only",
      sport: "voleibol",
      format: "6v6",
      benchCount: 1,
      rotationRule: "Rotación fija cada 15 min",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(1);
    expect(res.data.slots).toHaveLength(1);
    expect(res.data.slots[0].slot_role).toBe("bench");
  });

  it("construye correctamente Intent 2 para básquet 3v3 con 3 suplentes", () => {
    const input: IntentPayloadInput = {
      intent: "bench_only",
      sport: "basquet",
      format: "3v3",
      benchCount: 3,
      rotationRule: "Pacto libre acordado",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(3);
    expect(res.data.slots).toHaveLength(3);
  });

  it("construye correctamente Intent 2 para pádel 2v2 con el máximo de suplentes (4)", () => {
    const input: IntentPayloadInput = {
      intent: "bench_only",
      sport: "padel",
      format: "2v2",
      benchCount: 4,
      rotationRule: "Rotación activa continua",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(4);
    expect(res.data.slots).toHaveLength(4);
  });
});

describe("buildMatchSlotsPayload — Intent 3: challenge (Happy Paths)", () => {
  it("construye correctamente Intent 3 para fútbol 5v5 con 5 rivales en Side B y equipo completo", () => {
    const input: IntentPayloadInput = {
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      hostTeamName: "Los Galácticos",
      benchCount: 0,
      challengeModeType: "full_team",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("challenge");
    expect(res.data.hostTeamName).toBe("Los Galácticos");
    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(0);
    expect(res.data.totalRivalB).toBe(5);
    expect(res.data.slots).toHaveLength(5);
    expect(res.data.slots.every((s) => s.side === "b" && s.slot_role === "starter")).toBe(true);
    expect(res.data.slots.every((s) => s.pitch_index === null)).toBe(true);
  });

  it("construye correctamente Intent 3 para vóley 6v6 con 6 titulares rivales y 2 suplentes en Side B", () => {
    const input: IntentPayloadInput = {
      intent: "challenge",
      sport: "voleibol",
      format: "6v6",
      hostTeamName: "Halcones VC",
      benchCount: 2,
      challengeModeType: "open_slots",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("challenge");
    expect(res.data.hostTeamName).toBe("Halcones VC");
    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(0);
    expect(res.data.totalRivalB).toBe(8); // 6 starters + 2 bench
    expect(res.data.slots).toHaveLength(8);

    const startersB = res.data.slots.filter((s) => s.slot_role === "starter");
    const benchB = res.data.slots.filter((s) => s.slot_role === "bench");
    expect(startersB).toHaveLength(6);
    expect(benchB).toHaveLength(2);
    expect(res.data.slots.every((s) => s.side === "b")).toBe(true);
  });

  it("construye correctamente Intent 3 para básquet 3v3 con 3 titulares rivales", () => {
    const input: IntentPayloadInput = {
      intent: "challenge",
      sport: "basquet",
      format: "3v3",
      hostTeamName: "Rucker Street",
      benchCount: 0,
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("challenge");
    expect(res.data.totalRivalB).toBe(3);
    expect(res.data.slots).toHaveLength(3);
  });

  it("construye correctamente Intent 3 para pádel 2v2 con 2 titulares rivales", () => {
    const input: IntentPayloadInput = {
      intent: "challenge",
      sport: "padel",
      format: "2v2",
      hostTeamName: "Top Padel",
      benchCount: 0,
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("challenge");
    expect(res.data.totalRivalB).toBe(2);
    expect(res.data.slots).toHaveLength(2);
  });

  it("soporta fútbol 11v11 con 4 suplentes rivales (15 slots) respetando el límite < 16 de PostgreSQL", () => {
    const input: IntentPayloadInput = {
      intent: "challenge",
      sport: "futbol",
      format: "11v11",
      hostTeamName: "Atlético BaFut",
      benchCount: 4,
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.totalRivalB).toBe(15);
    expect(res.data.slots).toHaveLength(15);
    // 15 es estrictamente menor a 16 (límite del trigger guard_slot_side_insert)
    expect(res.data.slots.length).toBeLessThan(16);
  });
});

describe("buildMatchSlotsPayload — Boundary Tests: Starter Limits & Format Capacity", () => {
  it("rechaza si starterCount supera la capacidad de jugadores por lado (fútbol 5v5 -> 6)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 6,
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza si starterCount supera la capacidad en pádel 2v2 -> 3", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "padel",
      format: "2v2",
      starterCount: 3,
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza si pitchSlots supera la capacidad en básquet 3v3 -> 4", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "basquet",
      format: "3v3",
      pitchSlots: [
        { pitchIndex: 0, position: "base" },
        { pitchIndex: 1, position: "ala" },
        { pitchIndex: 2, position: "pivot" },
        { pitchIndex: 3, position: "base" },
      ],
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza si starterCount es 0 en Intent 1 (requiere al menos 1 titular)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 0,
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza si starterCount es negativo", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: -1,
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza pitchIndex negativo (< 0)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      pitchSlots: [{ pitchIndex: -1 }],
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza pitchIndex fuera de rango (> 15)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      pitchSlots: [{ pitchIndex: 16 }],
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza índices de cancha duplicados en pitchSlots", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      pitchSlots: [
        { pitchIndex: 1, position: "def" },
        { pitchIndex: 1, position: "mid" },
      ],
    });
    expect(res.ok).toBe(false);
  });
});

describe("buildMatchSlotsPayload — Boundary Tests: Bench Limits (0, 1, 4, 5)", () => {
  it("rechaza benchCount = 0 en Intent 2 (Solo Banca REQUIERE al menos 1 suplente)", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 0,
      rotationRule: "Rotación activa continua",
    });
    expect(res.ok).toBe(false);
  });

  it("acepta benchCount = 1 en Intent 2 (límite inferior válido)", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 1,
      rotationRule: "Rotación activa continua",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.totalBenchA).toBe(1);
  });

  it("acepta benchCount = 4 en Intent 2 (límite superior válido)", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 4,
      rotationRule: "Rotación activa continua",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.totalBenchA).toBe(4);
  });

  it("rechaza benchCount = 5 en Intent 2 (supera el límite de 4 suplentes)", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 5,
      rotationRule: "Rotación activa continua",
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza benchCount negativo en cualquier intención", () => {
    const res1 = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 2,
      benchCount: -1,
    });
    expect(res1.ok).toBe(false);

    const res2 = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      benchCount: -1,
    });
    expect(res2.ok).toBe(false);
  });
});

describe("buildMatchSlotsPayload — Boundary Tests: Host Team Name Length (1, 2, 60, 61)", () => {
  it("rechaza nombre de equipo de 1 carácter ('A')", () => {
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      hostTeamName: "A",
    });
    expect(res.ok).toBe(false);
  });

  it("acepta nombre de equipo de 2 caracteres ('FC') y recorta espacios", () => {
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      hostTeamName: "  FC  ",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.hostTeamName).toBe("FC");
  });

  it("acepta nombre de equipo de exactamente 60 caracteres", () => {
    const name60 = "A".repeat(60);
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      hostTeamName: name60,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.hostTeamName).toBe(name60);
  });

  it("rechaza nombre de equipo de 61 caracteres", () => {
    const name61 = "A".repeat(61);
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      hostTeamName: name61,
    });
    expect(res.ok).toBe(false);
  });

  it("permite nombre de equipo nulo o vacío en Intent 3", () => {
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      hostTeamName: null,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.hostTeamName).toBeNull();
  });
});

describe("buildMatchSlotsPayload — Boundary Tests: Rotation Rule Length", () => {
  it("rechaza regla de rotación de 1 carácter ('R')", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: "R",
    });
    expect(res.ok).toBe(false);
  });

  it("acepta regla de rotación de 2 caracteres ('15')", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: "15",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.rotationRule).toBe("15");
  });

  it("acepta regla de rotación de 120 caracteres", () => {
    const rule120 = "R".repeat(120);
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: rule120,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.rotationRule).toBe(rule120);
  });

  it("rechaza regla de rotación de 121 caracteres", () => {
    const rule121 = "R".repeat(121);
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: rule121,
    });
    expect(res.ok).toBe(false);
  });

  it("aplica fallback automático a 'Rotación activa continua' en Intent 2 si rotationRule está vacía", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: "",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.rotationRule).toBe("Rotación activa continua");
  });
});

describe("buildMatchSlotsPayload — Security & Integrity Invariants", () => {
  it("invariante RLS/Trigger: NINGÚN slot de Side B se genera en modo pickup (Intent 1 y Intent 2)", () => {
    const res1 = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 4,
      benchCount: 2,
    });
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      expect(res1.data.slots.some((s) => s.side === "b")).toBe(false);
      expect(res1.data.totalRivalB).toBe(0);
    }

    const res2 = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "voleibol",
      format: "6v6",
      benchCount: 3,
    });
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.data.slots.some((s) => s.side === "b")).toBe(false);
      expect(res2.data.totalRivalB).toBe(0);
    }
  });

  it("invariante RLS/Trigger: NINGÚN slot de Side A se genera en modo reto (Intent 3)", () => {
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.slots.some((s) => s.side === "a")).toBe(false);
      expect(res.data.totalStartersA).toBe(0);
      expect(res.data.totalBenchA).toBe(0);
    }
  });

  it("invariante de roles: todos los slots tienen estrictamente 'starter' o 'bench'", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 3,
      benchCount: 2,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      for (const slot of res.data.slots) {
        expect(["starter", "bench"]).toContain(slot.slot_role);
      }
    }
  });

  it("invariante de banca: los slots de banca NUNCA tienen pitch_index (siempre null)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      pitchSlots: [{ pitchIndex: 0, position: "gk" }],
      benchCount: 3,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const benchSlots = res.data.slots.filter((s) => s.slot_role === "bench");
      expect(benchSlots).toHaveLength(3);
      expect(benchSlots.every((s) => s.pitch_index === null)).toBe(true);
    }
  });

  it("invariante de rivales: los slots de Side B NUNCA tienen pitch_index (siempre null)", () => {
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "voleibol",
      format: "6v6",
      benchCount: 2,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.slots.every((s) => s.pitch_index === null)).toBe(true);
    }
  });

  it("invariante deportiva: rechaza posiciones incompatibles con el deporte (ej. 'gk' en básquet)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "basquet",
      format: "3v3",
      pitchSlots: [{ pitchIndex: 0, position: "gk" }],
    });
    expect(res.ok).toBe(false);
  });

  it("invariante deportiva: rechaza formatos incompatibles con el deporte (ej. '11v11' en pádel)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "padel",
      format: "11v11",
      starterCount: 2,
    });
    expect(res.ok).toBe(false);
  });
});
```

---

## 5. Downstream Integration Guidance for Worker M1

### Implementation Blueprint for `lib/match-intent-payload.ts`

When Worker M1 writes `lib/match-intent-payload.ts`, it should follow this structural blueprint:

```typescript
import {
  formatAllowedForSport,
  isPosition,
  isSport,
  positionAllowedForSport,
  type Format,
  type Position,
  type Sport,
} from "@/lib/sport-rules";
import { playersPerSideFromFormat } from "@/lib/formations-catalog";
import { parseRotationRule, parseTeamName } from "@/lib/match-write";

export type MatchCreationIntent = "starter_slots" | "bench_only" | "challenge";

export interface IntentPayloadInput {
  intent: MatchCreationIntent;
  sport: Sport;
  format: string;
  formationId?: string | null;
  pitchSlots?: Array<{
    pitchIndex: number;
    position?: string;
    level?: string;
  }>;
  starterCount?: number;
  benchCount?: number;
  rotationRule?: string | null;
  hostTeamName?: string | null;
  challengeModeType?: "full_team" | "open_slots";
}

export interface ValidatedMatchPayload {
  matchMode: "pickup" | "challenge";
  hostTeamName: string | null;
  rotationRule: string | null;
  slots: Array<{
    side: "a" | "b";
    slot_role: "starter" | "bench";
    position: string;
    level: string;
    pitch_index: number | null;
  }>;
  totalStartersA: number;
  totalBenchA: number;
  totalRivalB: number;
}

const DEFAULT_ROTATION_RULE = "Rotación activa continua";
const VALID_LEVELS = new Set(["any", "low", "mid", "high"]);

export function buildMatchSlotsPayload(
  input: IntentPayloadInput
): { ok: true; data: ValidatedMatchPayload } | { ok: false; error: string } {
  // 1. Validar deporte y formato
  if (!isSport(input.sport)) {
    return { ok: false, error: "Elige un deporte válido." };
  }
  if (!formatAllowedForSport(input.sport, input.format as Format)) {
    return { ok: false, error: "Ese formato no aplica para el deporte." };
  }

  const perSide = playersPerSideFromFormat(input.format);

  // 2. Validar benchCount común
  const benchCount = input.benchCount ?? 0;
  if (!Number.isInteger(benchCount) || benchCount < 0 || benchCount > 4) {
    return { ok: false, error: "Los suplentes deben ser un número entre 0 y 4." };
  }

  // 3. Resolver según Intención
  if (input.intent === "starter_slots") {
    // --- INTENCIÓN 1: COMPLETAR MI EQUIPO TITULAR ---
    let starterSlots: Array<{
      side: "a";
      slot_role: "starter";
      position: string;
      level: string;
      pitch_index: number | null;
    }> = [];

    if (input.pitchSlots && input.pitchSlots.length > 0) {
      if (input.pitchSlots.length > perSide) {
        return { ok: false, error: `No puedes marcar más de ${perSide} titulares en cancha.` };
      }
      const seenPitch = new Set<number>();
      for (const spot of input.pitchSlots) {
        if (!Number.isInteger(spot.pitchIndex) || spot.pitchIndex < 0 || spot.pitchIndex > 15) {
          return { ok: false, error: "Índice de cancha inválido." };
        }
        if (seenPitch.has(spot.pitchIndex)) {
          return { ok: false, error: "Huecos duplicados en la cancha." };
        }
        seenPitch.add(spot.pitchIndex);

        const pos = spot.position ?? "any";
        if (pos !== "any" && (!isPosition(pos) || !positionAllowedForSport(input.sport, pos as Position))) {
          return { ok: false, error: "Esa posición no aplica para el deporte." };
        }
        const lvl = spot.level && VALID_LEVELS.has(spot.level) ? spot.level : "any";
        starterSlots.push({
          side: "a",
          slot_role: "starter",
          position: pos,
          level: lvl,
          pitch_index: spot.pitchIndex,
        });
      }
    } else {
      const count = input.starterCount ?? 0;
      if (!Number.isInteger(count) || count < 1 || count > perSide) {
        return { ok: false, error: `Los cupos titulares deben ser un número entre 1 y ${perSide}.` };
      }
      for (let i = 0; i < count; i++) {
        starterSlots.push({
          side: "a",
          slot_role: "starter",
          position: "any",
          level: "any",
          pitch_index: null,
        });
      }
    }

    const benchSlots: Array<{
      side: "a";
      slot_role: "bench";
      position: string;
      level: string;
      pitch_index: null;
    }> = [];

    let rotationRule: string | null = null;
    if (benchCount > 0) {
      for (let i = 0; i < benchCount; i++) {
        benchSlots.push({
          side: "a",
          slot_role: "bench",
          position: "any",
          level: "any",
          pitch_index: null,
        });
      }
      rotationRule = parseRotationRule(input.rotationRule) ?? DEFAULT_ROTATION_RULE;
    }

    const allSlots = [...starterSlots, ...benchSlots];

    return {
      ok: true,
      data: {
        matchMode: "pickup",
        hostTeamName: null,
        rotationRule,
        slots: allSlots,
        totalStartersA: starterSlots.length,
        totalBenchA: benchSlots.length,
        totalRivalB: 0,
      },
    };
  } else if (input.intent === "bench_only") {
    // --- INTENCIÓN 2: SOLO BANCA / SUPLENTES ---
    if (benchCount < 1 || benchCount > 4) {
      return { ok: false, error: "Debes seleccionar entre 1 y 4 suplentes para rotación." };
    }

    // Regla de rotación obligatoria con fallback
    const rawRule = typeof input.rotationRule === "string" ? input.rotationRule.trim() : "";
    let rotationRule: string;
    if (!rawRule) {
      rotationRule = DEFAULT_ROTATION_RULE;
    } else if (rawRule.length < 2 || rawRule.length > 120) {
      return { ok: false, error: "La regla de rotación debe tener entre 2 y 120 caracteres." };
    } else {
      rotationRule = rawRule;
    }

    const benchSlots: Array<{
      side: "a";
      slot_role: "bench";
      position: string;
      level: string;
      pitch_index: null;
    }> = [];

    for (let i = 0; i < benchCount; i++) {
      benchSlots.push({
        side: "a",
        slot_role: "bench",
        position: "any",
        level: "any",
        pitch_index: null,
      });
    }

    return {
      ok: true,
      data: {
        matchMode: "pickup",
        hostTeamName: null,
        rotationRule,
        slots: benchSlots,
        totalStartersA: 0,
        totalBenchA: benchCount,
        totalRivalB: 0,
      },
    };
  } else if (input.intent === "challenge") {
    // --- INTENCIÓN 3: RETO A EQUIPO RIVAL ---
    let hostTeamName: string | null = null;
    if (input.hostTeamName != null && input.hostTeamName !== "") {
      const trimmed = input.hostTeamName.trim();
      if (trimmed.length > 0) {
        if (trimmed.length < 2 || trimmed.length > 60) {
          return { ok: false, error: "El nombre de tu equipo debe tener entre 2 y 60 caracteres." };
        }
        hostTeamName = trimmed;
      }
    }

    const totalSideB = perSide + benchCount;
    if (totalSideB >= 16) {
      return { ok: false, error: "El equipo rival no puede tener 16 o más cupos." };
    }

    const rivalSlots: Array<{
      side: "b";
      slot_role: "starter" | "bench";
      position: string;
      level: string;
      pitch_index: null;
    }> = [];

    for (let i = 0; i < perSide; i++) {
      rivalSlots.push({
        side: "b",
        slot_role: "starter",
        position: "any",
        level: "any",
        pitch_index: null,
      });
    }

    for (let i = 0; i < benchCount; i++) {
      rivalSlots.push({
        side: "b",
        slot_role: "bench",
        position: "any",
        level: "any",
        pitch_index: null,
      });
    }

    return {
      ok: true,
      data: {
        matchMode: "challenge",
        hostTeamName,
        rotationRule: null,
        slots: rivalSlots,
        totalStartersA: 0,
        totalBenchA: 0,
        totalRivalB: rivalSlots.length,
      },
    };
  }

  return { ok: false, error: "Intención de convocatoria no válida." };
}
```

### Remediation of `createMatchAction` in `app/actions.ts`

Currently, `app/actions.ts:271` throws:
```typescript
const openCountRaw = Number(formData.get("open_count") ?? "");
if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12) {
  return { error: "Los cupos deben ser un número entero entre 1 y 12." };
}
```
With `buildMatchSlotsPayload`, Worker M1 can cleanly replace lines 220–294 of `app/actions.ts` with:
```typescript
const payloadResult = buildMatchSlotsPayload({
  intent: (formData.get("intent") as MatchCreationIntent) ?? (matchMode === "challenge" ? "challenge" : pitchParsed ? "starter_slots" : "starter_slots"),
  sport,
  format,
  formationId,
  pitchSlots: pitchParsed && "slots" in pitchParsed ? pitchParsed.slots.map(s => ({ pitchIndex: s.pitch_index, position: s.position, level: s.level })) : undefined,
  starterCount: Number(formData.get("open_count") ?? 0) || undefined,
  benchCount,
  rotationRule,
  hostTeamName,
  challengeModeType: asOne(formData.get("challenge_mode_type"), ["full_team", "open_slots"], "full_team"),
});

if (!payloadResult.ok) {
  return { error: payloadResult.error };
}

const { matchMode: verifiedMode, hostTeamName: verifiedHostTeam, rotationRule: verifiedRotation, slots: verifiedSlots } = payloadResult.data;
```
This guarantees 100% decoupling, unified validation, zero orphaned schema combinations, and complete testability via Vitest!
