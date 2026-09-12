# Dispatch Instructions — Explorer M2.2

## 2026-09-10T23:32:00Z

From: Project Orchestrator (orchestrator_1)
Target: explorer_m2_2 (teamwork_preview_explorer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\explorer_m2_2
Role: Board State & Spot Representation Explorer

Milestone:
M2: Live Tactical Dual Board Component (`components/LiveMatchBoard.tsx`)

Objective:
Investigate and design the interactive player spot representation, visual states, touch target ergonomics, and bench rotation row for `LiveMatchBoard.tsx`.

Read:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\components\FormationPicker.tsx
- c:\EstudioALL\2026\BaFut\components\MatchPitchBoard.tsx
- c:\EstudioALL\2026\BaFut\.agents\spec_miner_survey_3\spec_report.md

Deliverable:
Formulate an exact design strategy in `strategy.md`:
- Spot visual differentiation:
  - Host Side A: confirmed starters vs open starter slots vs complete formation (ghost spots).
  - Rival Side B: "Buscando equipo rival completo" (squad badge) vs N open rival spots for free agents.
  - Bench Row: 1 to 4 substitute spots below pitch with rotation pact indicator (`⇄`) and rule label.
- Touch target ergonomics: ensure each interactive spot has minimum 44x44px bounding hit area (WCAG 2.5.5 / 2.5.8).
- Clean SVG vector icons for position/role (no standalone emojis).
- Write `strategy.md` and `handoff.md` in your directory.
- Send a completion message to parent when done.
