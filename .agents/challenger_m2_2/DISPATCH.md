# Dispatch Instructions — Challenger 2 (Milestone M2)

## 2026-09-10T23:45:00Z

From: Project Orchestrator (orchestrator_1)
Target: challenger_m2_2 (teamwork_preview_challenger)
Working directory: c:\EstudioALL\2026\BaFut\.agents\challenger_m2_2
Role: Milestone M2 Stress & Touch Target Verifier

Milestone:
M2: Live Tactical Dual Board Component (`components/LiveMatchBoard.tsx`)

Objective:
Adversarially challenge touch targets and DOM boundary conditions:
1. Verify that all interactive spots strictly satisfy WCAG 2.5.5 / 2.5.8 touch target bounds (>= 44x44px).
2. Stress test rapid toggles and state mutations (large bench counts, extreme formats).
3. Verify ARIA tree invariants and live announcement strings.
4. Run challenge tests in Vitest.
5. Write `challenge_report.md` and `handoff.md` with your verdict (APPROVE or REQUEST_CHANGES).
6. Send a completion message to parent.
