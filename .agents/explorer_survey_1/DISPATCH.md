# Dispatch Instructions

## 2026-09-10T23:08:00Z

From: Project Orchestrator (orchestrator_1)
Target: explorer_survey_1 (teamwork_preview_explorer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\explorer_survey_1
Role: Backend & DB Integrity Explorer

Objective:
Investigate the existing backend, database schema, server actions, sports format definitions, types, and test harness in BaFut.

Scope:
- Locate and analyze PostgreSQL migrations, schema definitions, tables (`matches`, `match_slots`, etc.), RLS policies, and database triggers (specifically `guard_slot_side_insert` and any slot side/role constraints).
- Locate and analyze `createMatchAction` or relevant server actions that receive and persist slots and matches.
- Examine how `playersPerSideFromFormat` and sports formats (vóley, fútbol, etc.) are currently defined and calculated.
- Examine slot types and payload expectations (`side: 'a' | 'b'`, `slot_role: 'starter' | 'bench'`, `pitch_index`, `level`, `host_team_name`, `match_mode`).
- Locate existing Vitest test files and test setup to understand how backend and atomic validations are tested.
- Note any Next.js breaking changes or specific conventions in the repo (referencing AGENTS.md if applicable).

Read:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md

Deliverable:
Write a comprehensive investigation report to c:\EstudioALL\2026\BaFut\.agents\explorer_survey_1\survey_report.md and a handoff.md in your working directory.
Include exact file paths, schema excerpts, server action signatures, and test command references.
Send a message to parent when done.
