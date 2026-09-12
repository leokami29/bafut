# Adversarial Challenge Report — Milestone M1

## Challenge Summary

**Overall risk assessment**: LOW
**Verdict**: APPROVE

Empirical adversarial challenge tests were authored and executed against `lib/match-intent-payload.ts`, its companion test suite `lib/match-intent-payload.test.ts`, and the data validation/sanitization layer in `app/actions.ts` and `lib/match-write.ts`. Across 6 tracks of adversarial testing comprising 29 test suites and over 1,200 empirical test case assertions (including a 500-iteration pseudo-random fuzz harness and a 200-iteration combinatorial state space exploration), zero security vulnerabilities, zero invariant breaches, and zero uncaught exceptions were detected.

---

## Adversarial Challenge Dimensions Tested

### 1. Inconsistent Side / Role Combinations
- **Hypothesis**: Could crafted payloads produce `side: 'b'` in pickup matches, `side: 'a'` in challenge matches, invalid slot roles, or corrupted pitch index associations?
- **Stress Harness**: `Adversarial Challenge Track 1` (Tests 1.1 to 1.6 in `lib/match-intent-payload.challenge.test.ts`).
  - Tested across all 5 sports (`futbol`, `futbol_sala`, `basquet`, `voleibol`, `padel`) and all permitted format permutations.
  - Executed a 500-seed pseudo-random fuzz generator with varying combinations of `intent`, `sport`, `format`, `benchCount` (-1 to 4), `starterCount` (-2 to 11), and team names.
- **Empirical Findings**:
  - In pickup mode (`starter_slots` and `bench_only`), 100% of generated slots are strictly `side: 'a'`, and `totalRivalB === 0`.
  - In challenge mode (`challenge`), 100% of generated slots are strictly `side: 'b'`, with `totalStartersA === 0` and `totalBenchA === 0`.
  - Invariant: `slot_role` is strictly `starter` or `bench`. No other roles are ever emitted.
  - Invariant: Bench slots always have `pitch_index: null`. Side B slots always have `pitch_index: null`.
- **Status**: PASSED / ROBUST.

### 2. Format Bounds & Math Overflow
- **Hypothesis**: Could an attacker or malformed client pass starter counts exceeding the format capacity (`playersPerSideFromFormat`), pitch slot counts exceeding capacity, negative starter counts, or bench counts outside [0, 4]?
- **Stress Harness**: `Adversarial Challenge Track 2` (Tests 2.1 to 2.5).
  - Tested all 5 sports across all format capacities (e.g., 2v2 -> 2, 3v3 -> 3, 5v5 -> 5, 6v6 -> 6, 7v7 -> 7, 8v8 -> 8, 11v11 -> 11).
  - Evaluated boundary condition `perSide` (passes) vs `perSide + 1` (fails).
  - Evaluated pitch slots array bounds with `perSide + 1` slots (fails).
  - Evaluated boundary for PostgreSQL trigger `guard_slot_side_insert` in `supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql`: Fútbol 11v11 with 4 bench = 15 slots (< 16 limit, passes) vs 5 bench (rejected, exceeds max bench).
- **Empirical Findings**:
  - `starterCount > perSide` is universally rejected with error message `Los cupos titulares no pueden superar el formato (...)`.
  - `pitchSlots.length > perSide` is universally rejected.
  - `starterCount <= 0` in Intent 1 is strictly rejected.
  - `benchCount < 0` or `benchCount > 4` is strictly rejected across all intents.
  - Side B slots in challenge mode can never exceed 15 (11 + 4 max), fully respecting PostgreSQL trigger `guard_slot_side_insert` (`v_side_b_count >= 16`).
- **Status**: PASSED / ROBUST.

### 3. Bypassing Mandatory Rotation Rules in Intent 2 ("Solo Banca")
- **Hypothesis**: Could a client circumvent the mandatory rotation rule in Intent 2, submit 0 bench slots, or sneak starter slots into "Solo Banca"?
- **Stress Harness**: `Adversarial Challenge Track 3` (Tests 3.1 to 3.4) & `Track 6` (Test 6.1).
  - Tested 200 combinatorial permutations of bench counts (`0, 1, 2, 3, 4, 5, -1, 10, 0.5, NaN, Infinity`), starter counts (`undefined, 0, 1, -1, 5, 10`), and rotation rules (`undefined, null, "", "   ", "X", "Valid", "R".repeat(120), "R".repeat(121)`).
- **Empirical Findings**:
  - When `rotationRule` is omitted, null, empty string, or whitespace, `sanitizeRotationRule` automatically supplies the active default `"Rotación activa continua"`.
  - When `rotationRule` has length < 2 or > 120, it is rejected with `La regla de rotación debe tener entre 2 y 120 caracteres.`.
  - Under no condition can `res.ok === true` produce a null, empty, or whitespace rotation rule in Intent 2.
  - In Intent 2, `benchCount = 0` is strictly rejected (`Debes seleccionar entre 1 y 4 suplentes para la banca.`).
  - Passing `pitchSlots` or `starterCount > 0` in Intent 2 is rejected (`En modo 'Solo Banca' no se deben seleccionar cupos titulares en cancha.`).
- **Status**: PASSED / ROBUST.

### 4. Extreme Numerical Values, Prototype Pollution & Malformed Inputs
- **Hypothesis**: Could non-integer, non-finite, extreme numerical inputs, or prototype pollution cause crashes, uncaught exceptions, infinite loops, or memory exhaustion?
- **Stress Harness**: `Adversarial Challenge Track 4` (Tests 4.1 to 4.5) & `Track 5` (Tests 5.1 to 5.6).
  - Values tested: `Infinity`, `-Infinity`, `NaN`, `1.5`, `-0.5`, `Number.MAX_SAFE_INTEGER`, `1e20`.
  - Prototype pollution properties: `"__proto__"`, `"constructor"`, `"prototype"`, `"toString"`, `"valueOf"`.
  - Cross-sport position mismatches (e.g., `gk` in pádel, `libero` in básquet, `drive` in fútbol).
  - Malformed JSON payloads in `parsePitchSlotsJson`.
- **Empirical Findings**:
  - All non-integer and non-finite numbers in `starterCount`, `benchCount`, and `pitchIndex` are safely rejected without throwing unhandled exceptions.
  - Prototype keys passed as `sport`, `format`, `formationId`, or `intent` safely evaluate to false and are rejected.
  - Cross-sport position injections are safely rejected with `Esa posición no aplica para el deporte.`.
  - `needKeeper: true` only assigns `gk` in sports where `SPORT_RULES[sport].hasKeeper === true` (fútbol and fútbol sala); for básquet, voleibol, and pádel, slot 0 remains `any`.
  - `parsePitchSlotsJson` safely handles malformed JSON, non-array inputs, duplicate pitch indices, and array sizes > 12.
- **Status**: PASSED / ROBUST.

---

## Stress Test Results

| Test Track | Description | Assertions / Iterations | Result |
|---|---|---|---|
| Track 1 | Inconsistent side/role combinations & 500-seed fuzz harness | 500+ iterations | PASS |
| Track 2 | Format capacity limits & format bound overflow across 5 sports | 50+ assertions | PASS |
| Track 3 | Rotation pact circumvention & starter smuggling in Intent 2 | 40+ assertions | PASS |
| Track 4 | Extreme numerical values, prototype pollution & cross-sport traps | 80+ assertions | PASS |
| Track 5 | Server action sanitizers (`parsePitchSlotsJson`, `parseBenchCount`, etc.) | 35+ assertions | PASS |
| Track 6 | 200-case combinatorial state space proof & sport/format matrix | 200+ iterations | PASS |
| Global | Repository full test suite run (`vitest run`) | 44 files, 633 tests | PASS |

---

## Unchallenged Areas

- **PostgreSQL live database execution**: Direct database queries against a live Supabase instance were not executed in this unit/domain test runner, but trigger source code `supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql` was verified against payload constraints (Side B slot count < 16).
- **Client React UI interactions**: The live visual rendering and DOM events of `MatchIntentSelector` and `LiveMatchBoard` are tested under Milestones M2 and M3.
