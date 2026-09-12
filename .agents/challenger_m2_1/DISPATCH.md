# Dispatch Instructions — Challenger 1 (Milestone M2)

## 2026-09-10T23:45:00Z

From: Project Orchestrator (orchestrator_1)
Target: challenger_m2_1 (teamwork_preview_challenger)
Working directory: c:\EstudioALL\2026\BaFut\.agents\challenger_m2_1
Role: Milestone M2 Empirical Multi-Sport Challenger

Milestone:
M2: Live Tactical Dual Board Component (`components/LiveMatchBoard.tsx`)

Objective:
Empirically challenge `LiveMatchBoard.tsx` across all 5 sports and formats:
1. Render and verify Fútbol (5v5, 6v6, 7v7, 8v8, 11v11), Fútbol Sala (5v5), Básquet (3v3, 5v5), Vóley (2v2, 6v6), Pádel (2v2, 4v4).
2. Verify that format math (`playersPerSideFromFormat`) always produces the exact expected number of spots.
3. Verify that spot toggles correctly update state without duplicate indexes or position corruptions.
4. Run your tests in Vitest.
5. Write `challenge_report.md` and `handoff.md` with your verdict (APPROVE or REQUEST_CHANGES).
6. Send a completion message to parent.
