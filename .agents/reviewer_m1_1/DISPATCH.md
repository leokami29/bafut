# Dispatch Instructions — Reviewer 1 (Milestone M1)

## 2026-09-10T23:22:00Z

From: Project Orchestrator (orchestrator_1)
Target: reviewer_m1_1 (teamwork_preview_reviewer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\reviewer_m1_1
Role: Milestone M1 Code & Architecture Reviewer

Milestone:
M1: Domain Logic, Atomic Payload Builder & Server Action Remediation

Inputs to Review:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\.agents\worker_m1\handoff.md
- c:\EstudioALL\2026\BaFut\lib\match-intent-payload.ts
- c:\EstudioALL\2026\BaFut\lib\match-intent-payload.test.ts
- c:\EstudioALL\2026\BaFut\app\actions.ts
- c:\EstudioALL\2026\BaFut\TEST_READY.md

Review Scope:
- Objective review of code correctness, completeness, robustness, and interface conformance.
- Verify that `buildMatchSlotsPayload` enforces all 3 creation intents correctly:
  - Intent 1 ("Completar Titulares"): validates starters <= format limit, bench 0-4.
  - Intent 2 ("Solo Banca"): requires 0 starters, bench 1-4, active rotation rule.
  - Intent 3 ("Reto"): validates match_mode='challenge', host_team_name 2-60 chars, rival slots on side 'b' matching playersPerSideFromFormat.
- Verify `createMatchAction` in `app/actions.ts`:
  - Eliminates the open_count >= 1 blocker for Intent 2.
  - Generates strictly side 'a' slots for pickup matches and side 'b' for challenge matches.
  - Conforms to database trigger `guard_slot_side_insert`.
  - Ensures atomic rollback on slot error.
- Run tests:
  `npx vitest run lib/match-intent-payload.test.ts`
  `npx vitest run lib/e2e-match-intent.test.ts`
  `npx vitest run lib/`
- Issue a clear verdict: APPROVE or REQUEST_CHANGES in your handoff.md.
- Send a completion message to parent.
