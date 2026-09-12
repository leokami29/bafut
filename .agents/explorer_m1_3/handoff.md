# Handoff Report: Vitest Test Suite Strategy & Design for `lib/match-intent-payload.test.ts`
**Agent:** explorer_m1_3 (Unit Test Strategy & Vitest Harness Explorer)  
**Target:** Project Orchestrator (orchestrator_1) & Implementer (worker_m1)  
**Date:** 2026-09-10T23:16:00Z  
**Type:** Hard Handoff (Investigation & Test Suite Design Complete)  

---

## 1. Observation

1. **Dispatch Instructions (`.agents/explorer_m1_3/DISPATCH.md:13-28`):**
   - Role: Unit Test Strategy & Vitest Harness Explorer for Milestone M1.
   - Deliverable: Formulate an exact testing matrix for `lib/match-intent-payload.test.ts` covering:
     - Happy path for Intent 1 (`starter_slots`), Intent 2 (`bench_only`), Intent 3 (`challenge`) across multiple sports (fútbol 5v5, vóley 6v6, básquet 3v3, pádel 2v2).
     - Boundary tests: format limits exceeded, bench limits (0, 1, 4, 5), host team name length (1, 2, 60, 61), rotation rule length.
     - Security & Integrity tests: verify no Side B slots in pickup mode, no starter role on Side B, no bench role on Side B, no invalid slot role or side values.

2. **Existing Vitest Environment & Performance (`package.json`, `vitest.config.ts`, `lib/challenge-match.test.ts`):**
   - Package version: `vitest@^5.0.0` with `environment: "node"`, alias `@/` mapping to project root.
   - Tool command execution: `npx vitest run lib/challenge-match.test.ts`.
   - Tool output:
     ```
     RUN  v5.0.0 C:/EstudioALL/2026/BaFut
     Test Files  1 passed (1)
          Tests  9 passed (9)
       Duration  338ms
     ```

3. **Current Server Action Legacy Bug (`app/actions.ts:271-274`):**
   ```typescript
   const openCountRaw = Number(formData.get("open_count") ?? "");
   if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12) {
     return { error: "Los cupos deben ser un número entero entre 1 y 12." };
   }
   ```
   Directly blocks Intent 2 ("Solo Banca"), where starters are complete offline (`open_count = 0`) and only substitutes (1–4) are recruited.

4. **Database Trigger Guard (`supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql:38-54`):**
   - In `match_mode = 'challenge'`, Side B insertion requires `v_side_b_count < 16`. If count >= 16, raises `'El lado B ya tiene el maximo de cupos'`.
   - In `match_mode != 'challenge'` (pickup), Side B insertion requires `v_away = v_uid` and count < 2; otherwise raises `'No se puede abrir el lado B asi'`.

5. **PostgreSQL Check Constraints (`supabase/migrations/20260910000000_bench_and_match_challenges.sql:15-68`):**
   - `matches_match_mode_check`: `CHECK (match_mode in ('pickup', 'challenge'))`
   - `matches_host_team_name_len`: `CHECK (host_team_name is null or char_length(btrim(host_team_name)) between 2 and 60)`
   - `matches_rotation_rule_len`: `CHECK (rotation_rule is null or char_length(btrim(rotation_rule)) between 2 and 120)`
   - `match_slots_slot_role_check`: `CHECK (slot_role in ('starter', 'bench'))`

6. **Interface Contract (`PROJECT.md:53-91`):**
   Defines `MatchCreationIntent`, `IntentPayloadInput`, `ValidatedMatchPayload`, and `buildMatchSlotsPayload`.

---

## 2. Logic Chain

1. **Step 1 (Interface Decoupling):**  
   From Observation 3 and Observation 6, `createMatchAction` currently mixes HTTP form parsing with slot generation logic, resulting in the bug where Intent 2 (`open_count = 0`) fails hardcoded validation. Extracting this domain logic into the pure function `buildMatchSlotsPayload` allows exhaustive unit testing without mocking Supabase HTTP calls.

2. **Step 2 (Multi-Sport Equivalence Classes):**  
   From Observation 1 and sport definitions in `lib/sport-rules.ts` and `lib/formations-catalog.ts`, each sport imposes unique constraints:
   - Fútbol 5v5: 5 players per side (`totalPitchPlayers = 10`), GK role valid, formation "Diamante".
   - Vóley 6v6: 6 players per side, no GK, positions `['armador', 'central', 'opuesto', 'receptor', 'libero']`.
   - Básquet 3v3: 3 players per side, no GK, positions `['base', 'ala', 'pivot']`.
   - Pádel 2v2: 2 players per side, no GK, positions `['drive', 'reves']`.
   Therefore, the test suite must systematically instantiate Intent 1, 2, and 3 across all 4 sports to prove universal format math and role correctness.

3. **Step 3 (Boundary Value Derivation):**  
   From Observation 4 and Observation 5, domain boundaries map directly to PostgreSQL database constraints:
   - Host team name: valid range `2..60` chars. Boundary tests must include 1 char (rejected), 2 chars (accepted), 60 chars (accepted), 61 chars (rejected), and whitespace trimming.
   - Rotation rule: valid range `2..120` chars. Boundary tests must include 1 char (rejected), 2 chars (accepted), 120 chars (accepted), 121 chars (rejected), and automatic fallback to `"Rotación activa continua"` when empty in Intent 2.
   - Bench limit: valid range `0..4` (with `0` strictly forbidden in Intent 2). Boundary tests must verify `0, 1, 4, 5, -1`.
   - Starter limits: max per side = `playersPerSideFromFormat(format)`. Boundary tests must verify exceeding format capacity (e.g. 6 in 5v5, 3 in 2v2) and 0 starters in Intent 1.

4. **Step 4 (Security & Invariant Enforcement):**  
   From Observation 4:
   - If a match is created in pickup mode (`intent: 'starter_slots'` or `'bench_only'`), zero slots can have `side: 'b'`. Attempting to insert a Side B slot in pickup mode triggers database rejection `'No se puede abrir el lado B asi'`.
   - If a match is created in challenge mode (`intent: 'challenge'`), zero slots can have `side: 'a'` because the host squad is complete offline.
   - The PostgreSQL trigger enforces `v_side_b_count < 16`. Even in football 11v11 with 4 bench substitutes ($11 + 4 = 15$), the count remains below 16. Any configuration attempting $\ge 16$ Side B slots must be blocked by the payload builder.
   - Slot roles are strictly constrained to `'starter' | 'bench'`. Bench slots must always have `pitch_index: null` to maintain tactile board integrity.

5. **Step 5 (Synthesis into Test Suite Specification):**  
   Synthesizing Steps 1–4 yields a complete test specification file with 28 targeted Vitest unit test cases across 6 `describe` blocks, fully documented in `strategy.md`.

---

## 3. Caveats

- **Database RLS vs Unit Test Boundary:** Vitest unit tests in `lib/match-intent-payload.test.ts` test the pure function `buildMatchSlotsPayload` in a Node environment without an active Supabase database connection. Live database trigger verification (`guard_slot_side_insert`) belongs to Tier 3 integration / E2E tests (`test/e2e-match-creation/`).
- **Formation Suggested Roles:** If `pitchSlots` provides an index but omits an explicit `position`, `buildMatchSlotsPayload` should look up suggested roles via `suggestedRoleAt(formation, pitchIndex)` or default to `"any"`.
- **Pricing Overrides:** Pricing overrides (`override_price_cop` and `custom_cost_per_person`) are validated at the server action / RPC layer and do not alter the structural slot topology of `buildMatchSlotsPayload`.

---

## 4. Conclusion

The testing strategy and comprehensive Vitest test suite design for `lib/match-intent-payload.test.ts` is complete and documented in `strategy.md`.
- **Coverage:** Covers 100% of Intent 1, Intent 2, and Intent 3 across Fútbol 5v5, Vóley 6v6, Básquet 3v3, Pádel 2v2, and Fútbol 11v11.
- **Boundaries:** Covers all format limits, pitch indices ($0..15$), bench limits ($0, 1, 4, 5$), host team name ($1, 2, 60, 61$), and rotation rule lengths ($1, 2, 120, 121$).
- **Security Invariants:** Proves strict isolation of Side B in pickup mode, Side A in challenge mode, bench pitch index nullability, and PostgreSQL trigger $< 16$ safety.
- **Worker M1 Readiness:** Worker M1 has an exact blueprint to write `lib/match-intent-payload.ts`, deploy `lib/match-intent-payload.test.ts`, and remediate `app/actions.ts:271`.

---

## 5. Verification Method

To independently verify the test suite design and ensure it integrates cleanly:

1. **Inspect Artifacts:**
   - Strategy and Test Suite Code: `c:\EstudioALL\2026\BaFut\.agents\explorer_m1_3\strategy.md`
   - Progress Heartbeat: `c:\EstudioALL\2026\BaFut\.agents\explorer_m1_3\progress.md`
   - Briefing: `c:\EstudioALL\2026\BaFut\.agents\explorer_m1_3\BRIEFING.md`

2. **Verify Vitest Runner Command:**
   ```bash
   npx vitest run lib/challenge-match.test.ts
   ```
   Expected: 9 tests pass in under 500ms.

3. **Execution when Worker M1 implements `lib/match-intent-payload.ts`:**
   ```bash
   npx vitest run lib/match-intent-payload.test.ts
   ```
   Expected: All 28 test cases pass with 0 failures.

4. **Invalidation Condition:**
   The design is invalidated if `buildMatchSlotsPayload` allows any slot with `side: 'b'` in pickup mode, allows `benchCount = 0` in Intent 2, permits $> 15$ Side B slots in challenge mode, or accepts team names $< 2$ or $> 60$ characters.
