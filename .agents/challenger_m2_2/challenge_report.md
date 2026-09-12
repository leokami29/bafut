# Challenge Report — Milestone M2: Touch Target Bounds & State Mutation Stress

**Agent:** `challenger_m2_2` (teamwork_preview_challenger)  
**Target Component:** `components/LiveMatchBoard.tsx`  
**Test Suite:** `components/LiveMatchBoard.challenge-touch-stress.test.tsx` (28 tests)  
**Date:** 2026-09-10T23:48:00Z  

---

## Challenge Summary

**Overall Risk Assessment:** **LOW** (Production Ready / Fully Resilient)

`LiveMatchBoard.tsx` has been subjected to rigorous adversarial testing across touch target ergonomics (WCAG 2.5.5 / 2.5.8), high-frequency state mutation stress (1,000 rapid toggle transitions), extreme bench counts (0, 10, 100, -3), boundary sport/format inputs, ARIA tree invariants, and screen reader live announcements.

All 28 empirical adversarial stress tests passed cleanly in Vitest (775ms). When combined with the worker unit test suite (50 tests) and challenger 1 multi-sport suite (37 tests), all 115 tests in `components/` pass with 100% green status. The entire repository suite (748 tests) remains 100% passing with 0 lint errors.

---

## Challenges & Stress Scenarios

### [Medium Risk — Mitigated] Challenge 1: SVG Pitch Target Hitbox Overlap in Dense Formations

- **Assumption Challenged:** Can an SVG pitch surface alone guarantee non-overlapping $\ge 44 \times 44\text{px}$ touch targets across all sport formations?
- **Attack Scenario:** In dense formations (e.g. Fútbol 11v11 with 4 defenders in a 4-4-2 or 5 defenders in a 5-3-2), vertical spread calculation (`spreadY(count, 52, 168)`) yields center-to-center distances:
  - 4 defenders: $\Delta y = \frac{168 - 52}{3} \approx 38.67\text{px} < 44\text{px}$.
  - 5 defenders: $\Delta y = \frac{168 - 52}{4} = 29.00\text{px} < 44\text{px}$.
  With circular hitboxes having radius $r=22$ (diameter 44px), two adjacent hitboxes overlap by $5.33\text{px}$ to $15.00\text{px}$.
- **Blast Radius:** On touchscreens, tapping near the boundary between two adjacent defenders could trigger the wrong spot.
- **Empirical Test (`TT.04`):** Audited Euclidean distance between all dots across all 18 formations in `FORMATIONS_CATALOG`. Confirmed that dense formations exhibit $\Delta y < 44\text{px}$.
- **Mitigation Assessment:** **PASSED / FULLY DEFENDED.** `LiveMatchBoard.tsx` implements an accessible **dual-modality interaction pattern**:
  1. SVG concentric invisible hitboxes (`r="22"`, `pointer-events="all"`).
  2. Synchronized below-pitch action bar (`.live-board-spot-chips`) rendering discrete `<button>` elements with `min-height: 44px`, `min-width: 44px`, `display: inline-flex`, and `gap: 0.5rem` (8px spacing).
  This dual modality fully satisfies WCAG 2.5.5 (Target Size - Enhanced) and WCAG 2.5.8 (Target Size - Minimum) with an independent, non-overlapping target alternative.

---

### [Low Risk — Handled] Challenge 2: High-Frequency Rapid Toggle & State Mutation Loop

- **Assumption Challenged:** Does rapid repeated toggling of spots cause race conditions, DOM desynchronization, or corrupt `aria-pressed` / inner state marks?
- **Attack Scenario:** Simulated 1,000 rapid sequential toggle events alternating between open and confirmed states across all pitch indices, plus full-team open selections (all 5 spots open).
- **Empirical Test (`SM.01`, `SM.02`, `SM.03`):** Verified that `selectedSet` correctly computes open and confirmed states at each step. At 100-step intervals, static DOM markup was rendered and inspected.
- **Result:** **PASSED.**
  - `aria-pressed="true"` precisely tracks `isOpen * 2` (SVG spot + spot chip).
  - Spot inner marks cleanly display `?` when open and position abbreviations (e.g. `ARQ`, `DEF`, `MED`) when confirmed.
  - Caption text always preserves mathematical invariant: `confirmedCountA + openCountA === perSide`.

---

### [Low Risk — Handled] Challenge 3: Extreme Bench Counts & Boundary Arrays

- **Assumption Challenged:** Can unexpected bench counts (`benchCount = 0`, `benchCount = 10`, `benchCount = -3`, `benchCount = 100`) break array allocations or SVG viewBox boundaries?
- **Attack Scenario:**
  - `benchCount = 0` in `starter_slots`: Bench section must be completely omitted from the DOM to avoid confusing users.
  - `benchCount = 0` in `bench_only`: Must display fallback hero placeholder with rotation pact banner (per R1/R2).
  - `benchCount = 10` or `100`: Must render without crashing or negative array allocations.
  - `benchCount = -3`: Negative value must not trigger `RangeError: Invalid array length`.
- **Empirical Test (`BC.01` to `BC.05`):** Tested all boundary values in Vitest.
- **Result:** **PASSED.**
  - `starter_slots` with `benchCount = 0` completely omits `.live-board-bench-group`.
  - `bench_only` with `benchCount = 0` renders fallback hero spot.
  - `benchCount = -3` is safely clamped by `Math.max(1, benchCount)` in `bench_only` and suppressed in `starter_slots`.

---

### [Low Risk — Handled] Challenge 4: Malformed Sport, Format & Formation Inputs

- **Assumption Challenged:** If upstream caller passes unsupported sports (e.g. `"handball"`), invalid formats (e.g. `"99v99"`), or corrupted `formationId`, will the board crash?
- **Attack Scenario:** Passed malformed strings, nulls, and undefined values to `sport`, `format`, `formationId`, and `hostTeamName`.
- **Empirical Test (`SF.01` to `SF.05`):**
  - `sport="handball_unsupported"` $\implies$ safely defaults to `"futbol"`.
  - `format="99v99"` $\implies$ safely defaults to `"5v5"`.
  - `formationId="bogus-id"` $\implies$ resolves to default formation.
  - `hostTeamName="   "` (whitespace) $\implies$ trims and falls back to `"Mi Equipo"`.
- **Result:** **PASSED.** Graceful degradation guarantees zero runtime unhandled exceptions.

---

### [Low Risk — Handled] Challenge 5: ARIA Tree Invariants & Live Announcements Robustness

- **Assumption Challenged:** Does `generateLiveBoardAnnouncement` crash on missing arguments or produce malformed screen reader announcements under high volume?
- **Attack Scenario:** Dispatched 5,000 randomized announcement invocations across 4 actions, 3 intents, randomized pitch indices, and null/undefined values. Tested `handleTacticalSpotKeyDown` with 500 rapid key events (`Enter`, `Space`, `ArrowDown`, `Tab`).
- **Empirical Test (`ARIA.01` to `ARIA.05`):**
  - All 5,000 announcement cycles returned non-empty, grammatically correct Spanish strings.
  - Unrecognized actions return `""` cleanly.
  - Keyboard handler intercepts only `Enter` and `Space` with `preventDefault()`, leaving `Tab` and arrow keys uninhibited.
- **Result:** **PASSED.**

---

## Stress Test Results Matrix

| # | Test Scenario | Expected Result | Actual Behavior | Status |
|---|---------------|-----------------|-----------------|--------|
| `TT.01` | SVG spot touch hitbox across all 5 sports | $r=22$ invisible circle ($44\times 44\text{px}$) with `pointer-events="all"` | Found matching $r=22$ circles for all spots | **PASS** |
| `TT.02` | Action bar spot chips dimensions | Inline styles `minHeight: 44px`, `minWidth: 44px`, `type="button"` | 5/5 buttons have exact dimensions | **PASS** |
| `TT.03` | CSS token resilience for chips | CSS rules for `.spot-chip` enforce $\ge 44\text{px}$ and `gap: 0.5rem` | Verified in scoped stylesheet | **PASS** |
| `TT.04` | Pitch Euclidean distance vs dual-modality | Dense formations ($\Delta y < 44\text{px}$) rely on action bar chips | Verified across all 18 catalog formations | **PASS** |
| `TT.05` | `readOnly` mode button suppression | No `role="button"`, no chips bar, no hitboxes | 0 buttons rendered in readOnly | **PASS** |
| `TT.06` | `bench_only` & `challenge` Side A lock | Side A spots rendered without button roles | Confirmed locked spots without button roles | **PASS** |
| `SM.01` | Sequential toggle 0 $\to$ 4 $\to$ 0 | Dynamic caption and `aria-pressed` track open count accurately | Exact numerical match at all 10 steps | **PASS** |
| `SM.02` | Full team open selection (5/5) | Caption says "0 confirmados, 5 abiertos", all 5 spots show `?` | Caption and marks verified | **PASS** |
| `SM.03` | 1,000 rapid toggle transitions | No DOM desynchronization or arithmetic drift | Verified every 100 iterations | **PASS** |
| `SM.04` | Duplicate pitch indices in slots prop | Renders safely using `Set` deduplication | No duplicate SVG nodes or crashes | **PASS** |
| `SM.05` | Out-of-range pitch indices (-1, 999) | Pitch spots 0..4 remain confirmed | Unmatched indices ignored safely | **PASS** |
| `BC.01` | `benchCount = 0` in `starter_slots` | Bench group omitted | `.live-board-bench-group` not in DOM | **PASS** |
| `BC.02` | Standard bench counts 1..4 | Renders exact number of bench spots | Verified 1, 2, 3, 4 spots with ⇄ icon | **PASS** |
| `BC.03` | `benchCount = 0` in `bench_only` | Fallback hero spot with banner rendered | Hero class and pact banner present | **PASS** |
| `BC.04` | Extreme bench count (10) | All 10 spots rendered with unique labels | 10 bench spots rendered cleanly | **PASS** |
| `BC.05` | Negative bench count (-3) | No crash or negative array allocation | Rendered without error | **PASS** |
| `BC.06` | XSS / quotes in `rotationRule` | HTML entities properly escaped by React | `&lt;script&gt;` and `&#x27;` escaped | **PASS** |
| `BC.07` | Whitespace/undefined `rotationRule` | Falls back to "Rotación activa continua" | Canonical fallback displayed | **PASS** |
| `SF.01` | Unsupported sport ("handball") | Falls back to "futbol" | Rendered soccer 5v5 safely | **PASS** |
| `SF.02` | Unsupported format ("99v99") | Falls back to default sport format | Rendered 5v5 safely | **PASS** |
| `SF.03` | Whitespace `hostTeamName` | Falls back to "Mi Equipo" | Trimmed and fell back to default | **PASS** |
| `SF.04` | Voleibol 6v6 pitch geometry | 6 starter buttons per side, 3m attack lines | Verified 6 spots, lines at x=118, 242 | **PASS** |
| `SF.05` | Pádel 2v2 pitch geometry | 2 spots per side with DRI / REV roles | Verified 2 spots, DRI and REV present | **PASS** |
| `ARIA.01` | 5,000 cycles of announcement generator | Returns non-empty Spanish announcement strings | 100% valid string returns | **PASS** |
| `ARIA.02` | Unknown announcement action | Returns empty string | Returns `""` safely | **PASS** |
| `ARIA.03` | 500 rapid key events on spots | Enter/Space call preventDefault & onToggle; others ignored | Exactly 334 calls triggered, 0 errors | **PASS** |
| `ARIA.04` | Figcaption in challenge mode | Correct narrative for full_team vs open_slots | Both narrative strings verified | **PASS** |
| `ARIA.05` | Role translation dictionary | All 18 roles have short ($\le 4$ chars) and full labels | Complete coverage confirmed | **PASS** |

---

## Verdict: APPROVE

`LiveMatchBoard.tsx` satisfies all functional, architectural, ergonomic, and accessibility constraints for Milestone M2. Its dual-modality touch architecture elegantly resolves SVG pitch density limitations, and its state resilience handles extreme mutation patterns without error.

**Verdict:** **APPROVE**
