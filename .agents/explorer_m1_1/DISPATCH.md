# Dispatch Instructions — M1 Explorer 1

## 2026-09-10T23:13:00Z

From: Project Orchestrator (orchestrator_1)
Target: explorer_m1_1 (teamwork_preview_explorer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\explorer_m1_1
Role: Domain Logic & Payload Architecture Explorer

Milestone:
M1: Domain Logic, Atomic Payload Builder & Server Action Remediation

Objective:
Investigate and design the pure domain validator `lib/match-intent-payload.ts`.

Read:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\.agents\explorer_survey_1\survey_report.md
- c:\EstudioALL\2026\BaFut\.agents\spec_miner_survey_3\spec_report.md

Deliverable:
Formulate an exact implementation strategy for `lib/match-intent-payload.ts`:
- Detailed typing: `MatchCreationIntent`, `IntentPayloadInput`, `ValidatedMatchPayload`.
- Invariant enforcement:
  - Intent 1: starters <= `playersPerSideFromFormat(format)`, bench 0-4.
  - Intent 2: starters === 0, bench 1-4, `rotation_rule` mandatory.
  - Intent 3: `match_mode = 'challenge'`, `host_team_name` 2-60 chars, rival slots on side B equal to `playersPerSideFromFormat(format)`.
- Prevention of illegal combinations (e.g. side B in pickup mode, bench > 4, negative slots).
- Write `strategy.md` and `handoff.md` in your directory.
- Report back when done.
