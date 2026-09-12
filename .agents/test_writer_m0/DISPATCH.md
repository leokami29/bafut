# Dispatch Instructions — M0 (E2E Testing Track)

## 2026-09-10T23:13:00Z

From: Project Orchestrator (orchestrator_1)
Target: test_writer_m0 (teamwork_preview_test_writer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\test_writer_m0
Role: E2E Test Suite Architect & Writer

Objective:
Design and implement the comprehensive, opaque-box E2E test suite for BaFut match creation & slot configuration based strictly on user requirements and specification matrices (Tiers 1–4). Publish TEST_INFRA.md and TEST_READY.md at project root when complete.

Scope:
- Derive test cases from user requirements, NOT implementation details.
- Read:
  - c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
  - c:\EstudioALL\2026\BaFut\PROJECT.md
  - c:\EstudioALL\2026\BaFut\.agents\spec_miner_survey_3\spec_report.md
- Test Tiers to implement:
  - Tier 1: Feature Coverage (>=5 test cases per feature across F1-F7)
  - Tier 2: Boundary & Corner Cases (>=5 test cases per feature: 0 starters, format max bounds, bench 0-4, team names, rotation rules, etc.)
  - Tier 3: Cross-Feature Combinations (pairwise interaction of intents, formats, bench, and challenges)
  - Tier 4: Real-World Application Scenarios (realistic sports scenarios across 5 sports: vóley 6v6, fútbol 5v5/7v7, pádel 2v2, etc.)
- Use the project's test runner (Vitest) in `tests/e2e-match-creation/` or `lib/e2e-match-intent.test.ts`.
- Run tests with `npx vitest run` to verify execution.
- Create `TEST_INFRA.md` and `TEST_READY.md` at project root following the templates in PROJECT.md.
- Write handoff.md in your working directory and notify parent when complete.
