# BaFut E2E Testing Infrastructure (M0)

**Document ID:** TEST-INFRA-BAFUT-M0  
**Framework:** Vitest 5.0.0  
**Environment:** Node.js (with Vitest ESM resolution and `@/*` path alias)  
**Author:** test_writer_m0 (E2E Test Writer / QA Specialist)  
**Status:** Active & Verified  

---

## 1. Executive Summary

This document describes the test harness and execution infrastructure designed to validate the BaFut Intent-Driven Match Creation and Slot Configuration redesign (Milestones M0–M4). The suite provides opaque-box, behavioral test coverage derived strictly from user requirements (`ORIGINAL_REQUEST.md`), architecture specifications (`PROJECT.md`), and survey findings (`spec_report.md`).

---

## 2. Test Architecture & Runner Setup

### 2.1 Configuration
The test execution environment is configured in `vitest.config.ts`:
- **Runner:** `vitest` v5.0.0
- **Path Aliasing:** `@/` mapped to project root via `node:url` `fileURLToPath`.
- **Default Include Patterns:** `["lib/**/*.test.ts", "app/**/*.test.ts", "creative-assets/**/*.test.ts"]`
- **Execution Mode:** Isolated worker threads for hermetic test execution.

### 2.2 Suite Location
- **Primary Executable Harness:** `lib/e2e-match-intent.test.ts`  
  - Automatically discovered by default `npx vitest run`.
  - Directly co-located within the domain library layer.
- **Reference & Documentation Hub:** `tests/e2e-match-creation/README.md`  
  - Provides architectural context and cross-reference to `lib/e2e-match-intent.test.ts`.

---

## 3. Test Tiers Structure (82 Test Cases)

The suite is structured into 5 hierarchical tiers ensuring comprehensive coverage from individual invariant math to full multi-sport user journeys:

| Tier | Category | Test Count | Key Invariants Verified |
|------|----------|------------|-------------------------|
| **Tier 1** | Feature Coverage (F1–F7) | 35 | • **F1 (Completar Titulares):** Starter slots strictly on `side='a'`, `slot_role='starter'`, tactical formation roles, optional bench with rotation pact.<br>• **F2 (Solo Banca):** Exactly 0 starter slots, strictly 1–4 bench slots on `side='a'`, mandatory active rotation pact.<br>• **F3 (Reto Rival):** Side B starters derived from `playersPerSideFromFormat`, `match_mode='challenge'`, host team name validation (2–60 chars).<br>• **F4 (Dual Tactical Board):** Center pitch divider (x=180), mirror formula (`360 - x`), spot semantics (filled, open, bench, invite, ghost), figcaption math for 5 sports.<br>• **F5 (Payload Sanitization):** Pure function invariants, reject illegal combinations (`side='b'` in pickup), role validation.<br>• **F6 (DB & Server Action):** Remediation of `open_count = 0` in Solo Banca, trigger `guard_slot_side_insert` compliance, atomic rollback on failure.<br>• **F7 (WCAG 2.2 AA A11y):** Roving tabindex on radiogroup, `ArrowKeys` cycling with boundary wrap-around, vector SVG icons without bare emojis, `aria-live='polite'` dynamic announcements. |
| **Tier 2** | Boundary & Corner Cases | 21 | • Starter limits: 0 starters valid in Intent 2, rejected in Intent 1; 1 starter minimum; 11 starters max for 11v11; 12 rejected.<br>• Bench limits: 0 bench valid in Intent 1 & 3; 1 to 4 bench valid; 5 rejected; negative and floating numbers normalized.<br>• Team name length: 2 chars min accepted ("FC"), 60 chars max accepted, 1 char rejected ("A"), 61 rejected, whitespace trimmed.<br>• Rotation rule text: 2 chars min, 120 chars max, catalog rules accepted, empty strings normalized.<br>• PostgreSQL trigger limits: 15 Side B slots (11 starters + 4 bench) accepted (< 16), 16 rejected. |
| **Tier 3** | Cross-Feature Combinations | 11 | • Pairwise sport/format/bench matrices (Fútbol 5v5, Vóley 6v6, Fútbol 7v7, Básquet 5v5, Pádel 2v2, Futsal 5v5).<br>• State transitions: Intent 1 -> Intent 2 (clears starters, retains bench), Intent 2 -> Intent 3 (switches to challenge, allocates Side B format capacity), Intent 3 -> Intent 1 (restores pickup).<br>• RPC `accept_challenge_full_team` simulation: rejects host challenging self, verifies rival team name. |
| **Tier 4** | Real-World Application Scenarios | 10 | • Multi-sport scenarios: Vóley 6v6 recreational, Fútbol 5v5 competitive derby, Fútbol 7v7 Solo Banca WhatsApp match, Pádel 2v2 double, Básquet 3v3 half-court streetball, Futsal 5v5 Diamante 1-2-1.<br>• Keyboard-only navigation journey (WCAG 2.1.1 & 2.4.7).<br>• Screen reader live announcements sequence (`aria-live="polite"`).<br>• Adversarial input hardening (XSS injection attempts, Unicode emoji flooding, pricing overflows).<br>• Atomic rollback guarantee against network/DB fault. |
| **Tier 5** | Production Domain Integration | 5 | • Direct verification of `buildMatchSlotsPayload` exported from `lib/match-intent-payload.ts`.<br>• Validates that production domain code satisfies the exact specifications across all 3 intents and boundary conditions. |

---

## 4. Authoritative Oracles & Expected Output Derivation

Every assertion in the test suite is derived from explicit authoritative specifications:
1. **Sports Rules Catalog:** `lib/sport-rules.ts` (`SPORT_RULES`, `SPORTS`, `FORMATS`, `POSITIONS`).
2. **Tactical Math Catalog:** `lib/formations-catalog.ts` (`playersPerSideFromFormat`).
3. **Database Constraints & Triggers:** PostgreSQL migration `20260910180000_fix_challenge_side_b_insert_guard.sql`.
4. **Accessibility Standards:** W3C WAI-ARIA Radio Group pattern & WCAG 2.2 AA (contrast >= 4.5:1, target size >= 44px, focus non-obscured).
5. **Domain Validation Engine:** Reference oracle `evaluateIntentSpecification` ensuring test suite autonomy and progressive testability.

---

## 5. Test Execution Commands

```bash
# Execute only the match creation E2E test suite (fast feedback, ~400ms)
npx vitest run lib/e2e-match-intent.test.ts

# Execute full project test suite (all 43 test files)
npx vitest run

# Run in watch mode during development
npx vitest lib/e2e-match-intent.test.ts
```
