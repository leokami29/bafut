# BaFut Match Creation E2E Test Suite (Tier 1–4)

**Ownership:** M0 (E2E Test Writer / Orchestrator)  
**Location:** `lib/e2e-match-intent.test.ts`  
**Runner:** Vitest 5.0.0 (`npx vitest run lib/e2e-match-intent.test.ts` or `npx vitest run`)

---

## Overview

This test directory represents the test specification for the Intent-Driven Match Creation and Slot Configuration redesign (Milestones M0–M4).
The executable test harness is located at `lib/e2e-match-intent.test.ts` to seamlessly integrate with BaFut's default Vitest configuration (`include: ["lib/**/*.test.ts", ...]`).

## Test Tier Architecture

| Tier | Name | Test Count | Scope |
|------|------|------------|-------|
| **Tier 1** | Feature Coverage (F1–F7) | 35 tests | Covers each feature F1 to F7 with >=5 tests: Intent 1 ("Completar"), Intent 2 ("Solo Banca"), Intent 3 ("Reto Rival"), Dual Board semantics, Payload validation, DB trigger contracts, and WCAG 2.2 AA accessibility contracts. |
| **Tier 2** | Boundary & Corner Cases | 21 tests | Tests 0 starters, format max bounds (11v11, 2v2, 6v6), bench counts (0 to 4), team name length (2 to 60 chars), rotation rule text (2 to 120 chars), and PostgreSQL side B limit (< 16). |
| **Tier 3** | Cross-Feature Combinations | 11 tests | Pairwise matrices of sports, formats, bench, challenge modes, state transitions between intents, and RPC acceptance rules. |
| **Tier 4** | Real-World Application Scenarios | 10 tests | 5 sports end-to-end (Vóley 6v6, Fútbol 5v5/7v7, Pádel 2v2, Básquet 3v3, Futsal 5v5), keyboard navigation flow, ARIA live feedback, adversarial input sanitization, and atomic rollback simulation. |

**Total Tests:** 77 tests (exceeding the 45+ requirement).

## Execution Commands

```bash
# Run the match creation E2E test suite specifically
npx vitest run lib/e2e-match-intent.test.ts

# Run the full project test suite
npx vitest run
```
