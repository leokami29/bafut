# Dispatch Instructions — Explorer M3.3

## 2026-09-10T23:51:00Z

From: Project Orchestrator (orchestrator_1)
Target: explorer_m3_3 (teamwork_preview_explorer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\explorer_m3_3
Role: Intent UI Accessibility (WCAG 2.2 AA) & Testing Explorer

Milestone:
M3: Intent-Driven UI Architecture & WCAG 2.2 AA (`components/MatchIntentSelector.tsx`, `components/CreateMatchForm.tsx`)

Objective:
Investigate and design WCAG 2.2 AA accessibility and unit testing specifications for `components/MatchIntentSelector.test.tsx`:
- Accessible keyboard navigation:
  - `role="radiogroup"` on container with `aria-label="Intención de la convocatoria"`.
  - `role="radio"` and `aria-checked="true|false"` on each intent card.
  - Roving tabindex (`tabIndex={0}` on selected, `tabIndex={-1}` on unselected).
  - Arrow key navigation (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`) cycling between radio cards.
  - Space and Enter selection.
- Accessible announcements:
  - Polite live region (`aria-live="polite"`) announcing intent changes, bench adjustments, and rival counts.
- Contrast & Touch targets:
  - Text contrast >= 4.5:1, focus rings >= 3:1.
  - Interactive hit targets >= 44x44px.
- Test specifications:
  - Unit tests for `components/MatchIntentSelector.test.tsx` (all 3 intents, keyboard navigation, sub-controls, accessibility attributes).

Read:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\.agents\spec_miner_survey_3\spec_report.md

Deliverable:
Formulate an exact testing & accessibility strategy in `strategy.md` and write `handoff.md`.
Send a completion message to parent when done.
