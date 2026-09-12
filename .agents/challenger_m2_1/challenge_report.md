# Empirical Challenge Report — Milestone M2 (`LiveMatchBoard.tsx`)

**Challenger**: `challenger_m2_1`  
**Date**: 2026-09-10T23:50:00Z  
**Verdict**: **APPROVE**  
**Overall Risk Assessment**: **LOW**

---

## Executive Summary

`LiveMatchBoard.tsx` and its accompanying test harness (`components/LiveMatchBoard.test.tsx` and `components/LiveMatchBoard.empirical-challenge.test.tsx`) were subjected to empirical adversarial testing across all 5 sports, 12 supported formats, all 70+ formations in `FORMATIONS_CATALOG`, format math boundaries, spot toggle state lifecycles, and WCAG 2.2 AA accessibility requirements.

All 87 tests across both test files (50 worker tests + 37 empirical challenger tests) pass with 100% success in Vitest. The full repository test suite of 47 files (748 tests) passed cleanly with 0 failures and 0 regressions.

---

## Challenge Summary

- **Multi-sport matrix**: 12/12 sport/format configurations verified with exact spot counts.
- **Formation invariants**: 70/70 formations in `FORMATIONS_CATALOG` verified for exact slot counts, non-overlapping coordinates, bounding box containment, and valid role assignments.
- **Format math**: Verified for canonical, boundary (1v1, 22v22, 0v0), whitespace, case insensitivity, and malformed inputs.
- **Spot toggling**: Verified complete cycle without index drift, duplicate keys, or position corruptions.
- **WCAG 2.2 AA**: Verified 44x44px touch targets (hitbox r=22 and button chips), high-contrast focus rings, AAA/AA color contrast ratios, screen reader polite live region announcements, and prefers-reduced-motion support.

---

## Stress Test Results

| # | Stress Scenario | Expected Behavior | Actual Behavior | Result |
|---|-----------------|-------------------|-----------------|:------:|
| ST1 | Fútbol 5v5, 6v6, 7v7, 8v8, 11v11 | Renders exact spots (5, 6, 7, 8, 11) on Side A & B; distinct penalty boxes & center circle | Spots match format math exactly; soccer pitch markings present | **PASS** |
| ST2 | Fútbol Sala 5v5 | Renders 5 spots per side, 6m D-zones, 20px center circle | Spots = 5; futsal D-zones rendered | **PASS** |
| ST3 | Básquet 3v3 and 5v5 | Renders 3 and 5 spots; painted keys (w=78) and center circle (r=22) | Spots match format; basketball markings rendered | **PASS** |
| ST4 | Vóley 2v2 and 6v6 | Renders 2 and 6 spots; central net (stroke 2.6) and 3m attack lines | Spots match format; volleyball net & attack lines rendered | **PASS** |
| ST5 | Pádel 2v2 and 4v4 | Renders 2 and 4 spots; central net and service T-line (y=110) | Spots match format; padel lines rendered | **PASS** |
| ST6 | All 70+ formations catalog scan | `formationSlotCount(entry) === playersPerSideFromFormat(format)`, unique sequential pitch indexes `[0..N-1]`, coordinates `0 < x < 180`, `0 < y < 220` | All 70+ formations satisfy invariants 100% | **PASS** |
| ST7 | Format math fuzzing (`1v1` to `22v22`, `0v0`, `null`, `undefined`, `"soccer"`) | Canonical formats return exact N; invalid/empty strings fall back safely to 5; `0v0` clamped to 1 | No NaN, no throws, exact math outputs | **PASS** |
| ST8 | Spot toggling lifecycle (empty -> spot 0 -> spot 2 -> untoggle spot 0) | State updates correctly, role remains consistent, `aria-pressed` toggles, narrative updates | Clean transitions, 0 duplicate keys, 0 index corruptions | **PASS** |
| ST9 | Dual-modality parity (SVG canvas vs button chip) | Both trigger `onTogglePitchSlot(pitchIndex, role)` with identical arguments | Callbacks called with identical signatures | **PASS** |
| ST10 | Intent 1 (`starter_slots`) interactive semantics | Spots clickable/focusable; chips displayed; "MODO EQUIPO ÚNICO" hint on Side B | Fully interactive Side A; chips present; single-team mode indicated | **PASS** |
| ST11 | Intent 2 (`bench_only`) locked pitch & hero bench | Spots locked (no button role, no tabindex); chips hidden; hero bench highlighted; rotation banner displayed | Pitch locked; hero bench rendered; rotation banner visible | **PASS** |
| ST12 | Intent 3 (`challenge` full_team & open_slots) | Mode full_team: Rival crest with crossed swords; mode open_slots: individual rival spots with dashed border | Correct rival representation per mode; center VS badge displayed | **PASS** |
| ST13 | Touch target dimensions (WCAG 2.5.5 / 2.5.8) | Concentric invisible hitbox r=22 (44x44px target) on SVG spots; min-height/width 44px on chips | Hitbox circle r=22 with pointer-events="all"; chip >= 44x44px | **PASS** |
| ST14 | Color contrast mathematical ratios | Chalk on Turf >= 4.5:1; Flood on Turf >= 3.0:1; Turf-deep on Flood >= 7.0:1; Bib-ink on Bib >= 4.5:1 | Chalk: 5.6:1; Flood: 4.8:1; Turf-deep: 9.8:1; Bib-ink: 5.8:1 | **PASS** |
| ST15 | Adversarial inputs: XSS injection in `hostTeamName` | `<script>alert('xss')</script>` properly escaped by React | HTML characters escaped as `&lt;script&gt;` | **PASS** |
| ST16 | Adversarial inputs: out-of-bounds `pitchIndex` in `selectedPitchSlots` | Negative (-5) or high (99) indexes handled without crashing | Renders safely without throwing | **PASS** |
| ST17 | Keyboard operability (WCAG 2.1.1) | Enter and Space activate spots and chips; Tab navigates; non-activation keys ignored | Correct keyboard handling | **PASS** |

---

## Adversarial Findings & Observations (Constructive Critique)

### [Low Risk] Observation 1: Duplicate Entries in `selectedPitchSlots`
- **Condition**: In `LiveMatchBoard.tsx` line 522:
  ```typescript
  const openCountA = intent === "starter_slots" ? selectedPitchSlots.length : 0;
  const confirmedCountA = perSide - openCountA;
  ```
- **Scenario**: If a consuming component produces a duplicate entry in `selectedPitchSlots` (e.g. `[{ pitchIndex: 0 }, { pitchIndex: 0 }]`), `openCountA` uses `.length` (2) instead of `selectedSet.size` (1), resulting in `confirmedCountA` undercounting by 1.
- **Blast Radius**: Cosmetic text discrepancy in `summaryA` figcaption narrative only; visual pitch spots rely on `selectedSet.has(dot.pitchIndex)` and remain 100% visually correct.
- **Mitigation Recommendation for Worker M3 / Form Integrator**:
  Ensure the parent component state updater eliminates duplicate `pitchIndex` entries (which `buildMatchSlotsPayload` already enforces atomically).

### [Low Risk] Observation 2: Defensive Default Values for Props
- **Condition**: In `LiveMatchBoard.tsx`, parameters `selectedPitchSlots` and `benchCount` do not declare inline default parameters `= []` and `= 0` in destructuring:
  ```typescript
  export function LiveMatchBoard({
    sport,
    format,
    intent,
    formationId,
    selectedPitchSlots,
    onTogglePitchSlot,
    benchCount,
    ...
  ```
- **Scenario**: If invoked without `selectedPitchSlots` or with `selectedPitchSlots={undefined as any}`, a runtime `TypeError` would occur during `.map()`.
- **Blast Radius**: Only affects untyped or careless consumers bypassing TypeScript definitions.
- **Mitigation Recommendation**: Worker M3 should ensure default props `= []` and `= 0` are maintained when integrating with `CreateMatchForm`.

### [Informational] Observation 3: Unicode Presentation in SVG Elements
- **Condition**: In line 830, `<text>⚔</text>` is used for the Rival Crest, and in lines 938/975, `<text>⇄</text>` is used for bench markers.
- **Scenario**: While standalone vector SVG components (`IconSwordsChallenge` and `IconRotationPact`) are exported by `LiveMatchBoard.tsx`, the SVG pitch canvas uses unicode characters within `<text>` nodes.
- **Assessment**: Complies with R4 ("sin emojis como únicos indicadores") because text labels (`RIVAL COMPLETO (N)`) and `aria-label` accompany every symbol.

---

## Unchallenged Areas

- **Backend Supabase / PostgreSQL schema execution**: Handled and verified in Milestone M1 (out of scope for M2 tactical board component).
- **Global form submission in `CreateMatchForm.tsx`**: Scheduled for Milestone M3.

---

## Final Verdict

**APPROVE**.  
The component `components/LiveMatchBoard.tsx` satisfies all specifications in `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `DISPATCH.md`. It exhibits robust multi-sport coverage, exact format math, reliable spot toggling, and rigorous WCAG 2.2 AA accessibility compliance.
