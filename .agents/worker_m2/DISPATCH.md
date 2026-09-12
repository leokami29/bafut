# Dispatch Instructions — Worker M2

## 2026-09-10T23:38:00Z

From: Project Orchestrator (orchestrator_1)
Target: worker_m2 (teamwork_preview_worker)
Working directory: c:\EstudioALL\2026\BaFut\.agents\worker_m2
Milestone: M2 — Live Tactical Dual Board Component (`components/LiveMatchBoard.tsx`)

Exclusive Write Ownership:
- components/LiveMatchBoard.tsx
- components/LiveMatchBoard.test.tsx

Read Inputs:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\.agents\explorer_m2_1\strategy.md
- c:\EstudioALL\2026\BaFut\.agents\explorer_m2_2\strategy.md
- c:\EstudioALL\2026\BaFut\.agents\explorer_m2_3\strategy.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. Implement `components/LiveMatchBoard.tsx`:
   - Dual tactical representation: Side A (Host) and Side B (Rival).
   - Full multi-sport court lines leveraging `MatchPitchBoard.tsx` geometries for all 5 sports: fútbol, fútbol sala, básquet, vóley, pádel.
   - Spot representation across all 3 intents:
     - Intent 1 ("Completar Titulares"): Confirmed starters vs open starter holes, optional bench row.
     - Intent 2 ("Solo Banca"): Starters complete (locked static visual), hero focus on 1-4 bench substitute spots with rotation pact symbol (`⇄`) and rule label.
     - Intent 3 ("Reto"): Confrontation view [Mi Equipo (A)] vs [Equipo Rival (B)], with exact format math (`playersPerSideFromFormat`) rendering full rival squad or open rival slots.
   - WCAG 2.2 AA accessibility:
     - Touch targets >= 44x44px (using concentric transparent `<circle r="22" />` bounding hit area).
     - Semantic `<figure role="region" aria-label="...">` and `<figcaption id="live-board-caption">`.
     - High-contrast focus ring (`--flood` `#ffd25a`).
     - Vector SVG icons with `aria-hidden="true"` (NO emoji-only indicators).
     - Live status announcements container `<div role="status" aria-live="polite">`.
2. Implement comprehensive unit test suite in `components/LiveMatchBoard.test.tsx` based on `explorer_m2_3/strategy.md` (Node-compatible rendering with `react-dom/server`'s `renderToStaticMarkup`). Cover all 5 sports, 3 intents, ARIA landmarks, touch targets >= 44px, and rotation rules.
3. Run verification tests:
   `npx vitest run components/LiveMatchBoard.test.tsx`
   `npx vitest run`
4. Write a 5-component `handoff.md` and send a completion message to parent when done.
