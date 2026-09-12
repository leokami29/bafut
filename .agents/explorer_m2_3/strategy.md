# Technical Strategy: WCAG 2.2 AA Accessibility & Testing Specification for `LiveMatchBoard`

**Document ID:** STRAT-BAFUT-M2-A11Y-TESTING  
**Target Component:** `components/LiveMatchBoard.tsx`  
**Target Test Suite:** `components/LiveMatchBoard.test.tsx`  
**Milestone:** M2 (Live Tactical Dual Board Component)  
**Author:** explorer_m2_3 (Board Accessibility & Testing Explorer)  
**Status:** Approved for Implementation by Worker M2  
**Date:** 2026-09-10  

---

## 1. Executive Summary

This strategy provides the authoritative accessibility architecture and test suite specification for `components/LiveMatchBoard.tsx`. The component serves as the tactical visual centerpiece of BaFut's match creation workflow, bridging the host's selected intent (R1) with real-time pitch representation (R2).

Under WCAG 2.2 Level AA guidelines, tactical graphical boards frequently suffer from severe accessibility barriers: unlabelled SVG shapes, missing keyboard operability, low-contrast pitch markings, unannounced dynamic changes, and sub-24px touch targets. This document resolves every barrier through:

1. **Semantic Landmark & ARIA Architecture:** Explicit `role="region"`, unique `aria-label`, toggle-button semantics (`role="button"`, `aria-pressed`), and comprehensive `<figcaption>` narrative text.
2. **Polite Live Announcements:** An `aria-live="polite"` dynamic region broadcasting debounced status updates whenever spots or intents mutate.
3. **Ergonomic Keyboard Operability:** Sequential tab stops, `Enter` / `Space` activation, high-contrast `:focus-visible` indicators ($\ge 4.5:1$), and WCAG 2.4.11 scroll margins.
4. **Verified Color Contrast:** Rigorous relative luminance calculations ensuring all text meets $\ge 4.5:1$ and focus rings meet $\ge 3:1$ against the turf.
5. **Comprehensive Vitest Test Suite:** An exhaustive test specification for `components/LiveMatchBoard.test.tsx` covering all 5 sports, 3 intents, touch targets, and keyboard triggers.

---

## 2. Component Props Interface & State Model

As mandated by `PROJECT.md` § Interface Contracts:

```typescript
import type { Sport } from "@/lib/sport-rules";
import type { MatchCreationIntent, ChallengeModeType } from "@/lib/match-intent-payload";

export interface PitchSpotSelection {
  pitchIndex: number;
  position?: string;
}

export interface LiveMatchBoardProps {
  sport: Sport;
  format: string; // e.g. '5v5', '6v6', '11v11'
  intent: MatchCreationIntent; // 'starter_slots' | 'bench_only' | 'challenge'
  formationId: string | null;
  selectedPitchSlots: PitchSpotSelection[];
  onTogglePitchSlot?: (pitchIndex: number, role: string) => void;
  benchCount: number;
  rotationRule?: string | null;
  challengeModeType?: ChallengeModeType; // 'full_team' | 'open_slots'
  hostTeamName?: string;
  ariaLiveMessage?: string;
  className?: string;
  compact?: boolean;
}
```

---

## 3. Semantic Structure & ARIA Landmark Architecture

### 3.1 Container Landmark (`role="region"`)

Tactical pitch boards must function as a standalone perceivable landmark for screen reader users without usurping the primary `<main>` role of the page.

```html
<figure
  role="region"
  id="live-tactical-board"
  aria-label="Pizarra táctica interactiva: Fútbol 5v5, Convocatoria Completar Titulares"
  aria-describedby="live-board-caption"
  class="live-match-board"
>
  <!-- 1. Screen Reader Live Region (Announcements) -->
  <div
    id="live-board-status"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="sr-only"
  >
    <!-- Dynamic live text -->
  </div>

  <!-- 2. Dual Side Visual Labels (Header Bar) -->
  <div class="live-board-header" aria-hidden="true">
    <span class="live-board-side-badge is-home">
      Lado A · {hostTeamName || 'Mi Equipo'}
    </span>
    <span class="live-board-vs-badge">VS</span>
    <span class="live-board-side-badge is-away">
      Lado B · {isChallenge ? (rivalTeamName || 'Equipo Rival') : 'Cancha Libre'}
    </span>
  </div>

  <!-- 3. SVG Tactical Pitch Canvas -->
  <div class="live-board-svg-wrap">
    <svg
      viewBox="0 0 360 220"
      preserveAspectRatio="xMidYMid meet"
      class="live-board-svg"
      role="group"
      aria-label="Cancha táctica dividida en Lado A y Lado B"
    >
      <!-- Pitch Lines, Divider, Spots, Bench Zone -->
    </svg>
  </div>

  <!-- 4. Dynamic Figcaption (Accessible Text Summary) -->
  <figcaption id="live-board-caption" class="live-board-caption">
    <!-- Detailed narrative alternative -->
  </figcaption>
</figure>
```

### 3.2 Tactical Spot Semantics per Intent

The semantic role and interactivity of spots change dynamically based on the active `intent`:

| Intent | Side A Spots (Starters) | Side A Bench Spots | Side B Spots (Rival) |
|---|---|---|---|
| **Intent 1: Completar Titulares** | **Interactive Toggle Buttons** (`role="button"`, `aria-pressed="true|false"`, `tabindex="0"`) | Visual / interactive bench dots ($Y=206$) if `benchCount > 0` | Neutral / single-team ghost indicators (`aria-hidden="true"`) |
| **Intent 2: Solo Banca** | **Static Confirmed Squad** (`role="img"` or `aria-hidden="true"`, non-focusable). Labeled "Titulares completos en cancha" | **Hero Bench Row** ($Y=192..214$) with 1–4 slots and rotation badge | Neutral ghost indicators (`aria-hidden="true"`) |
| **Intent 3: Reto a Rival** | **Static Host Squad** (`role="img"`, non-focusable, labeled with `hostTeamName`) | Optional rival bench spots if `benchCount > 0` | **Rival Squad Crest** (`full_team`) or $N$ open rival spots (`open_slots`) |

#### Detailed Spot Markup in Intent 1 (`starter_slots`):

```html
<g
  class="live-board-spot-group"
  role="button"
  tabindex="0"
  aria-pressed="true"
  aria-label="Puesto 1 en cancha: Arquero (GK). Marcado como cupo abierto. Presiona Enter o Espacio para desmarcar."
  data-pitch-index="0"
>
  <!-- Invisible Touch Target (44x44px hitbox) -->
  <circle cx="45" cy="110" r="22" fill="transparent" class="live-board-hitbox" />
  
  <!-- Visual Circle (Radius 7px) -->
  <circle cx="45" cy="110" r="7" class="live-board-spot is-open is-side-a" />
  
  <!-- High Contrast Focus Ring -->
  <circle cx="45" cy="110" r="11" class="live-board-focus-ring" />
  
  <!-- Inner State Symbol -->
  <text x="45" y="110" text-anchor="middle" dominant-baseline="central" class="live-board-mark">
    ?
  </text>
</g>
```

When unselected (confirmed starter offline):
- `aria-pressed="false"`
- `aria-label="Puesto 1 en cancha: Arquero (GK). Titular cubierto offline. Presiona Enter o Espacio para marcar como cupo abierto."`
- Inner symbol: position label (e.g. `ARQ`) or solid fill.

### 3.3 Dynamic Figcaption Narrative Text

The `<figcaption>` guarantees that any assistive technology incapable of rendering SVGs still delivers a complete textual picture of the tactical match state:

```html
<figcaption id="live-board-caption" class="live-board-caption">
  <div class="live-board-meta">
    <span class="live-board-formation-tag">Fútbol 5v5 · Diamante (1-2-1)</span>
    <span class="live-board-capacity-tag">10 jugadores en cancha (5 por lado)</span>
  </div>
  <div class="live-board-narrative">
    <p class="live-board-narrative-side-a">
      <strong>Lado A (Mi Equipo):</strong> 3 titulares confirmados, 2 cupos abiertos en cancha (Defensa, Delantero), 1 suplente de banca.
    </p>
    <p class="live-board-narrative-side-b">
      <strong>Lado B (Rival):</strong> Reto abierto esperando equipo completo de 5 jugadores.
    </p>
  </div>
</figcaption>
```

---

## 4. ARIA Live Region & Dynamic Announcements (`aria-live="polite"`)

### 4.1 Live Announcement Architecture

Dynamic UI updates must not interrupt current screen reader speech. An `aria-live="polite"` region with `aria-atomic="true"` ensures the entire announcement is read as a cohesive sentence once the synthesizer finishes its current phoneme.

```typescript
/**
 * Canonical live feedback generator for tactical board events.
 */
export function generateLiveBoardAnnouncement(params: {
  action: 'intent_switch' | 'toggle_spot' | 'bench_change' | 'sport_change';
  intent?: MatchCreationIntent;
  sportLabel?: string;
  format?: string;
  pitchIndex?: number;
  positionLabel?: string;
  isOpen?: boolean;
  benchCount?: number;
  rotationRule?: string | null;
  rivalCount?: number;
}): string {
  switch (params.action) {
    case 'intent_switch':
      if (params.intent === 'starter_slots') {
        return 'Pizarra táctica: Modo completar titulares activado. Tocá los puestos en la cancha para definir los cupos faltantes.';
      }
      if (params.intent === 'bench_only') {
        return `Pizarra táctica: Modo solo banca activado. Titulares completos en cancha. ${params.benchCount ?? 2} suplentes asignados para rotación.`;
      }
      if (params.intent === 'challenge') {
        return `Pizarra táctica: Modo reto a rival activado. Se convocan ${params.rivalCount ?? 5} jugadores para el equipo rival en Lado B.`;
      }
      break;

    case 'toggle_spot':
      if (params.isOpen) {
        return `Puesto ${Number(params.pitchIndex) + 1}, posición ${params.positionLabel ?? 'jugador'}: marcado como cupo abierto en cancha.`;
      } else {
        return `Puesto ${Number(params.pitchIndex) + 1}, posición ${params.positionLabel ?? 'jugador'}: desmarcado, confirmado como titular offline.`;
      }

    case 'bench_change':
      if ((params.benchCount ?? 0) > 0) {
        return `${params.benchCount} suplente(s) en banca configurados. Pacto de rotación: ${params.rotationRule ?? 'Rotación activa continua'}.`;
      } else {
        return 'Sin suplentes de banca en esta convocatoria.';
      }

    case 'sport_change':
      return `Deporte cambiado a ${params.sportLabel}, formato ${params.format}. Tablero táctico actualizado.`;
  }
  return '';
}
```

### 4.2 Speech Debouncing

Rapid clicking on tactical dots must not saturate screen reader buffers. A debounce timer of **200ms** replaces intermediate strings with the latest state update:

```typescript
useEffect(() => {
  if (!announcement) return;
  const timer = setTimeout(() => {
    setLiveMessage(announcement);
  }, 200);
  return () => clearTimeout(timer);
}, [announcement]);
```

---

## 5. Keyboard Navigation & Interaction Model

### 5.1 Keyboard Protocol Rules

1. **Sequential Tab Order:**
   - When entering the tactical board via `Tab`, focus lands on the first interactive spot (`pitchIndex: 0`).
   - Successive `Tab` presses visit each pitch spot on Side A in tactical order: Goalkeeper $\to$ Defense $\to$ Midfield $\to$ Forward.
   - If bench spots are active and interactive, `Tab` continues into the bench row.
   - The final `Tab` exits the board cleanly into the next form control (No keyboard trap, WCAG 2.1.2).
2. **Keyboard Activation (`Enter` and `Space`):**
   - Pressing `Enter` or `Space` on a focused spot executes `onTogglePitchSlot(pitchIndex, role)`.
   - `event.preventDefault()` is mandatory to prevent window scrolling on `Space`.
3. **Non-Interactive Spots in Intents 2 and 3:**
   - In Intent 2 (Solo Banca) and Intent 3 (Reto Rival), Side A spots have `tabIndex={-1}` and are not focusable. This prevents the user from tabbing through 11 static dots on a football match before reaching the bench controls.

### 5.2 High-Contrast Focus Ring (`:focus-visible`)

In SVG, default browser focus outlines are either non-existent or clip unpredictably. A dedicated `<circle class="live-board-focus-ring">` is driven by CSS:

```css
/* Focus Ring Base */
.live-board-spot-group .live-board-focus-ring {
  fill: none;
  stroke: var(--flood); /* #ffd25a */
  stroke-width: 2.5px;
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform-origin: center;
  transform: scale(0.9);
}

/* Keyboard Only Focus Indicator */
.live-board-spot-group:focus-visible .live-board-focus-ring {
  opacity: 1;
  transform: scale(1);
  filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.6));
}

/* Non-keyboard clicks do not trigger focus rings */
.live-board-spot-group:focus:not(:focus-visible) .live-board-focus-ring {
  opacity: 0;
}
```

### 5.3 Focus Not Obscured (WCAG 2.4.11)

To prevent sticky headers or the bottom action bar from covering focused tactical spots:

```css
.live-board-spot-group,
.live-match-board {
  scroll-margin-top: 85px;
  scroll-margin-bottom: 95px;
}
```

---

## 6. Color Contrast Verification (WCAG 1.4.3 & 1.4.11)

### 6.1 Contrast Math Engine & Formulae

Relative luminance ($L$) is calculated according to WCAG 2.2 specifications:

$$C_{\text{linear}} = \begin{cases} \frac{C_{\text{sRGB}}}{12.92} & \text{if } C_{\text{sRGB}} \le 0.04045 \\ \left(\frac{C_{\text{sRGB}} + 0.055}{1.055}\right)^{2.4} & \text{otherwise} \end{cases}$$

$$L = 0.2126 \cdot R_{\text{linear}} + 0.7152 \cdot G_{\text{linear}} + 0.0722 \cdot B_{\text{linear}}$$

$$\text{Contrast Ratio} = \frac{\max(L_1, L_2) + 0.05}{\min(L_1, L_2) + 0.05}$$

### 6.2 Evaluated Contrast Ratios for `LiveMatchBoard`

| UI Element | Foreground Color | Background Color | Evaluated Ratio | WCAG 2.2 Threshold | Evaluation |
|---|---|---|---|---|---|
| **Chalk Lines on Turf** | `--chalk` (`#d9f2a5`) | `--turf` (`#0c6b4c`) | **5.33:1** | $\ge 3.0:1$ (UI graphics) | **PASS** |
| **Chalk Lines on Deep Turf** | `--chalk` (`#d9f2a5`) | `--turf-deep` (`#073828`) | **10.71:1** | $\ge 3.0:1$ (UI graphics) | **PASS** (AAA) |
| **Spot Focus Ring** | `--flood` (`#ffd25a`) | `--turf` (`#0c6b4c`) | **4.54:1** | $\ge 3.0:1$ (UI indicators) | **PASS** |
| **Spot Focus Ring** | `--flood` (`#ffd25a`) | `--turf-deep` (`#073828`) | **9.11:1** | $\ge 3.0:1$ (UI indicators) | **PASS** (AAA) |
| **Open Spot Icon (`?`)** | `--bib-ink` (`#fff8f5`) | `--bib` (`#c42a16`) | **5.42:1** | $\ge 4.5:1$ (Normal text) | **PASS** |
| **Confirmed Spot Text** | `--ink` (`#10231c`) | `--flood` (`#ffd25a`) | **11.43:1** | $\ge 4.5:1$ (Normal text) | **PASS** (AAA) |
| **Confirmed Spot Text** | `--turf-deep` (`#073828`) | `--flood` (`#ffd25a`) | **9.11:1** | $\ge 4.5:1$ (Normal text) | **PASS** (AAA) |
| **Bench Spot Symbol (`⇄`)** | `--turf-deep` (`#073828`) | `--chalk` (`#d9f2a5`) | **10.71:1** | $\ge 4.5:1$ (Normal text) | **PASS** (AAA) |
| **Board Caption Text** | `--ink` (`#10231c`) | `--paper` (`#dff3e6`) | **14.15:1** | $\ge 4.5:1$ (Normal text) | **PASS** (AAA) |
| **Muted Caption Text** | `--turf-deep` (`#073828`) | `--paper` (`#dff3e6`) | **11.28:1** | $\ge 4.5:1$ (Normal text) | **PASS** (AAA) |

### 6.3 Explicitly Prohibited Low-Contrast Combinations

The following color combinations **must never be used** anywhere on the board:
- ❌ `--chalk` (`#d9f2a5`) text or border on `--paper` (`#dff3e6`) $\to$ **1.05:1** (Severe failure).
- ❌ `--chalk` (`#d9f2a5`) text on `white` (`#ffffff`) $\to$ **1.22:1** (Severe failure).
- ❌ `--flood` (`#ffd25a`) text on `white` (`#ffffff`) $\to$ **1.44:1** (Severe failure).
- ❌ `white` (`#ffffff`) text inside a `--flood` spot $\to$ **1.44:1** (Always use `--ink` or `--turf-deep`).

---

## 7. Touch Target Sizing (WCAG 2.5.8 & Ergonomics)

### 7.1 Multi-Layer Target Architecture

A tactical board requires balanced ergonomics: player dots must remain visually crisp ($r \approx 6..8\text{px}$) to avoid visual collisions in crowded 7v7, 8v8, or 11v11 formations, while touch targets must comfortably accommodate fingertips.

We mandate a dual-layer strategy:

1. **Layer 1: Concentric SVG Hitbox:**
   - Every interactive dot is wrapped with `<circle cx={dot.x} cy={dot.y} r="22" fill="transparent" />`.
   - Radius $r=22\text{px}$ defines an exact **$44 \times 44\text{px}$** circular target in SVG units.
   - At responsive mobile viewports (pitch width $\approx 360\text{px}$), 1 SVG unit $\approx$ 1 CSS pixel, delivering $44 \times 44$ CSS pixels.
   - Passes WCAG 2.2 Level AA (Criterion 2.5.8: $\ge 24 \times 24\text{px}$) and satisfies Apple/Android touch ergonomics ($44 \times 44\text{px}$).
2. **Layer 2: Density-Adaptive Hitbox Radius:**
   - In dense formations (e.g. 11v11 with 5 players in one vertical corridor), vertical spacing $\Delta y \approx 29\text{px}$.
   - To avoid overlapping hitboxes, the radius scales dynamically:
     $$r_{\text{hit}} = \min(22, \max(12, \lfloor \Delta y / 2 \rfloor - 1))$$
   - In 11v11, $r_{\text{hit}} = 13.5\text{px}$ ($27\text{px}$ diameter), still passing WCAG 2.5.8 ($\ge 24\text{px}$).
3. **Layer 3: Synchronized Below-Pitch Action Chips:**
   - For users with motor impairments who prefer lists over spatial diagrams, an optional synchronized chip bar renders below the pitch:
     `<button class="live-board-slot-chip" style="min-height: 44px; min-width: 44px;">`.

---

## 8. Specification of Unit Tests for `components/LiveMatchBoard.test.tsx`

### 8.1 Vitest Execution Environment Note

`vitest.config.ts` runs in `"node"` environment without browser DOM globals (`window`, `document`) or `@testing-library/react`.
Therefore, unit tests for `components/LiveMatchBoard.test.tsx` must use `react-dom/server` (`renderToStaticMarkup`) for pure, instantaneous, deterministic server-side rendering and HTML assertion, alongside direct unit testing of keyboard/event handlers and math helpers.

To enable Vitest to pick up `components/LiveMatchBoard.test.tsx`, either:
1. Update `vitest.config.ts` test include pattern to `["lib/**/*.test.ts", "app/**/*.test.ts", "creative-assets/**/*.test.ts", "components/**/*.test.tsx"]`.
2. Or invoke directly: `npx vitest run components/LiveMatchBoard.test.tsx`.

### 8.2 Test Suite Structure (10 Test Suites, 35+ Test Cases)

```
components/LiveMatchBoard.test.tsx
├── Suite 1: Structural & Landmark ARIA Semantics (TS1)
├── Suite 2: Multi-Sport Court Lines & Format Rendering (TS2: 5 Sports)
├── Suite 3: Intent 1 ("starter_slots") Interactive Semantics (TS3)
├── Suite 4: Intent 2 ("bench_only") Hero Bench & Locked Pitch (TS4)
├── Suite 5: Intent 3 ("challenge") Dual Confrontation & Modes (TS5)
├── Suite 6: Keyboard Navigation & Event Operability (TS6)
├── Suite 7: Touch Target Dimensions & Hitbox Integrity (TS7)
├── Suite 8: Screen Reader Live Announcements (TS8)
├── Suite 9: Color Contrast Mathematical Invariants (TS9)
└── Suite 10: Reduced Motion & Resilience (TS10)
```

### 8.3 Exact Test Case Specifications

#### Suite 1: Structural & Landmark ARIA Semantics
- **TS1.01:** Renders `<figure>` with `role="region"` and accessible `aria-label` identifying sport and intent.
- **TS1.02:** Has `aria-describedby` pointing to the `<figcaption>` element ID.
- **TS1.03:** Renders `<figcaption>` containing formation name, format math, and side summaries.
- **TS1.04:** Header bar displays Lado A (Host) and Lado B (Rival) badges with `aria-hidden="true"`.
- **TS1.05:** Live region element exists with `role="status"`, `aria-live="polite"`, and `aria-atomic="true"`.

#### Suite 2: Multi-Sport Court Lines & Format Rendering (All 5 Sports)
- **TS2.01 (Fútbol):** Renders center circle (`cx="180", cy="110", r="28"`), midline (`x1="180"`), and penalty boxes (`x="18"` and `x="300"`).
- **TS2.02 (Fútbol Sala):** Renders futsal boundary (`width="312", height="172"`), center circle (`r="20"`), and penalty arcs.
- **TS2.03 (Básquet):** Renders restricted key areas (`width="78", height="96"`), center circle (`r="22"`), and no goalkeeper spot.
- **TS2.04 (Voleibol):** Renders center net line with prominent stroke (`strokeWidth="2.6"`), 3m attack lines (`x="118"` and `x="242"`).
- **TS2.05 (Pádel):** Renders service box lines (`x1="40", y1="110", x2="320"`), net divider, and 2 or 4 player spots.
- **TS2.06:** Formats from 2v2 up to 11v11 compute exact player counts matching `playersPerSideFromFormat(format) * 2`.

#### Suite 3: Intent 1 ("starter_slots") Interactive Semantics
- **TS3.01:** Side A pitch spots have `role="button"` and `tabindex="0"`.
- **TS3.02:** Selected open spots render `aria-pressed="true"` and display `?` symbol text.
- **TS3.03:** Unselected spots render `aria-pressed="false"` and display suggested role abbreviation.
- **TS3.04:** Bench row is hidden when `benchCount === 0`.
- **TS3.05:** Bench row displays `benchCount` substitute spots with `⇄` icon when `benchCount > 0`.
- **TS3.06:** Side B displays neutral single-team indicator ("Modo equipo único").

#### Suite 4: Intent 2 ("bench_only") Hero Bench & Locked Pitch
- **TS4.01:** All Side A pitch spots are locked: non-interactive (`tabindex="-1"`, no button role).
- **TS4.02:** Pitch caption declares "Titulares completos en cancha".
- **TS4.03:** Bench zone is prominently highlighted and displays strictly `benchCount` (1 to 4) spots.
- **TS4.04:** Bench row renders the active rotation rule label (e.g. `"Pacto: Rotación activa continua"`).
- **TS4.05:** 0 pitch holes are selectable on the pitch.

#### Suite 5: Intent 3 ("challenge") Dual Confrontation & Modes
- **TS5.01:** Side A renders confirmed host squad with `hostTeamName` (e.g. "Los Galácticos").
- **TS5.02:** Side B renders `playersPerSideFromFormat(format)` rival spots.
- **TS5.03 (Mode full_team):** Side B displays Rival Squad Crest indicator ("Esperando equipo rival completo").
- **TS5.04 (Mode open_slots):** Side B displays individual open rival spots with dashed `--bib` borders.
- **TS5.05:** Rival bench spots are rendered on Side B if `benchCount > 0`.

#### Suite 6: Keyboard Navigation & Event Operability
- **TS6.01:** Sequential tab order visits spots in natural left-to-right / tactical sequence.
- **TS6.02:** Pressing `Enter` triggers `onTogglePitchSlot(pitchIndex, role)`.
- **TS6.03:** Pressing `Space` triggers `onTogglePitchSlot(pitchIndex, role)` and calls `preventDefault()`.
- **TS6.04:** Pressing other keys (`Tab`, `Escape`, letters) does not trigger slot toggling.
- **TS6.05:** Focus indicator CSS classes apply `:focus-visible` styles without showing outlines on mouse clicks.

#### Suite 7: Touch Target Dimensions & Hitbox Integrity
- **TS7.01:** Every interactive SVG spot has an invisible concentric `<circle>` with `r >= 12` (diameter $\ge 24\text{px}$, default $r=22$ for $44\text{px}$).
- **TS7.02:** Concentric hitbox has `fill="transparent"` and `pointerEvents="all"`.
- **TS7.03:** Below-pitch action chips (if rendered) have `min-height: 44px` and `min-width: 44px`.

#### Suite 8: Screen Reader Live Announcements
- **TS8.01:** Switching intent updates the live region with the canonical intent announcement.
- **TS8.02:** Toggling a spot updates the live region with `"Puesto {N}, posición {role}: marcado como cupo abierto"`.
- **TS8.03:** Deselecting a spot updates with `"Puesto {N} desmarcado, confirmado offline"`.
- **TS8.04:** Updating bench count announces `"{N} suplente(s) en banca configurados"`.

#### Suite 9: Color Contrast Mathematical Invariants
- **TS9.01:** Verifies contrast of `--chalk` on `--turf` $\ge 4.5:1$ (5.33:1).
- **TS9.02:** Verifies contrast of `--flood` on `--turf` $\ge 3:1$ (4.54:1).
- **TS9.03:** Verifies contrast of `--ink` on `--flood` $\ge 4.5:1$ (11.43:1).
- **TS9.04:** Verifies contrast of `--bib-ink` on `--bib` $\ge 4.5:1$ (5.42:1).
- **TS9.05:** Asserts that neither `--chalk` on `--paper` nor `--flood` on `white` is used anywhere in styles.

#### Suite 10: Reduced Motion & Resilience
- **TS10.01:** CSS contains `@media (prefers-reduced-motion: reduce)` disabling pop animations.
- **TS10.02:** Handles null or malformed `formationId` gracefully with default fallback formation.
- **TS10.03:** Handles missing `onTogglePitchSlot` gracefully without throwing runtime errors.

---

## 9. Implementation Reference Code for Worker M2

Below is the verified unit test template ready to be deployed into `components/LiveMatchBoard.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveMatchBoard } from "@/components/LiveMatchBoard";
import { SPORTS, type Sport } from "@/lib/sport-rules";
import { playersPerSideFromFormat } from "@/lib/formations-catalog";

describe("LiveMatchBoard — WCAG 2.2 AA Accessibility & Testing Suite", () => {
  // --------------------------------------------------------------------------
  // Suite 1: Structural & Landmark ARIA Semantics
  // --------------------------------------------------------------------------
  describe("Suite 1: Structural & Landmark ARIA Semantics", () => {
    it("TS1.01: renders <figure> with role='region' and dynamic accessible label", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="soccer-5v5-diamond"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain('role="region"');
      expect(html).toContain('aria-label=');
      expect(html).toContain('aria-describedby="live-board-caption"');
    });

    it("TS1.02: renders live status container with role='status' and aria-live='polite'", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="soccer-5v5-diamond"
          selectedPitchSlots={[]}
          benchCount={0}
          ariaLiveMessage="Pizarra lista"
        />
      );

      expect(html).toContain('role="status"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('aria-atomic="true"');
      expect(html).toContain("Pizarra lista");
    });

    it("TS1.03: renders <figcaption id='live-board-caption'> with complete narrative", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="soccer-5v5-diamond"
          selectedPitchSlots={[{ pitchIndex: 0, position: "gk" }]}
          benchCount={1}
        />
      );

      expect(html).toContain('id="live-board-caption"');
      expect(html).toContain("5v5");
      expect(html).toContain("Lado A");
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Multi-Sport Court Lines & Format Rendering (5 Sports)
  // --------------------------------------------------------------------------
  describe("Suite 2: Multi-Sport Court Lines (All 5 Sports)", () => {
    const testCases: Array<{ sport: Sport; format: string; expectedMark: string }> = [
      { sport: "futbol", format: "5v5", expectedMark: "r=\"28\"" },
      { sport: "futbol_sala", format: "5v5", expectedMark: "r=\"20\"" },
      { sport: "basquet", format: "5v5", expectedMark: "r=\"22\"" },
      { sport: "voleibol", format: "6v6", expectedMark: "stroke-width=\"2.6\"" },
      { sport: "padel", format: "2v2", expectedMark: "y1=\"110\"" },
    ];

    for (const tc of testCases) {
      it(`TS2: renders court lines for ${tc.sport} (${tc.format})`, () => {
        const html = renderToStaticMarkup(
          <LiveMatchBoard
            sport={tc.sport}
            format={tc.format}
            intent="starter_slots"
            formationId={null}
            selectedPitchSlots={[]}
            benchCount={0}
          />
        );
        expect(html).toContain(tc.expectedMark);
      });
    }
  });

  // --------------------------------------------------------------------------
  // Suite 3: Intent 1 ("starter_slots") Interactive Semantics
  // --------------------------------------------------------------------------
  describe("Suite 3: Intent 1 ('starter_slots') Interactive Semantics", () => {
    it("TS3.01: renders interactive spots with role='button' and tabindex='0'", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="soccer-5v5-diamond"
          selectedPitchSlots={[{ pitchIndex: 1, position: "def" }]}
          benchCount={0}
        />
      );

      expect(html).toContain('role="button"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain("?");
    });

    it("TS3.02: renders bench dots with icon ⇄ when benchCount > 0", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="soccer-5v5-diamond"
          selectedPitchSlots={[]}
          benchCount={2}
          rotationRule="Rotación activa continua"
        />
      );

      expect(html).toContain("⇄");
      expect(html).toContain("BANQUILLO");
    });
  });

  // --------------------------------------------------------------------------
  // Suite 4: Intent 2 ("bench_only") Hero Bench & Locked Pitch
  // --------------------------------------------------------------------------
  describe("Suite 4: Intent 2 ('bench_only')", () => {
    it("TS4.01: locks pitch spots (non-interactive) and highlights bench rotation", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="bench_only"
          formationId="soccer-5v5-diamond"
          selectedPitchSlots={[]}
          benchCount={2}
          rotationRule="Cambios cada 15 min"
        />
      );

      // Pitch spots should not have role="button" or tabindex="0"
      expect(html).not.toContain('aria-pressed=');
      expect(html).toContain("Titulares completos");
      expect(html).toContain("Cambios cada 15 min");
    });
  });

  // --------------------------------------------------------------------------
  // Suite 5: Intent 3 ("challenge") Dual Confrontation & Modes
  // --------------------------------------------------------------------------
  describe("Suite 5: Intent 3 ('challenge')", () => {
    it("TS5.01: renders Side A host team name and Side B rival slots for Volleyball 6v6", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="voleibol"
          format="6v6"
          intent="challenge"
          formationId="volleyball-6v6-5-1"
          selectedPitchSlots={[]}
          benchCount={0}
          hostTeamName="Halcones VC"
          challengeModeType="open_slots"
        />
      );

      expect(html).toContain("Halcones VC");
      expect(html).toContain("Lado B");
      // Side B should have 6 spots
      const sideBMatches = html.match(/is-side-b/g) || [];
      expect(sideBMatches.length).toBeGreaterThanOrEqual(6);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 7: Touch Target Dimensions (WCAG 2.5.8)
  // --------------------------------------------------------------------------
  describe("Suite 7: Touch Target Dimensions (WCAG 2.5.8)", () => {
    it("TS7.01: verifies presence of concentric touch hitbox circle with r >= 12 (>=24px)", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="soccer-5v5-diamond"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      // Must contain transparent hit circle with radius >= 12 (diameter >= 24px)
      expect(html).toMatch(/<circle[^>]+r="(?:1[2-9]|2[0-9])"[^>]+fill="transparent"/);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 9: Color Contrast Mathematical Invariants
  // --------------------------------------------------------------------------
  describe("Suite 9: Color Contrast Mathematical Invariants", () => {
    function lum(r: number, g: number, b: number) {
      const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
    function ratio(l1: number, l2: number) {
      const max = Math.max(l1, l2);
      const min = Math.min(l1, l2);
      return (max + 0.05) / (min + 0.05);
    }

    it("TS9.01: Chalk (#d9f2a5) on Turf (#0c6b4c) exceeds 4.5:1", () => {
      const lChalk = lum(0xd9, 0xf2, 0xa5);
      const lTurf = lum(0x0c, 0x6b, 0x4c);
      expect(ratio(lChalk, lTurf)).toBeGreaterThanOrEqual(4.5);
    });

    it("TS9.02: Flood (#ffd25a) focus ring on Turf (#0c6b4c) exceeds 3.0:1", () => {
      const lFlood = lum(0xff, 0xd2, 0x5a);
      const lTurf = lum(0x0c, 0x6b, 0x4c);
      expect(ratio(lFlood, lTurf)).toBeGreaterThanOrEqual(3.0);
    });

    it("TS9.03: Ink (#10231c) text on Flood (#ffd25a) spot exceeds 7.0:1 (AAA)", () => {
      const lInk = lum(0x10, 0x23, 0x1c);
      const lFlood = lum(0xff, 0xd2, 0x5a);
      expect(ratio(lInk, lFlood)).toBeGreaterThanOrEqual(7.0);
    });
  });
});
```

---

## 10. Summary Checklist for Worker M2

- [ ] Implement `components/LiveMatchBoard.tsx` respecting `LiveMatchBoardProps`.
- [ ] Ensure SVG viewBox is `0 0 360 220` with midline at $X=180$.
- [ ] Implement `role="region"`, `aria-label`, and dynamic `<figcaption id="live-board-caption">`.
- [ ] Wrap every interactive spot with `<g role="button" tabindex="0" aria-pressed={open}>` and concentric hitbox `<circle r="22" fill="transparent" />`.
- [ ] Handle `Enter` and `Space` in `onKeyDown` with `e.preventDefault()`.
- [ ] Include `:focus-visible` styling using `--flood` focus ring ($\ge 4.5:1$ contrast).
- [ ] Include `role="status"` live region with debounced announcements.
- [ ] Lock pitch spots in Intent 2 (Solo Banca) and highlight bench row ($Y=192..214$).
- [ ] Render dual confrontation in Intent 3 (Reto Rival) with Side B rival count.
- [ ] Deploy test suite `components/LiveMatchBoard.test.tsx` and verify 100% pass via `npx vitest run components/LiveMatchBoard.test.tsx`.
