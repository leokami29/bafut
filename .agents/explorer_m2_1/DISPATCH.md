# Dispatch Instructions — Explorer M2.1

## 2026-09-10T23:32:00Z

From: Project Orchestrator (orchestrator_1)
Target: explorer_m2_1 (teamwork_preview_explorer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\explorer_m2_1
Role: Dual Board Geometry & Court Architecture Explorer

Milestone:
M2: Live Tactical Dual Board Component (`components/LiveMatchBoard.tsx`)

Objective:
Investigate and design the court geometry, SVG coordinate system, and dual-side layout (Side A Host vs Side B Rival) for `LiveMatchBoard.tsx`.

Read:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\components\MatchPitchBoard.tsx
- c:\EstudioALL\2026\BaFut\lib\sport-rules.ts
- c:\EstudioALL\2026\BaFut\lib\formations-catalog.ts

Deliverable:
Formulate an exact design strategy in `strategy.md`:
- How to reuse the multi-sport `CourtLines` geometry (fútbol, fútbol sala, básquet, vóley, pádel) from `MatchPitchBoard.tsx`.
- Coordinate calculations for dual half-court rendering (`side: 'a'` on left/top, `side: 'b'` on right/bottom) with center dividing line or net.
- Responsive scaling (`viewBox`, CSS container queries or aspect ratios).
- Format caption rendering (e.g. "Vóley 6v6: 6 titulares por lado").
- Write `strategy.md` and `handoff.md` in your directory.
- Send a completion message to parent when done.
