# Handoff Report: Domain Logic & Payload Architecture (`lib/match-intent-payload.ts`)

**Agent ID:** explorer_m1_1  
**Working Directory:** `c:\EstudioALL\2026\BaFut\.agents\explorer_m1_1`  
**Milestone:** M1: Domain Logic, Atomic Payload Builder & Server Action Remediation  
**Date:** 2026-09-10  
**Handoff Type:** Hard (Task complete)  

---

## 1. Observation

1. **Trigger `private.guard_slot_side_insert` in PostgreSQL**:
   - Location: `supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql:103-158`
   - Content:
     ```sql
     if new.side = 'b' then
       ...
       if v_mode = 'challenge' then
         ...
         if v_side_b_count >= 16 then
           raise exception 'El lado B ya tiene el maximo de cupos';
         end if;
       else
         if v_uid is not null and (v_away is distinct from v_uid or v_away is null) then
           raise exception 'No se puede abrir el lado B asi';
         end if;
         ...
       end if;
     end if;
     ```
   - Verbatim trigger error on invalid pickup Side B insert: `'No se puede abrir el lado B asi'`.
   - Verbatim trigger error when Side B count reaches 16: `'El lado B ya tiene el maximo de cupos'`.

2. **Trigger `private.guard_slot_match_id` in PostgreSQL**:
   - Location: `supabase/migrations/20260903220000_venue_occupancy_sides.sql:27`
   - Content:
     ```sql
     if new.side is distinct from old.side then
       raise exception 'No se puede cambiar el lado del cupo';
     end if;
     ```

3. **Check Constraints on `public.matches` and `public.match_slots`**:
   - Location: `supabase/migrations/20260910000000_bench_and_match_challenges.sql:22-38`
   - Check constraints:
     - `matches.match_mode in ('pickup', 'challenge')`
     - `matches.challenge_target_level in ('any', 'low', 'mid', 'high')`
     - `matches.host_team_name is null or char_length(btrim(host_team_name)) between 2 and 60`
     - `matches.rotation_rule is null or char_length(btrim(rotation_rule)) between 2 and 120`
     - `match_slots.slot_role in ('starter', 'bench')`
     - `match_slots.pitch_index is null or (pitch_index >= 0 and pitch_index < 16)`

4. **Server Action Bottleneck in `createMatchAction`**:
   - Location: `app/actions.ts:271-274`
   - Code:
     ```typescript
     const openCountRaw = Number(formData.get("open_count") ?? "");
     if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12) {
       return { error: "Los cupos deben ser un número entero entre 1 y 12." };
     }
     ```
   - Verbatim error returned when `open_count = 0` (Intent 2 / Solo Banca): `"Los cupos deben ser un número entero entre 1 y 12."`.

5. **Format Capacity Engine in `lib/formations-catalog.ts`**:
   - Location: `lib/formations-catalog.ts:24-28`
   - Code:
     ```typescript
     export function playersPerSideFromFormat(format: string | null | undefined): number {
       const match = /^(\d+)v(\d+)$/i.exec(format?.trim() ?? "");
       if (!match) return 5;
       return Math.max(1, Number(match[1]));
     }
     ```

6. **Current Vitest Test Suite**:
   - Execution command: `npx vitest run lib/challenge-match.test.ts`
   - Result: 1 test file passed, 9 tests passed in 377ms.

---

## 2. Logic Chain

1. **Step 1 (Trigger Compliance for Intent 1 & 2)**:
   - Observation 1 proves that inserting any slot with `side = 'b'` when `match_mode = 'pickup'` triggers the PostgreSQL exception `'No se puede abrir el lado B asi'`.
   - Intents 1 ("starter_slots") and 2 ("bench_only") operate in pickup mode.
   - Therefore, the validator `buildMatchSlotsPayload` must guarantee that all slots generated under Intent 1 and Intent 2 strictly have `side = 'a'` and `matchMode = 'pickup'`. No user input can be permitted to inject `side = 'b'` into these intents.

2. **Step 2 (Trigger & Constraint Compliance for Intent 3)**:
   - Observation 1 shows that Side B slots are permitted for the host only when `match_mode = 'challenge'` and `v_side_b_count < 16`.
   - Observation 3 shows `matches.host_team_name` must satisfy `char_length(btrim(host_team_name)) between 2 and 60`.
   - Observation 5 shows `playersPerSideFromFormat(format)` determines the starting lineup size for the rival (e.g. 6 for 6v6, 11 for 11v11).
   - Therefore, for Intent 3, `buildMatchSlotsPayload` must set `matchMode = 'challenge'`, enforce `hostTeamName` length between 2 and 60 chars, generate exactly `playersPerSideFromFormat(format)` starters on `side = 'b'`, allow 0–4 rival bench slots on `side = 'b'`, and verify `playersPerSide + benchCount < 16` to strictly avoid the PostgreSQL 16-slot ceiling.

3. **Step 3 (Remediation of Solo Banca Bug)**:
   - Observation 4 shows that `createMatchAction` rejects `openCountRaw < 1`, blocking Intent 2 where the host has 0 open starters and only bench slots.
   - Observation 3 permits `match_slots` with `slot_role = 'bench'` and `pitch_index = null`.
   - Therefore, `buildMatchSlotsPayload` must support `totalStartersA = 0` when `intent === 'bench_only'`, validating `benchCount` between 1 and 4 and enforcing a valid `rotation_rule` (2–120 chars, defaulting to `"Rotación activa continua"`).

4. **Step 4 (Format Overflow Prevention)**:
   - Observation 5 shows sports format player capacities (e.g., 2 players per side in pádel 2v2).
   - Observation 4 shows legacy code allowed up to 12 starters regardless of sport format.
   - Therefore, `buildMatchSlotsPayload` must enforce `startersCount <= playersPerSideFromFormat(format)` for Intent 1, rejecting format overflows (e.g. 3 or 4 starters in 2v2 pádel).

---

## 3. Caveats

1. **Client-Side Form Wiring (Milestone M3)**:
   - This specification defines the pure domain payload validator and its integration with the server action `createMatchAction`. The visual input components (`MatchIntentSelector.tsx`, `LiveMatchBoard.tsx`) are assigned to Milestones M2 and M3.
2. **Existing Legacy Fallback**:
   - `buildMatchSlotsPayload` is designed to be called with explicit `intent`, but the strategy specifies an inference fallback in `createMatchAction` to guarantee that legacy forms or API calls without explicit `intent` do not break.
3. **Database Migration Not Required**:
   - All necessary database columns (`match_mode`, `host_team_name`, `rotation_rule`, `side`, `slot_role`, `pitch_index`) and triggers (`guard_slot_side_insert`) already exist in PostgreSQL. No new database migrations are required for M1.

---

## 4. Conclusion

The implementation strategy for `lib/match-intent-payload.ts` is fully formulated and documented in `.agents/explorer_m1_1/strategy.md`. 

Key deliverables ready for Worker M1:
1. Complete TypeScript interface definitions (`MatchCreationIntent`, `IntentPayloadInput`, `ValidatedMatchPayload`, `ValidatedSlot`, `MatchPayloadResult`).
2. Exact invariant rules for the 3 intents (Intent 1: starters $\le$ format capacity, bench 0–4; Intent 2: starters = 0, bench 1–4, mandatory rotation pact; Intent 3: `match_mode = 'challenge'`, validated team name, Side B starters = format capacity).
3. Comprehensive prevention of illegal combinations (`side = 'b'` in pickup, bench > 4, negative numbers, duplicate pitch indexes, format overflows).
4. Concrete algorithmic reference implementation ready for Worker M1 to implement.
5. Integration blueprint for `app/actions.ts` (`createMatchAction`) fixing the `open_count = 0` bottleneck and adding atomic rollback.
6. Detailed 4-suite unit test matrix for `lib/match-intent-payload.test.ts`.

---

## 5. Verification Method

1. **Verify Strategy Artifact**:
   - Read `.agents/explorer_m1_1/strategy.md` to review the specification and implementation blueprint.
2. **Verify Database Constraint Alignment**:
   - Inspect `supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql` lines 116-154.
   - Inspect `supabase/migrations/20260910000000_bench_and_match_challenges.sql` lines 22-38.
3. **Verify Existing Tests**:
   - Run: `npx vitest run lib/challenge-match.test.ts`
   - Result should be 100% green (9 passing tests).
4. **Post-Implementation Verification (by Worker M1)**:
   - Worker M1 creates `lib/match-intent-payload.ts` and `lib/match-intent-payload.test.ts`.
   - Run: `npx vitest run lib/match-intent-payload.test.ts`.
   - Invalidation conditions: Any test failure where Intent 2 fails with 0 starters, Intent 3 fails to create exact format-based Side B slots, or invalid combinations are permitted.
