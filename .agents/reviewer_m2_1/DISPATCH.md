# Dispatch Instructions — Reviewer 1 (Milestone M2)

## 2026-09-10T23:45:00Z

From: Project Orchestrator (orchestrator_1)
Target: reviewer_m2_1 (teamwork_preview_reviewer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\reviewer_m2_1
Role: Milestone M2 Code & Geometry Reviewer

Milestone:
M2: Live Tactical Dual Board Component (`components/LiveMatchBoard.tsx`)

Inputs to Review:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\.agents\worker_m2\handoff.md
- c:\EstudioALL\2026\BaFut\components\LiveMatchBoard.tsx
- c:\EstudioALL\2026\BaFut\components\LiveMatchBoard.test.tsx

Review Scope:
- Objective review of `components/LiveMatchBoard.tsx` and `components/LiveMatchBoard.test.tsx`.
- Verify multi-sport court lines render correctly for all 5 sports (fútbol, fútbol sala, básquet, vóley, pádel).
- Verify Side A (Host) and Side B (Rival) dual tactical representation.
- Verify 3 intents:
  - Intent 1: Starters hole selection, confirmed vs open, optional bench row.
  - Intent 2: Starters complete (locked), hero bench row with rotation pact symbol (`⇄`).
  - Intent 3: Confrontation view with exact format math (`playersPerSideFromFormat`).
- Run tests:
  `npx vitest run components/LiveMatchBoard.test.tsx`
  `npx vitest run`
- Issue a clear verdict: APPROVE or REQUEST_CHANGES in your handoff.md.
- Send a completion message to parent.
