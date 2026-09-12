# BRIEFING — 2026-09-10T23:12:00Z

## Mission
Investigate the existing backend, PostgreSQL schema, migrations, RLS policies, triggers (especially guard_slot_side_insert), server actions (createMatchAction), sports format helpers (playersPerSideFromFormat), slot payload types, and Vitest test setup in BaFut.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: Backend & DB Integrity Explorer, System Survey
- Working directory: c:\EstudioALL\2026\BaFut\.agents\explorer_survey_1
- Original parent: d4c119cc-b9a6-4d68-81b6-7a770dc4f2e3
- Milestone: Survey and analysis of slot creation, DB triggers, server actions, and formats

## 🔒 Key Constraints
- Read-only investigation — do NOT modify source code or tests
- Write only to .agents/explorer_survey_1/
- Follow Next.js conventions in AGENTS.md
- Produce comprehensive survey_report.md and handoff.md
- Report back via send_message to parent (d4c119cc-b9a6-4d68-81b6-7a770dc4f2e3)

## Current Parent
- Conversation ID: d4c119cc-b9a6-4d68-81b6-7a770dc4f2e3
- Updated: 2026-09-10T23:08:00Z

## Investigation State
- **Explored paths**: `supabase/migrations/` (especially `20260902120000_init_core_schema.sql`, `20260903220000_venue_occupancy_sides.sql`, `20260903240000_match_formation_id.sql`, `20260910000000_bench_and_match_challenges.sql`, `20260910180000_fix_challenge_side_b_insert_guard.sql`), `app/actions.ts`, `lib/match-write.ts`, `lib/sport-rules.ts`, `lib/formations-catalog.ts`, `lib/match-formation.ts`, `lib/types.ts`, `lib/database.types.ts`, `components/CreateMatchForm.tsx`, `components/FormationPicker.tsx`, `components/MatchPitchBoard.tsx`, `vitest.config.ts`, `lib/challenge-match.test.ts`.
- **Key findings**:
  1. DB schema already supports all columns (`match_mode`, `host_team_name`, `rotation_rule`, `side`, `slot_role`, `pitch_index`, `custom_cost_per_person`).
  2. `guard_slot_side_insert` allows Side B inserts by host ONLY when `match_mode = 'challenge'`.
  3. `createMatchAction` currently enforces starters >= 1, blocking Intention 2 (Solo Banca). Needs update to allow 0 starters when bench >= 1 with rotation rule.
  4. Starter counts on Side A are not bounded by `playersPerSideFromFormat(format)`. Needs upper-bound validation.
  5. 31 Vitest suites in `lib/` pass cleanly (286 tests). Recommended creating dedicated `buildMatchSlotsPayload` with comprehensive unit tests.
- **Unexplored areas**: None. Scope fully completed.

## Key Decisions Made
- Formulated survey report `survey_report.md` detailing DB schema, RLS, triggers, server actions, formats, and test strategy.
- Created `handoff.md` with complete 5-section report.

## Artifact Index
- DISPATCH.md — Initial dispatch instructions
- BRIEFING.md — Working memory index
- progress.md — Liveness heartbeat
- survey_report.md — Full technical survey report
- handoff.md — 5-component handoff report
