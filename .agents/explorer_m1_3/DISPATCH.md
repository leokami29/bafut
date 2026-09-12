# Dispatch Instructions — M1 Explorer 3

## 2026-09-10T23:13:00Z

From: Project Orchestrator (orchestrator_1)
Target: explorer_m1_3 (teamwork_preview_explorer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\explorer_m1_3
Role: Unit Test Strategy & Vitest Harness Explorer

Milestone:
M1: Domain Logic, Atomic Payload Builder & Server Action Remediation

Objective:
Design a comprehensive Vitest test suite `lib/match-intent-payload.test.ts` to rigorously verify `buildMatchSlotsPayload`.

Read:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\.agents\spec_miner_survey_3\spec_report.md
- c:\EstudioALL\2026\BaFut\lib\challenge-match.test.ts

Deliverable:
Formulate an exact testing matrix for `lib/match-intent-payload.test.ts`:
- Happy path for Intent 1, Intent 2, Intent 3 across multiple sports (fútbol 5v5, vóley 6v6, básquet 3v3, pádel 2v2).
- Boundary tests: format limits exceeded, bench limits (0, 1, 4, 5), host team name length (1, 2, 60, 61), rotation rule length.
- Security & Integrity tests: verify no Side B slots in pickup mode, no starter role on Side B, no bench role on Side B, no invalid slot role or side values.
- Write `strategy.md` and `handoff.md` in your directory.
- Report back when done.
