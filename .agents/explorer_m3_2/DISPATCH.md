# Dispatch Instructions — Explorer M3.2

## 2026-09-10T23:51:00Z

From: Project Orchestrator (orchestrator_1)
Target: explorer_m3_2 (teamwork_preview_explorer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\explorer_m3_2
Role: CreateMatchForm Integration Explorer

Milestone:
M3: Intent-Driven UI Architecture & WCAG 2.2 AA (`components/MatchIntentSelector.tsx`, `components/CreateMatchForm.tsx`)

Objective:
Investigate and design the refactoring of `components/CreateMatchForm.tsx`:
- Seamlessly integrate `MatchIntentSelector` and `LiveMatchBoard`.
- Eliminate the previous cognitive disconnect where formation was chosen in Step 1 and erased in Step 2.
- Connect pitch spot toggles in `LiveMatchBoard` with form state.
- Ensure form submission packages:
  - `intent`: 'starter_slots' | 'bench_only' | 'challenge'
  - `pitch_slots_json`: JSON of selected pitch spots
  - `bench_count`: number
  - `rotation_rule`: string
  - `host_team_name`: string
  - `challenge_mode_type`: 'full_team' | 'open_slots'
  - `match_mode`: 'pickup' | 'challenge'
- Ensure full compatibility with `createMatchAction` in `app/actions.ts` and Next.js guidelines in `AGENTS.md`.

Read:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\components\CreateMatchForm.tsx
- c:\EstudioALL\2026\BaFut\components\LiveMatchBoard.tsx
- c:\EstudioALL\2026\BaFut\app\actions.ts

Deliverable:
Formulate an exact integration blueprint in `strategy.md` and write `handoff.md`.
Send a completion message to parent when done.
