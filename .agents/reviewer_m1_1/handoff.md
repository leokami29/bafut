# Handoff Report — Milestone M1 Code & Architecture Review

**Reviewer Agent:** reviewer_m1_1 (reviewer, critic)  
**Target Milestone:** M1 — Domain Logic, Atomic Payload Builder & Server Action Remediation  
**Date:** 2026-09-10  
**Parent Agent:** orchestrator_1 (`d4c119cc-b9a6-4d68-81b6-7a770dc4f2e3`)  
**Verdict:** **APPROVE**  

---

## 1. Observation

1. **Integrity Check**:
   - Inspected `lib/match-intent-payload.ts` (406 lines), `lib/match-intent-payload.test.ts` (785 lines), and `app/actions.ts:201-350`.
   - **Zero hardcoded test outcomes**: No branches check for test-specific constants (e.g. "Los Galácticos", specific IDs, or fixture values).
   - **Real domain logic**: `buildMatchSlotsPayload` computes capacities via `playersPerSideFromFormat(format)`, checks integer constraints via `Number.isInteger`, enforces sport-allowed positions via `positionAllowedForSport`, sanitizes string bounds (2–60 for teams, 2–120 for rotation rules) matching PostgreSQL schema constraints, and dynamically allocates slots.
   - **No facade or bypass**: The server action `createMatchAction` directly imports and invokes `buildMatchSlotsPayload`, passing the resulting slots into `supabase.from("match_slots").insert(slots)`.
   - **Attestation verification**: All worker test output claims were reproduced independently with zero discrepancies.

2. **Remediation of `createMatchAction` (`app/actions.ts`)**:
   - Legacy blocker removed: The previous check `if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12)` in `app/actions.ts:271` has been completely replaced.
   - Intent resolution (`app/actions.ts:201-218`): Correctly prioritizes `formData.get("intent")` while maintaining robust fallback inference for legacy clients (`bench_only` is inferred when `benchRaw > 0` and `openCountRaw` is empty or `"0"`).
   - Selective JSON parsing (`app/actions.ts:220-227`): `parsePitchSlotsJson` is only evaluated when `intent === "starter_slots"` and `pitchRaw !== "[]"`, eliminating false syntax errors when creating bench-only or challenge matches.
   - Atomic rollback (`app/actions.ts:341-349`):
     ```typescript
     const { error: slotError } = await supabase.from("match_slots").insert(slots);
     if (slotError) {
       console.error("[createMatchAction] Error inserting match_slots:", slotError);
       await supabase.from("matches").delete().eq("id", match.id);
       if (slotError.message && /lado b/i.test(slotError.message)) {
         return { error: humanizeSideBError(slotError.message) };
       }
       return { error: "El partido se armó mal. Inténtalo de nuevo." };
     }
     ```
     Rollback cleanly deletes the orphaned match row via authenticated RLS (`matches_delete` policy allows host deletion of their own match).

3. **Database Constraint & Trigger Conformance**:
   - Inspected `supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql`:
     ```sql
     if v_mode = 'challenge' then ...
       select count(*) into v_side_b_count from public.match_slots s where s.match_id = new.match_id and s.side = 'b';
       if v_side_b_count >= 16 then raise exception 'El lado B ya tiene el maximo de cupos'; end if;
     ```
   - In `lib/match-intent-payload.ts:351-353`, `buildMatchSlotsPayload` verifies:
     ```typescript
     const totalSideB = perSide + benchCount;
     if (totalSideB >= 16) {
       return { ok: false, error: "El total de cupos para el rival no puede exceder 15 cupos." };
     }
     ```
     Maximum possible Side B slots generated is 15 (11v11 + 4 bench = 15 < 16), ensuring zero trigger exceptions under normal operations.
   - In `matches`, check constraints `matches_host_team_name_len` (`check (host_team_name is null or char_length(btrim(host_team_name)) between 2 and 60)`) and `matches_rotation_rule_len` (`check (rotation_rule is null or char_length(btrim(rotation_rule)) between 2 and 120)`) are strictly matched by `sanitizeTeamName` and `sanitizeRotationRule`.

4. **Independent Test Execution Results**:
   - `npx vitest run lib/match-intent-payload.test.ts`:
     - Result: 1 file passed, 48 passed out of 48 (403ms).
   - `npx vitest run lib/`:
     - Result: 33 files passed, 416 passed, 1 skipped (2.60s). Zero regressions across all domain libraries.
   - `npx vitest run lib/e2e-match-intent.test.ts`:
     - Result: 1 file passed, 82 passed out of 82 (515ms).
   - `npm run lint`:
     - Result: Exit code 0, clean.
   - `npx tsc --noEmit`:
     - Production files (`lib/match-intent-payload.ts`, `app/actions.ts`, etc.) have 0 errors.
     - Single non-blocking error in `lib/e2e-match-intent.test.ts:291` (M0 mock test helper missing `custom_cost_per_person`, which does not affect M1 deliverables).

---

## 2. Logic Chain

1. **Problem Statement**: Previous match creation logic rejected `open_count = 0`, prevented Intent 2 ("Solo Banca"), lacked atomic validation for sports formats, and risked trigger exceptions when inserting Side B slots.
2. **Evaluation of Solution**:
   - `lib/match-intent-payload.ts` encapsulates all 3 mutually exclusive intents into a pure domain function.
   - Intent 1 ("Completar Titulares") guarantees starters $\le \text{format limit}$, bench 0–4, side 'a' only, and optional goalkeeper assignment.
   - Intent 2 ("Solo Banca") strictly guarantees 0 starters, 1–4 bench slots on side 'a', rotation rule enforcement with default fallback, and forbids pitch selection.
   - Intent 3 ("Reto") sets `match_mode = 'challenge'`, generates rival starters and bench on side 'b', ensures $\text{totalSideB} < 16$ to comply with `guard_slot_side_insert`, and isolates side 'a'.
   - `createMatchAction` in `app/actions.ts` orchestrates the validated payload, performs transactional insert with automatic rollback on failure, and maps database trigger errors to user-friendly messages.
3. **Deduction**: Because the pure validator prevents invalid combinations at the boundary, matches the database constraints 1:1, handles failure atomicity, and passes 100% of all unit and regression tests, Milestone M1 is verified and production-ready.

---

## 3. Caveats

- **Test Mock Typing in M0 Track**: Running `npx tsc --noEmit` flags a missing property `custom_cost_per_person` in `lib/e2e-match-intent.test.ts:291`. This is inside an E2E test mock owned by Milestone M0 / test_writer_m0 and does not impact M1 source code or runtime test execution. It should be addressed during M0/M4 test maintenance.
- **Frontend Form Wiring**: Milestone M1 covers domain validation and server actions. The UI components (`MatchIntentSelector.tsx`, `LiveMatchBoard.tsx`, and `CreateMatchForm.tsx` refactor) are scheduled for Milestones M2 and M3.

---

## 4. Conclusion

**Verdict: APPROVE**  
Milestone M1 satisfies all requirements set forth in `ORIGINAL_REQUEST.md` (R1, R3) and `PROJECT.md` (F5, F6). No integrity violations exist. The domain logic is clean, robust, and mathematically sound.

---

## 5. Verification Method

To independently reproduce this verification:

```bash
# 1. Run M1 unit tests (48 tests)
npx vitest run lib/match-intent-payload.test.ts

# 2. Run all lib tests to verify 0 regressions (33 test files, 416 tests)
npx vitest run lib/

# 3. Run E2E intent test suite (82 tests)
npx vitest run lib/e2e-match-intent.test.ts

# 4. Verify linter
npm run lint
```

---

## Quality Review Report

**Verdict:** APPROVE

### Verified Claims
- `buildMatchSlotsPayload` enforces all 3 creation intents correctly → verified via `lib/match-intent-payload.test.ts` → PASS (48/48)
- `createMatchAction` supports Intent 2 with `open_count = 0` → verified via inspection of `app/actions.ts:201-274` and test `T1.F6.01` in `lib/e2e-match-intent.test.ts` → PASS
- Rollback cleanly removes orphaned match on slot insertion failure → verified via inspection of `app/actions.ts:344` and test `Escenario 10` in `lib/e2e-match-intent.test.ts` → PASS
- Conformance to PostgreSQL trigger `guard_slot_side_insert` (< 16 slots on Side B) → verified via migration analysis and boundary test `11v11` + 4 bench = 15 slots → PASS
- Backward compatibility for legacy form submissions → verified via intent fallback heuristic in `app/actions.ts:206-218` and full lib regression run (416 tests) → PASS

### Coverage Gaps
- None within Milestone M1 domain scope. UI component rendering is scoped for M2/M3.

---

## Adversarial Challenge Report

**Overall Risk Assessment:** LOW

### Challenge 1: Host Team Name Handling in Challenge Mode
- **Assumption Challenged:** Does Intent 3 enforce a valid host team name without causing false rejections when hosts omit a custom name?
- **Attack Scenario:** A creator launches a challenge match without typing a host team name (`formData.get("host_team_name")` is null or `""`).
- **Blast Radius:** If team name were strictly required $\ge 2$ characters without null handling, challenge creation would fail for casual hosts.
- **Mitigation & Verification:** Inspected `sanitizeTeamName` and database constraint `matches_host_team_name_len`. Both explicitly permit `null` when omitted, but enforce `2 <= length <= 60` if provided. Verified in unit tests (line 564) and E2E tests (`T1.F3.04`).

### Challenge 2: Side B Slot Overflow & Trigger Boundary
- **Assumption Challenged:** Could a high-capacity sport format (e.g. fútbol 11v11) with bench substitutes trigger PostgreSQL's `v_side_b_count >= 16` exception?
- **Attack Scenario:** Input `format: '11v11'` with `benchCount: 5`.
- **Blast Radius:** Unhandled PostgreSQL trigger exception, failing the server action.
- **Mitigation & Verification:** `buildMatchSlotsPayload` has two defensive layers: `benchCount` is capped at 4 (`rawBench > 4` returns error), and `totalSideB >= 16` explicitly returns error. The maximum possible Side B slots is 15 ($11 + 4 = 15 < 16$). Handled gracefully at the domain level before hitting the database.

### Challenge 3: Non-Integer and Fractional Number Injection
- **Assumption Challenged:** Could malicious or malformed FormData inputs (e.g. `bench_count: 2.5`, `NaN`, `Infinity`, negative numbers) produce fractional slot rows?
- **Attack Scenario:** Fuzzing `starterCount`, `benchCount`, and `pitchIndex` with floats or non-integer numbers.
- **Blast Radius:** Inconsistent slot counts or database type coercion errors.
- **Mitigation & Verification:** `Number.isInteger` is strictly evaluated on all numerical counts in `buildMatchSlotsPayload` lines 176, 212, and 238. Floats and `NaN` are immediately rejected with descriptive error messages.

### Stress Test Matrix Summary
- Scenario: `starter_slots` with 0 starters → Expected: rejected → Result: PASS
- Scenario: `bench_only` with pitch slots provided → Expected: rejected → Result: PASS
- Scenario: `bench_only` with 0 bench slots → Expected: rejected → Result: PASS
- Scenario: `bench_only` with 5 bench slots → Expected: rejected → Result: PASS
- Scenario: `challenge` with Side B slots $\ge 16$ → Expected: rejected → Result: PASS
- Scenario: Duplicate `pitchIndex` in `pitchSlots` → Expected: rejected → Result: PASS
- Scenario: Keeper requested in sport without keeper (basquet/voleibol) → Expected: gracefully defaults to normal position → Result: PASS
