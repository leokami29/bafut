# Adversarial Challenge Report — Milestone M1 (challenger_m1_2)

**Timestamp:** 2026-09-10T23:25:00Z  
**Agent:** challenger_m1_2  
**Role:** Milestone M1 Adversarial Stress Verifier (Multi-sport format math & boundary stress)  
**Target:** `lib/match-intent-payload.ts`, `lib/match-intent-payload.test.ts`  

---

## Challenge Summary

**Overall risk assessment:** LOW (Implementation is robust, mathematically sound across all 12 sport-format combinations, and adheres strictly to PostgreSQL database check constraints and triggers).

A total of **121 automated empirical stress tests** were executed across 6 core challenge dimensions in `lib/match-intent-payload.challenge.test.ts`. All 121 tests passed (100% pass rate) with zero failures. Combined with the 48 baseline tests in `lib/match-intent-payload.test.ts`, 169 tests verify the domain logic and payload builder invariants.

---

## Challenges Evaluated

### [Low Risk / Robust] Challenge 1: Multi-Sport Format Capacity Limits & Position Constraints
- **Assumption challenged:** That `buildMatchSlotsPayload` properly enforces player capacities (`perSide = playersPerSideFromFormat(format)`) and position whitelists across all 12 valid combinations across 5 sports (Fútbol 5v5/6v6/7v7/8v8/11v11, Futsal 5v5, Básquet 3v3/5v5, Vóley 2v2/6v6, Pádel 2v2/4v4).
- **Attack scenario:** An attacker or buggy client submits `starterCount = perSide + 1`, `pitchSlots.length > perSide`, or alien sport positions (e.g. `position: 'gk'` in básquet/pádel/vóley, `position: 'cierre'` in fútbol 11v11).
- **Blast radius:** Illegal slots could be stored in database, violating sports rules or breaking the live tactical board layout.
- **Empirical result:** PASS. The validator rejected `starterCount = perSide + 1` for all 12 formats with error: `Los cupos titulares no pueden superar el formato (${perSide} para ${format})`. Alien positions were rejected with `Esa posición no aplica para el deporte.` Goalkeeper assignment (`needKeeper: true`) was strictly scoped to sports with keepers (`futbol` and `futbol_sala`), and safely ignored on sports without keepers.
- **Mitigation status:** Fully defended in `lib/match-intent-payload.ts:187-194, 203-207, 241-246`.

### [Low Risk / Robust] Challenge 2: Host Team Name Boundary Stress & PostgreSQL Constraint Alignment
- **Assumption challenged:** That `sanitizeTeamName` enforces the PostgreSQL check constraint `matches_host_team_name_len` (`host_team_name is null or char_length(btrim(host_team_name)) between 2 and 60`).
- **Attack scenario:** Submitting team names with length 0, 1, 2, 59, 60, 61, 1000, whitespace-only padding, non-string types, or Unicode/emoji characters.
- **Blast radius:** If boundary strings (< 2 or > 60 after trim) bypassed the domain layer, database inserts would fail with unhandled `check constraint "matches_host_team_name_len"` violation and abort transactions.
- **Empirical result:** PASS. 
  - Length 0 and whitespace-only: safely return `team: null` (host team name is optional).
  - Length 1 (`"A"` or `"  B  "`): rejected with error `El nombre de tu equipo debe tener entre 2 y 60 caracteres.`
  - Length 2 (`"FC"`, `"10"`): accepted and trimmed.
  - Length 60: accepted.
  - Length 61 and 1000: rejected with error.
  - Non-string types (`12345`, `true`, `{}`): rejected.
  - Unicode/emojis (`"Atlético San Martín ⚽"`): accepted and preserved.
- **Mitigation status:** Fully defended in `lib/match-intent-payload.ts:93-110`.

### [Low Risk / Robust] Challenge 3: Rotation Rule Boundary Stress & Invariant Scoping
- **Assumption challenged:** That `sanitizeRotationRule` enforces the PostgreSQL check constraint `matches_rotation_rule_len` (`rotation_rule is null or char_length(btrim(rotation_rule)) between 2 and 120`) and correctly scopes when a rotation pact is required vs null.
- **Attack scenario:** Submitting rotation rules of length 0, 1, 2, 119, 120, 121, 5000, non-string types, or providing a rule in Intent 1 with `benchCount = 0`.
- **Blast radius:** DB constraint violation on `matches_rotation_rule_len` or storing useless rotation text when no bench players exist.
- **Empirical result:** PASS.
  - In Intent 1 with `benchCount = 0`, `rotationRule` is strictly set to `null` (no bench exists, rotation is irrelevant).
  - In Intent 1 with `benchCount > 0`, Intent 2, and Intent 3 with bench:
    - Empty, null, undefined, or whitespace-only strings fall back to default `"Rotación activa continua"`.
    - Length 1 (`"R"`, `"  X  "`): rejected with `La regla de rotación debe tener entre 2 y 120 caracteres.`
    - Length 2 (`"15"`, `"Ok"`): accepted.
    - Length 120: accepted.
    - Length 121 and 5000: rejected.
- **Mitigation status:** Fully defended in `lib/match-intent-payload.ts:112-129, 259-266, 309-312, 368-374`.

### [Low Risk / Robust] Challenge 4: Bench Count Boundary Stress & Intent 2 Enforcement
- **Assumption challenged:** That `benchCount` is bounded between 0 and 4 in general, strictly between 1 and 4 in Intent 2 ("Solo Banca"), and rejects negative, float, or excessive values.
- **Attack scenario:** Submitting `benchCount: -1`, `-100`, `0` in Intent 2, `5`, `100`, `1.5`, `NaN`.
- **Blast radius:** Creating illegal bench slots, crashing calculation loops, or allowing Intent 2 to create 0 slots (which would leave a match with 0 open spots).
- **Empirical result:** PASS.
  - `-1`, `5`, `100`, `1.5`, `NaN` rejected at top-level with: `Los suplentes deben ser un número entre 0 y 4.`
  - In Intent 2, `benchCount = 0` is rejected with: `Debes seleccionar entre 1 y 4 suplentes para la banca.`
  - In Intent 2, `benchCount` between 1 and 4 correctly generates exactly 1 to 4 bench slots on Side A with `slot_role = 'bench'`.
- **Mitigation status:** Fully defended in `lib/match-intent-payload.ts:174-180, 305-307`.

### [Low Risk / Robust] Challenge 5: Pitch Indices Boundary Stress
- **Assumption challenged:** That interactive tactical pitch indices are strictly integers within `[0, 15]` and cannot be duplicated.
- **Attack scenario:** Submitting `pitchIndex: -1`, `16`, `999`, `2.5`, duplicate indices `[4, 4]`, or exceeding `perSide`.
- **Blast radius:** Malformed board coordinates rendering outside the pitch boundary, duplicate slots for the same position.
- **Empirical result:** PASS.
  - `-1`, `16`, `999`, `2.5` rejected with `Índice de cancha inválido.`
  - Duplicate index `[4, 4]` rejected with `Huecos duplicados en la cancha.`
  - `pitchSlots.length > perSide` rejected with format capacity message.
  - Lower bound (0) and upper bound (15) both accepted.
- **Mitigation status:** Fully defended in `lib/match-intent-payload.ts:211-218`.

### [Low Risk / Robust] Challenge 6: PostgreSQL Trigger `guard_slot_side_insert` & Check Constraint Invariants
- **Assumption challenged:** That the payload builder never generates a slot configuration that violates `guard_slot_side_insert` (which forbids side 'b' in pickup, and enforces max 16 side 'b' slots in challenge) or PostgreSQL check constraints (`match_slots_side_check`, `match_slots_slot_role_check`, `match_slots_position_check`, `match_slots_level_check`).
- **Attack scenario:** Generating side 'b' in Intent 1 or 2, generating side 'a' in Intent 3, or generating >= 16 slots in Side B in fútbol 11v11 with maximum bench.
- **Blast radius:** Postgres trigger throws unhandled exception `El lado B ya tiene el maximo de cupos` or `No se puede abrir el lado B asi`, aborting match creation.
- **Empirical result:** PASS.
  - Intent 1 and Intent 2: `matchMode = 'pickup'`, 100% of slots have `side = 'a'`. ZERO slots have `side = 'b'`.
  - Intent 3: `matchMode = 'challenge'`, 100% of slots have `side = 'b'`. ZERO slots have `side = 'a'`.
  - Maximum Side B count across all 12 formats: Fútbol 11v11 + 4 bench = 15 slots. 15 is strictly `< 16`, so the trigger `if v_side_b_count >= 16` will NEVER fire.
  - All slots have `slot_role in ('starter', 'bench')`, `side in ('a', 'b')`, `position in (enum 18 values)`, `level in ('low', 'mid', 'high', 'any')`.
  - Bench slots and Side B slots always have `pitch_index: null`.
- **Mitigation status:** Invariants mathematically guaranteed and empirically tested across all 12 sport formats x 5 bench count variations.

---

## Stress Test Results

| # | Scenario | Expected Behavior | Actual Behavior | Result |
|---|----------|-------------------|-----------------|--------|
| 1 | All 12 sport/format combos with min/max starters | Correct slot count and format compliance | Verified on 12 combos (2v2 to 11v11) | PASS |
| 2 | Starter count > perSide (e.g. 12 on 11v11, 6 on 5v5, 3 on 2v2) | Reject with capacity message | Rejected with capacity message | PASS |
| 3 | Pitch slots length > perSide | Reject with capacity message | Rejected with capacity message | PASS |
| 4 | Alien positions for sport (e.g. gk in basquet/padel, cierre in soccer) | Reject with position message | Rejected with position message | PASS |
| 5 | Goalkeeper rule on keeper sports (futbol, futsal) vs non-keeper sports | 'gk' only assigned if hasKeeper=true | 'gk' assigned only on keeper sports | PASS |
| 6 | Illegal sports (tennis) or illegal formats (padel 11v11, futbol 2v2) | Reject with invalid format/sport | Rejected with invalid format/sport | PASS |
| 7 | Host team name length 0, whitespace, null, undefined | Returns null | Returns null | PASS |
| 8 | Host team name length 1 (untrimmed or trimmed) | Reject (2-60 chars) | Rejected (2-60 chars) | PASS |
| 9 | Host team name length 2, 59, 60, trim to 60 | Accept trimmed string | Accepted trimmed string | PASS |
| 10 | Host team name length 61, 1000, non-string types | Reject | Rejected | PASS |
| 11 | Rotation rule null, empty, whitespace | Fallback to "Rotación activa continua" | Fallback applied | PASS |
| 12 | Rotation rule length 1 | Reject (2-120 chars) | Rejected (2-120 chars) | PASS |
| 13 | Rotation rule length 2, 119, 120, trim to 120 | Accept trimmed string | Accepted trimmed string | PASS |
| 14 | Rotation rule length 121, 5000, non-string types | Reject | Rejected | PASS |
| 15 | Rotation rule in Intent 1 with benchCount=0 | Returns null | Returns null | PASS |
| 16 | Bench count -1, -100, 5, 100, 1.5, NaN | Reject (0 to 4) | Rejected (0 to 4) | PASS |
| 17 | Bench count 0 in Intent 2 (Solo Banca) | Reject (1 to 4 required) | Rejected (1 to 4 required) | PASS |
| 18 | Bench count 1 to 4 in Intent 2 | Accept with totalStartersA=0 | Accepted with totalStartersA=0 | PASS |
| 19 | Pitch index -1, 16, 999, 2.5 | Reject invalid pitch index | Rejected invalid pitch index | PASS |
| 20 | Pitch index duplicates ([4, 4]) | Reject duplicate huecos | Rejected duplicate huecos | PASS |
| 21 | Pitch index bounds 0 and 15 | Accept index 0 and 15 | Accepted index 0 and 15 | PASS |
| 22 | Trigger invariant: Pickup modes never generate side 'b' | 0 side 'b' slots | 0 side 'b' slots | PASS |
| 23 | Trigger invariant: Challenge mode never generates side 'a' | 0 side 'a' slots | 0 side 'a' slots | PASS |
| 24 | Trigger invariant: Max Side B slots in challenge is <= 15 (< 16 trigger) | slots.length < 16 for all sports | slots.length <= 15 for all sports | PASS |
| 25 | DB Check constraints: slot_role, position, level, side | 100% compliant with PostgreSQL | 100% compliant with PostgreSQL | PASS |

---

## Unchallenged Areas

- UI DOM rendering of the board and roving tabindex accessibility (Covered under Milestone M2 and M3 by separate specialist agents).
- Live PostgreSQL database network connection (Mocked and validated against migration DDL and trigger SQL source code).
