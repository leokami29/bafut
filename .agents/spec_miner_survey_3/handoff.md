# Handoff Report: Specification Mining, WCAG 2.2 AA & Acceptance Criteria

**Date:** 2026-09-10T23:12:00Z  
**Agent:** spec_miner_survey_3 (teamwork_preview_spec_miner)  
**Deliverables:**
- Specification Report: `c:\EstudioALL\2026\BaFut\.agents\spec_miner_survey_3\spec_report.md`
- Local Accessibility Skill: `c:\EstudioALL\2026\BaFut\.agents\spec_miner_survey_3\accessibility_SKILL.md`

---

## 1. Observation

1. **Original User Request (`ORIGINAL_REQUEST.md`)**:
   - Lines 12–17 specify R1 (Intent-Driven UI) with 3 mutually exclusive intents:
     - "Completar mi Equipo Titular" (formation pitch holes, suggested role, optional bench toggle).
     - "Solo Banca / Suplentes" (titulares completos por fuera, 1 a 4 suplentes, pacto de rotación activo obligatorio).
     - "Reto a Equipo Rival" (`[Mi Equipo (A)] vs [Equipo Rival (B)]`, equipo completo vs cupos para libres).
   - Lines 18–23 specify R2 (Live Match Board): dual tactical representation (Lado A vs Lado B), contextual format information (e.g. 6v6 in volleyball = 6 per side).
   - Lines 24–28 specify R3 (Payload & DB Integrity): strictly typed `slotsPayload` (`side: 'a' | 'b'`, `slot_role: 'starter' | 'bench'`, `pitch_index`, `level`), atomic bounds via `playersPerSideFromFormat`, RLS & trigger compliance (`guard_slot_side_insert`).
   - Lines 29–33 specify R4 (Accessibility WCAG 2.2 AA): native keyboard (`ArrowKeys`, `Space`, `Enter`), `role="radiogroup"` / `role="radio"`, contrast ≥ 4.5:1, vector SVG icons (no emoji-only indicators), `aria-live="polite"` dynamic announcements.

2. **Existing Implementation Limitations in Codebase**:
   - `app/actions.ts:271–274`:
     ```typescript
     const openCountRaw = Number(formData.get("open_count") ?? "");
     if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12) {
       return { error: "Los cupos deben ser un número entero entre 1 y 12." };
     }
     ```
     This strictly blocks Intent 2 ("Solo Banca"), where 0 starters are required and only bench slots (1–4) are provided.
   - `components/CreateMatchForm.tsx:693–712`:
     The current UI provides only 2 options ("Completar mi equipo" vs "Buscar equipo rival") using generic buttons in a `filter-chips` container lacking proper radiogroup semantics, arrow key roving tabindex, and ARIA live regions. Emojis (`👤`, `⚔️`) are used as inline prefixes without accessible names.
   - `components/CreateMatchForm.tsx:795–831`:
     The bench selector is an unlinked secondary control rather than an integrated intent flow, permitting `benchCount === 0` even when the user intended "Solo Banca".

3. **Database Migration and Trigger Inspection**:
   - `supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql:17–40`:
     Trigger `guard_slot_side_insert` verifies that `side = 'b'` slots are only insertable by the host when `v_mode = 'challenge'` (up to a limit of 16 slots). If `v_mode` is `'pickup'`, inserting side B slots aborts with `'No se puede abrir el lado B asi'`.
   - `supabase/migrations/20260910000000_bench_and_match_challenges.sql:15–47`:
     Database check constraints enforce:
     - `matches_match_mode_check`: `CHECK (match_mode IN ('pickup', 'challenge'))`.
     - `matches_challenge_target_level_check`: `CHECK (challenge_target_level IN ('any', 'low', 'mid', 'high'))`.
     - `matches_host_team_name_len`: `CHECK (host_team_name IS NULL OR char_length(btrim(host_team_name)) BETWEEN 2 AND 60)`.
     - `matches_rotation_rule_len`: `CHECK (rotation_rule IS NULL OR char_length(btrim(rotation_rule)) BETWEEN 2 AND 120)`.
     - `match_slots_slot_role_check`: `CHECK (slot_role IN ('starter', 'bench'))`.

4. **Sports Catalog and Format Calculation**:
   - `lib/formations-catalog.ts:24–28`:
     `playersPerSideFromFormat(format)` regex matches `^(\d+)v(\d+)$` returning `Number(match[1])`.
   - Complete format matrix verified across 5 sports:
     - `futbol`: 5v5 (5), 6v6 (6), 7v7 (7), 8v8 (8), 11v11 (11).
     - `futbol_sala`: 5v5 (5).
     - `basquet`: 3v3 (3), 5v5 (5).
     - `voleibol`: 2v2 (2), 6v6 (6).
     - `padel`: 2v2 (2), 4v4 (4).

5. **Accessibility Standards & Contrast**:
   - WCAG 2.2 AA audit via `accessibility` skill:
     - Contrast `--turf` (`#0c6b4c`) with `--chalk` (`#d9f2a5`): 5.39:1 (PASS AA).
     - Contrast `--ink` (`#10231c`) with `--paper` (`#dff3e6`): 14.24:1 (PASS AAA).
     - Keyboard requirements: Roving tabindex on radiogroup, arrow key navigation, focus visible ring (≥ 3:1 contrast), and focus not obscured (`scroll-margin` clearing fixed bars).

6. **Test Suite Verification**:
   - Ran `npx vitest run lib/challenge-match.test.ts`: 1 test file passed, 9 tests passed.

---

## 2. Logic Chain

1. **R1 Intent UI Logic:**
   - From Observation 1 and 2, current form controls for match mode, open slots, and bench count are fragmented and disjointed.
   - Restructuring Step 2 into three explicit cards (`role="radiogroup"`) eliminates cognitive ambiguity:
     - Intent 1 manages starters + optional bench.
     - Intent 2 strictly suppresses pitch starter selection and focuses on 1–4 bench slots + rotation pact.
     - Intent 3 automatically calculates side B capacity from `playersPerSideFromFormat(format)` and exposes confrontation controls.

2. **R2 Dual Match Board Logic:**
   - From Observation 1, 4, and `MatchPitchBoard.tsx`, the board must visually represent both halves simultaneously.
   - For Intent 1: Side A displays confirmed vs open starter spots; bench displays below.
   - For Intent 2: Side A pitch spots are all marked complete (ghost/filled); bench section highlights active rotation spots with `⇄` icons and pact label.
   - For Intent 3: Side A shows host team ready; Side B renders the full squad capacity (e.g. 6 spots for volleyball 6v6) in open or challenge mode.

3. **R3 Payload and Database Security Logic:**
   - From Observation 2 and 3, `createMatchAction` currently errors if `open_count < 1`. To support Intent 2 cleanly, the server must support `open_count = 0` when `bench_count >= 1` in pickup mode.
   - For Intent 3, the match must be created with `match_mode = 'challenge'`. This is required to satisfy trigger `guard_slot_side_insert`, which otherwise aborts with an unhandled PostgreSQL exception if side B slots are inserted in pickup mode.
   - Atomic rollback is confirmed: any failure during slot insertion deletes the newly created match row.

4. **R4 Accessibility & WCAG 2.2 AA Logic:**
   - From Observation 1, 2, and 5, emojis cannot be used as standalone indicators. All intent buttons must feature vector SVG icons with `aria-hidden="true"` and visible textual descriptions.
   - Using roving tabindex (`tabIndex={0}` on selected, `tabIndex={-1}` on unselected) with `ArrowKeys` satisfies WCAG 2.1.1.
   - Live updates must be piped to `aria-live="polite"` with debounced announcements so assistive tech users receive timely status updates without focus disorientation.

---

## 3. Caveats

1. **Server Action Edit:** Specification mining is read-only. Modifying `app/actions.ts` to allow `open_count = 0` for Intent 2 must be executed by the implementation engineer.
2. **Postgres RLS with Anon:** All tests assume authenticated user context (`requireUserId`). Anonymous match creation is prohibited by design.
3. **Padel and Basketball 3v3:** These sports do not utilize goalkeepers (`hasKeeper = false`). The pitch board correctly omits goalkeeper positioning for these sports.

---

## 4. Conclusion

The authoritative specification report `spec_report.md` provides an exhaustive, unambiguous blueprint for the implementation of R1, R2, R3, and R4. It details:
- Complete feature inventory and edge cases.
- Form field behaviors, state transition rules, and payload mappings for all 3 intents.
- Visual state semantics and layout for the dual match board.
- Exact database constraints and trigger compliance requirements.
- Full WCAG 2.2 AA accessibility specifications (roving tabindex, arrow navigation, contrast ratios, vector SVGs, live region announcements).
- Sports format math table covering all 5 sports and 8 formats.
- Acceptance criteria organized into 4 testing tiers (T1.01 through T4.08) ready for the testing track.

---

## 5. Verification Method

To independently verify these findings and specifications:
1. **Inspect Specification Report:**
   Read `c:\EstudioALL\2026\BaFut\.agents\spec_miner_survey_3\spec_report.md`.
2. **Inspect Existing Tests:**
   Run Vitest to verify baseline domain health:
   ```powershell
   npx vitest run lib/challenge-match.test.ts
   ```
3. **Verify Database Trigger:**
   Inspect `c:\EstudioALL\2026\BaFut\supabase\migrations\20260910180000_fix_challenge_side_b_insert_guard.sql` lines 17–55 to confirm the 16-slot challenge condition on Side B.
4. **Verify Server Action Constraint:**
   Inspect `c:\EstudioALL\2026\BaFut\app\actions.ts` lines 270–275 to verify the `open_count >= 1` check that requires remediation for Intent 2.
