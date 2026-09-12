# Dispatch Instructions — Explorer M3.1

## 2026-09-10T23:51:00Z

From: Project Orchestrator (orchestrator_1)
Target: explorer_m3_1 (teamwork_preview_explorer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\explorer_m3_1
Role: Intent Selector Component Architecture Explorer

Milestone:
M3: Intent-Driven UI Architecture & WCAG 2.2 AA (`components/MatchIntentSelector.tsx`, `components/CreateMatchForm.tsx`)

Objective:
Investigate and design `components/MatchIntentSelector.tsx`:
- 3 mutually exclusive, visually transparent intent cards:
  - Intent 1: "Completar mi Equipo Titular" (`starter_slots`)
  - Intent 2: "Solo Banca / Suplentes" (`bench_only`) — 1 to 4 bench slots + mandatory rotation pact
  - Intent 3: "Reto a Equipo Rival" (`challenge`) — full rival team vs open rival slots + host team name
- Sub-controls for each intent: bench count stepper, rotation rule input/presets, host team name input, challenge mode type toggle.
- Clean vector SVG icons replacing all emojis.
- TypeScript interfaces matching `PROJECT.md` contracts.

Read:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\lib\match-intent-payload.ts
- c:\EstudioALL\2026\BaFut\components\LiveMatchBoard.tsx

Deliverable:
Formulate an exact component design in `strategy.md` and write `handoff.md`.
Send a completion message to parent when done.
