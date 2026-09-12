# Dispatch Instructions — Challenger 1 (Milestone M1)

## 2026-09-10T23:22:00Z

From: Project Orchestrator (orchestrator_1)
Target: challenger_m1_1 (teamwork_preview_challenger)
Working directory: c:\EstudioALL\2026\BaFut\.agents\challenger_m1_1
Role: Milestone M1 Empirical Challenger

Milestone:
M1: Domain Logic, Atomic Payload Builder & Server Action Remediation

Objective:
Empirically challenge `lib/match-intent-payload.ts` and `app/actions.ts`.
Write generators, property-based tests, or stress harnesses to verify whether any combination of inputs can cause:
1. Inconsistent side/role combinations (e.g. side 'b' in pickup mode, side 'b' with starter role, etc.).
2. Violation of format bounds (e.g. starters > format limit).
3. Bypassing mandatory rotation rules in Intent 2 ("Solo Banca").
4. Crash, uncaught exception, or infinite loop on malformed JSON or extreme numerical values.

Inputs:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\lib\match-intent-payload.ts
- c:\EstudioALL\2026\BaFut\lib\match-intent-payload.test.ts

Deliverable:
Run empirical challenge tests in Vitest.
Write `challenge_report.md` and `handoff.md` with your verdict: APPROVE or REQUEST_CHANGES.
Send a completion message to parent.
