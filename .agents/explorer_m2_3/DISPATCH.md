# Dispatch Instructions — Explorer M2.3

## 2026-09-10T23:32:00Z

From: Project Orchestrator (orchestrator_1)
Target: explorer_m2_3 (teamwork_preview_explorer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\explorer_m2_3
Role: Board Accessibility (WCAG 2.2 AA) & Testing Explorer

Milestone:
M2: Live Tactical Dual Board Component (`components/LiveMatchBoard.tsx`)

Objective:
Investigate and design the WCAG 2.2 AA accessibility semantics, keyboard interaction, contrast ratios, and test suite for `components/LiveMatchBoard.test.tsx`.

Read:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\.agents\spec_miner_survey_3\spec_report.md
- c:\EstudioALL\2026\BaFut\tests\

Deliverable:
Formulate an exact testing & accessibility strategy in `strategy.md`:
- ARIA attributes: `role="region"`, `aria-label`, `aria-live="polite"` live announcements when spots change or intent changes.
- Keyboard navigation: spots operable via `Tab`, `Enter`, `Space` with clear `:focus-visible` focus ring (contrast >= 3:1).
- Color contrast verification: turf background vs chalk lines vs spots text (>= 4.5:1).
- Specification of unit tests for `components/LiveMatchBoard.test.tsx` (rendering all 5 sports, 3 intents, touch targets, keyboard triggers).
- Write `strategy.md` and `handoff.md` in your directory.
- Send a completion message to parent when done.
