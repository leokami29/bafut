# Dispatch Instructions — Challenger 2 (Milestone M1)

## 2026-09-10T23:22:00Z

From: Project Orchestrator (orchestrator_1)
Target: challenger_m1_2 (teamwork_preview_challenger)
Working directory: c:\EstudioALL\2026\BaFut\.agents\challenger_m1_2
Role: Milestone M1 Adversarial Stress Verifier

Milestone:
M1: Domain Logic, Atomic Payload Builder & Server Action Remediation

Objective:
Empirically challenge `buildMatchSlotsPayload` across all sports catalog definitions and database constraints:
1. Multi-sport coverage: Fútbol 5v5/6v6/7v7/8v8/11v11, Fútbol Sala 5v5, Básquet 3v3/5v5, Vóley 2v2/6v6, Pádel 2v2/4v4.
2. Boundary stress: extreme lengths of host_team_name (0, 1, 2, 60, 61, 1000), rotation_rule (0, 1, 2, 120, 121, 5000), bench counts (-1, 0, 1, 4, 5, 100), pitch indices (-1, 0, 15, 16, 999).
3. Test compatibility with PostgreSQL check constraints and triggers (`guard_slot_side_insert`).

Inputs:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\lib\match-intent-payload.ts
- c:\EstudioALL\2026\BaFut\lib\match-intent-payload.test.ts

Deliverable:
Run empirical challenge tests in Vitest.
Write `challenge_report.md` and `handoff.md` with your verdict: APPROVE or REQUEST_CHANGES.
Send a completion message to parent.
