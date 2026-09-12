# Dispatch Instructions — Worker M1

## 2026-09-10T23:17:00Z

From: Project Orchestrator (orchestrator_1)
Target: worker_m1 (teamwork_preview_worker)
Working directory: c:\EstudioALL\2026\BaFut\.agents\worker_m1
Milestone: M1 — Domain Logic, Atomic Payload Builder & Server Action Remediation

Exclusive Write Ownership:
- lib/match-intent-payload.ts
- lib/match-intent-payload.test.ts
- app/actions.ts

Read Inputs:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\.agents\explorer_m1_1\strategy.md
- c:\EstudioALL\2026\BaFut\.agents\explorer_m1_2\strategy.md
- c:\EstudioALL\2026\BaFut\.agents\explorer_m1_3\strategy.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. Implement `lib/match-intent-payload.ts` based on the design in `explorer_m1_1/strategy.md`.
2. Implement the comprehensive 28+ test unit test suite in `lib/match-intent-payload.test.ts` based on `explorer_m1_3/strategy.md`.
3. Refactor `createMatchAction` in `app/actions.ts` based on `explorer_m1_2/strategy.md` to cleanly integrate `buildMatchSlotsPayload`, support `open_count = 0` for Intent 2 ("Solo Banca"), enforce trigger `guard_slot_side_insert` compliance, and ensure atomic rollback.
4. Run verification tests:
   `npx vitest run lib/match-intent-payload.test.ts`
   `npx vitest run lib/`
5. Write a complete 5-component `handoff.md` and report back when finished.
