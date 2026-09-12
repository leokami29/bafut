# Dispatch Instructions — Reviewer 2 (Milestone M1)

## 2026-09-10T23:22:00Z

From: Project Orchestrator (orchestrator_1)
Target: reviewer_m1_2 (teamwork_preview_reviewer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\reviewer_m1_2
Role: Milestone M1 Adversarial Reviewer

Milestone:
M1: Domain Logic, Atomic Payload Builder & Server Action Remediation

Inputs to Review:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\.agents\worker_m1\handoff.md
- c:\EstudioALL\2026\BaFut\lib\match-intent-payload.ts
- c:\EstudioALL\2026\BaFut\lib\match-intent-payload.test.ts
- c:\EstudioALL\2026\BaFut\app\actions.ts
- c:\EstudioALL\2026\BaFut\TEST_READY.md

Review Scope:
- Adversarial challenge of edge cases, regression risks, and security boundaries.
- Inspect edge cases:
  - Can invalid inputs bypass validation?
  - Does legacy form submission still function gracefully without crashing?
  - Are error messages user-friendly and actionable?
  - Does slot insertion fail safely without leaving orphaned match records?
  - Are Next.js conventions in AGENTS.md respected?
- Run tests:
  `npx vitest run lib/match-intent-payload.test.ts`
  `npx vitest run lib/e2e-match-intent.test.ts`
  `npx vitest run lib/`
- Issue a clear verdict: APPROVE or REQUEST_CHANGES in your handoff.md.
- Send a completion message to parent.
