# Dispatch Instructions — Reviewer 2 (Milestone M2)

## 2026-09-10T23:45:00Z

From: Project Orchestrator (orchestrator_1)
Target: reviewer_m2_2 (teamwork_preview_reviewer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\reviewer_m2_2
Role: Milestone M2 Accessibility & Ergonomics Reviewer

Milestone:
M2: Live Tactical Dual Board Component (`components/LiveMatchBoard.tsx`)

Inputs to Review:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\.agents\worker_m2\handoff.md
- c:\EstudioALL\2026\BaFut\components\LiveMatchBoard.tsx
- c:\EstudioALL\2026\BaFut\components\LiveMatchBoard.test.tsx

Review Scope:
- Adversarial inspection of WCAG 2.2 AA compliance:
  - Touch target sizes (minimum 44x44px bounding hit area verified in SVG and HTML chips).
  - Keyboard accessibility (role="button", tabindex, aria-pressed, Enter/Space operability).
  - ARIA landmarks and live regions (`role="region"`, `role="status"`, `aria-live="polite"`, `figcaption`).
  - Absence of standalone emojis (vector SVGs with `aria-hidden="true"`).
  - Color contrast ratios (text >= 4.5:1, non-text focus >= 3:1).
- Run tests:
  `npx vitest run components/LiveMatchBoard.test.tsx`
  `npx vitest run`
  `npm run lint`
- Issue a clear verdict: APPROVE or REQUEST_CHANGES in your handoff.md.
- Send a completion message to parent.
