# Live Tactical Dual Board Strategy & Spot Representation Specification
**Document ID:** STRAT-BAFUT-M2-LIVE-BOARD  
**Date:** 2026-09-10  
**Author:** explorer_m2_2 (Board State & Spot Representation Explorer)  
**Target Milestone:** M2 (`components/LiveMatchBoard.tsx`)  
**Scope:** Interactive Spot Representation, Visual States across 3 Intents, Touch Target Ergonomics (WCAG 2.5.5 / 2.5.8), Bench Rotation Row, and Custom Vector SVG Iconography.

---

## 1. Executive Design Blueprint

The `LiveMatchBoard` is the real-time tactical anchor of BaFut's match creation workflow. Unlike legacy pitch diagrams that merely decorated the page, the new Live Board functions as an **accessible, intent-driven tactical instrument**:

```
+---------------------------------------------------------------------------------------+
|  LIVE MATCH BOARD · FÚTBOL 5v5 (DIAMANTE 1-2-1)                                      |
|                                                                                       |
|  [ LADO A: MI EQUIPO (ANFITRIÓN) ]                  [ LADO B: EQUIPO RIVAL ]         |
|  3 Confirmados · 2 Cupos Abiertos                    Esperando Reto (5 en bloque)     |
|  +-------------------------------------+  +----------------------------------------+  |
|  |           [#1 ARQ (Confirmado)]     |  |                                        |  |
|  |   [#2 DEF (Open ?)]                 |  |       +------------------------+       |  |
|  |           [#3 VOL (Open ?)]         |VS|       |   [⚔️ SQUAD CREST]     |       |  |
|  |   [#4 DEL (Confirmado)]             |  |       |   RIVAL COMPLETO       |       |  |
|  |           [#5 DEL (Confirmado)]     |  |       |   5 Jugadores          |       |  |
|  |                                     |  |       +------------------------+       |  |
|  +-------------------------------------+  +----------------------------------------+  |
|  - - - - - - - - - - - - - BANCA Y PACTO DE ROTACIÓN - - - - - - - - - - - - - - - -  |
|  [⇄ Suplente 1]  [⇄ Suplente 2]       Pacto Activo: "Rotación activa continua"        |
|                                                                                       |
|  Dual-Modality Touch Action Bar (>= 44x44px Target Size):                             |
|  [#1 ARQ: Listo] [#2 DEF: Cupo Abierto (?)] [#3 VOL: Cupo Abierto (?)] [#4 DEL: Listo]|
+---------------------------------------------------------------------------------------+
```

### Core Architecture Principles:
1. **Didactic Intent Transparency (R1 & R2):** The board instantly reflects the selected intent (`starter_slots`, `bench_only`, `challenge`) without page reloads or ambiguity.
2. **Ergonomic Touch Targets (WCAG 2.5.5 & 2.5.8):** Minimum $44\times 44\text{px}$ hit bounding box for every interactive spot, backed by a dual-modality pill action bar.
3. **Inclusive Non-Color Differentiation (WCAG 1.4.1):** State is never conveyed by color alone. Every spot combines color, geometry (circle vs diamond vs shield vs capsule), stroke style (solid vs dashed vs dotted), and micro-icon/text badge.
4. **Clean SVG Vector Icons (No Standalone Emojis):** 100% inline SVG iconography marked with `aria-hidden="true"` and paired with semantic text or `.sr-only` descriptions.

---

## 2. Interactive Spot Taxonomy & Visual States

The tactical spot (`TacticalSpot`) is parameterized by:
- **`side`**: `'a'` (Host) | `'b'` (Rival)
- **`role`**: `'starter'` | `'bench'`
- **`state`**: `'confirmed'` | `'open'` | `'ghost'` | `'squad_block'`
- **`position`**: Tactical role from catalog (`gk`, `def`, `mid`, `fwd`, etc.)
- **`pitchIndex`**: Numeric identifier on court (0..15) or null for bench

### 2.1 Visual Differentiation Matrix

| Spot State | Side | Role | Visual Geometry | Fill Color | Border / Stroke | Glyphs / Badges | Semantics & User Mental Model |
|---|---|---|---|---|---|---|---|
| **Confirmed Starter** | Side A | `starter` | Circle ($r = 9\text{px}$) | `--chalk` (`#d9f2a5`) | Solid 1.5px `--turf-deep` (`#073828`) | Player number (e.g. `1`) or role abbreviation (`DEF`), dark ink (`#073828`) | Teammate confirmed offline (creator or friends). High contrast 8.12:1. |
| **Open Starter Hole** | Side A | `starter` | Circle ($r = 11\text{px}$) | `rgba(217, 242, 165, 0.22)` | Dashed 2px `--flood` (`#ffd25a`) with animated stroke-dashoffset | Bold Question Mark `?` or `+` in `--flood` (`#ffd25a`) + floating role pill | Missing starter hole to recruit in the app. Pulsing alert state. |
| **Complete / Ghost** | Side A | `starter` | Circle ($r = 8\text{px}$) | Transparent | Dashed 1.2px `rgba(217, 242, 165, 0.35)` | Muted position dot | Reference spot or locked starter in Intent 2 ("Solo Banca"). |
| **Bench Substitute** | Side A | `bench` | Capsule / Pill ($26\times 18\text{px}$ or circle $r = 9\text{px}$) | `rgba(255, 210, 90, 0.25)` | Dotted 2px `--flood` (`#ffd25a`) | Bidirectional swap arrows icon (`⇄`) in `#ffd25a` | Active rotation substitute. Displays rotation pact badge. |
| **Rival Squad Crest** | Side B | `starter` | Tactical Shield ($80\times 80\text{px}$) | `rgba(196, 42, 22, 0.18)` | Solid 2px `--bib` (`#c42a16`) + double border | Crossed swords vector icon + "RIVAL COMPLETO ({N})" | Intent 3 `full_team` mode: challenger squad takes the side as a single unit. |
| **Open Rival Spot** | Side B | `starter` | Diamond / Octagon ($r = 10\text{px}$) | `rgba(196, 42, 22, 0.25)` | Dashed 2px `--bib` (`#c42a16`) | Micro swords icon or `B1`, `B2`... in `--bib-ink` (`#fff8f5`) | Intent 3 `open_slots` mode: individual free-agent slots for opponent side. |
| **Rival Bench** | Side B | `bench` | Capsule / Pill ($26\times 18\text{px}$) | `rgba(196, 42, 22, 0.20)` | Dotted 2px `--bib` (`#c42a16`) | Bidirectional swap arrows icon (`⇄`) in `#c42a16` | Rival team substitutes (optional challenge bench). |

---

## 3. Behavior Across the 3 Creation Intents

### 3.1 Intent 1: "Completar mi Equipo Titular" (`starter_slots`)
- **Host Side A:** Fully interactive tactical field.
  - The creator can toggle any spot between **Confirmed Teammate** (solid chalk) and **Open Hole** (pulsing dashed gold with `?`).
  - Minimum 1 open starter hole; maximum `playersPerSideFromFormat(format)`.
  - When toggling an open hole, the suggested tactical role from the formation (e.g. `gk` at index 0, `def` at index 1) is automatically assigned.
- **Rival Side B:** Dimmed / "Modo equipo único".
  - Court lines remain visible to maintain tactical orientation.
  - Spots on Side B are hidden or rendered with a low-opacity watermark chip: *"Convocatoria de equipo único. Para jugar contra un rival, elige Reto a Rival."*
- **Bench Row:**
  - If `benchCount > 0`: Displays 1 to 4 substitute spots below the pitch divider with rotation arrows (`⇄`) and the active rotation pact label.
  - If `benchCount === 0`: Shows a clean "+ Sumar Suplentes" chip.

### 3.2 Intent 2: "Solo Banca / Suplentes" (`bench_only`)
- **Host Side A:** **Locked & Complete ("Titulares Listos por fuera")**.
  - All starter spots on Side A are rendered in solid chalk with a subtle checkmark badge.
  - None of the starter spots are clickable (zero holes in pitch).
  - Header displays: `"Titulares Completos (5/5 en cancha · Organizados por fuera de la app)"`.
- **Rival Side B:** Unconvoked / dimmed.
- **Bench Row:** **THE PRIMARY HERO ZONE OF THE BOARD**.
  - The bench area is highlighted with a glowing border container.
  - Renders 1 to 4 large interactive bench slots (`min-height: 48px`).
  - Prominent **Pacto de Rotación Activo** banner:
    `[ ⇄ PACTO DE ROTACIÓN: "Rotación activa continua" (Garantiza minutos a los suplentes) ]`.
  - Quick count stepper buttons `[-] [ 1 | 2 | 3 | 4 ] [+]` allowing instant substitute adjustments.

### 3.3 Intent 3: "Reto a Equipo Rival" (`challenge`)
- **Confrontation Layout:** `[Lado A: Anfitrión]` vs `[Lado B: Rival]`.
- **Center Divider:** Center line accented with an energetic `"VS"` badge at $(x = 180, y = 110)$.
- **Host Side A:** Displays `hostTeamName` (defaulting to creator's team or "Mi Equipo"), all starters confirmed.
- **Rival Side B Branching:**
  - **Branch 1: Reto a Equipo Completo (`challengeModeType === 'full_team'`)**:
    - Central Rival Shield Badge at $(x = 270, y = 110)$ with swords icon, badge label `"EQUIPO RIVAL EN BLOQUE"`, format capacity `{playersPerSideFromFormat(format)} jugadores`.
    - Ghost dots across Side B showing tactical formation spots that the rival squad will field.
  - **Branch 2: Cupos Abiertos para Rivales Libres (`challengeModeType === 'open_slots'`)**:
    - Renders $N = \text{playersPerSideFromFormat}(format)$ distinct open rival spots on Side B.
    - Each spot displays dashed `--bib` outline and role suggestions for free agents.
- **Bench Row:** Displays rival substitute slots (0 to 4) if the challenge includes bench players.

---

## 4. Touch Target Ergonomics (WCAG 2.5.5 / 2.5.8)

### 4.1 The Geometry Challenge
In SVG viewBox `0 0 360 220`, $1\text{px}$ in SVG coordinates translates to roughly $1\text{px}$ to $1.15\text{px}$ on standard smartphone viewports (360px–414px screen width).
Visual circles with radius $r = 7\text{px}$ to $11\text{px}$ ($14\text{px}$ to $22\text{px}$ diameter) fail WCAG 2.5.8 ($24\times 24\text{px}$ minimum) and WCAG 2.5.5 ($44\times 44\text{px}$ comfortable touch target).

### 4.2 Dual-Layer Spot Architecture
To guarantee absolute ergonomic compliance without distorting tactical proportions, every interactive spot uses a **Dual-Layer SVG Pattern**:

```tsx
<g
  className="tactical-spot"
  role="button"
  tabIndex={interactive ? 0 : -1}
  aria-label={`Puesto ${spot.pitchIndex + 1}: ${positionLabel[spot.position]}. Estado: ${spot.state === 'open' ? 'Cupo abierto' : 'Titular confirmado'}.`}
  onClick={() => interactive && onToggle(spot.pitchIndex)}
  onKeyDown={(e) => {
    if (interactive && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onToggle(spot.pitchIndex);
    }
  }}
>
  {/* LAYER 1: Invisible Expanded Touch Target (Guaranteed >= 44x44px) */}
  <circle
    cx={spot.x}
    cy={spot.y}
    r={calculatedHitRadius} // r=22px in 5v5/6v6 -> 44x44px bounding box
    fill="transparent"
    stroke="transparent"
    pointerEvents="all"
    className="tactical-spot-hitbox"
  />

  {/* LAYER 2: High-Contrast Focus Visible Ring (WCAG 2.4.7) */}
  <circle
    cx={spot.x}
    cy={spot.y}
    r={spot.state === 'open' ? 14 : 12}
    fill="none"
    className="tactical-spot-focus-ring"
  />

  {/* LAYER 3: Visual Tactical Circle */}
  <circle
    cx={spot.x}
    cy={spot.y}
    r={spot.state === 'open' ? 11 : 8.5}
    className={`tactical-spot-visual is-${spot.state}`}
  />

  {/* LAYER 4: State Glyph or Role Text */}
  {spot.state === 'open' ? (
    <text
      x={spot.x}
      y={spot.y}
      textAnchor="middle"
      dominantBaseline="central"
      className="tactical-spot-mark"
      pointerEvents="none"
    >
      ?
    </text>
  ) : (
    <text
      x={spot.x}
      y={spot.y}
      textAnchor="middle"
      dominantBaseline="central"
      className="tactical-spot-number"
      pointerEvents="none"
    >
      {spot.pitchIndex + 1}
    </text>
  )}
</g>
```

### 4.3 Density-Adaptive Hitbox Engine
When formations feature dense lines (e.g. Fútbol 11v11 with 5 midfielders between $y=52$ and $y=168$), vertical spacing between spots is $\Delta y \approx 29\text{px}$. A static $r=22\text{px}$ ($44\text{px}$ diameter) would overlap neighboring spots.
We calculate dynamic hit radius per column:
$$r_{\text{hit}} = \min(22, \max(16, \lfloor \frac{\Delta y_{\min}}{2} \rfloor - 1))$$

### 4.4 Dual-Modality Action Bar (Guaranteed 44px HTML Target)
In addition to tapping the SVG pitch spots, `LiveMatchBoard` renders a synchronized **Action Bar of Spot Chips** directly beneath the board:
```tsx
<div className="live-board-spot-chips" role="group" aria-label="Lista táctica de puestos">
  {boardSpots.map((spot) => (
    <button
      key={spot.pitchIndex}
      type="button"
      className={`spot-chip ${spot.isOpen ? 'is-open' : 'is-confirmed'}`}
      onClick={() => onTogglePitchSlot(spot.pitchIndex, spot.position)}
      style={{ minHeight: '44px', minWidth: '44px' }}
      aria-pressed={spot.isOpen}
    >
      <span className="spot-chip-badge">#{spot.pitchIndex + 1}</span>
      <span className="spot-chip-role">{positionLabel[spot.position]}</span>
      <span className="spot-chip-status">{spot.isOpen ? 'Cupo Abierto (?)' : 'Listo'}</span>
    </button>
  ))}
</div>
```
This guarantees that any user on any device can effortlessly operate every spot without requiring pixel-perfect finger precision.

---

## 5. Bench Rotation Row Architecture

The Bench Rotation Row is located at the lower section of the tactical pitch ($y = 192$ to $220$ in SVG, or adjacent container):

### 5.1 Geometry & Dimensions
- **Y-coordinate divider:** Horizontal dashed chalk line at $y = 192$ with text `"BANCA Y PACTO DE ROTACIÓN"`.
- **Substitute slots positioning:**
  - Side A Bench: $x = 42 + i \times 32$ ($i = 0..3$).
  - Side B Bench: $x = 318 - i \times 32$ ($i = 0..3$).
  - Center Y: $y = 206$.
- **Slot shape:** Rounded pill/capsule ($28\text{px}$ wide $\times 18\text{px}$ high, border-radius $9\text{px}$) or circle ($r=9\text{px}$).
- **Inner icon:** Custom vector rotation arrows `⇄` in `--flood` (`#ffd25a`).

### 5.2 Interactive Rotation Pact Badge
Adjacent to the bench spots, the component displays an interactive **Rotation Pact Badge**:
- **Badge Content:**
  - Vector SVG rotation loop icon.
  - Active rule title: e.g. `"Pacto: Rotación activa continua"`.
  - Tooltip/Explanation: *"Garantiza que todos los suplentes jueguen minutos equitativos."*
- **A11y Label:** `"Pacto de rotación activo: Rotación activa continua. Presiona para cambiar regla."`

---

## 6. Clean Vector SVG Iconography Catalog (Zero Emojis)

Every emoji in the legacy codebase is replaced by crisp, scalable, high-contrast SVG vector components:

### 6.1 Tactical Position Icons

#### Goalkeeper / Arquero (`gk`)
```tsx
export function IconGoalkeeper({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4m-2-2h4" />
    </svg>
  );
}
```

#### Defender / Cierre (`def`, `cierre`)
```tsx
export function IconDefender({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M8 11h8" />
    </svg>
  );
}
```

#### Midfielder / Ala / Escolta (`mid`, `ala`, `escolta`)
```tsx
export function IconMidfielder({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      <polygon points="12 2 22 12 12 22 2 12" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
```

#### Forward / Pivot (`fwd`, `pivot`, `opuesto`)
```tsx
export function IconForward({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="3" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="3" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="21" y2="12" />
    </svg>
  );
}
```

#### Volleyball Setter / Armador (`armador`)
```tsx
export function IconSetter({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      <path d="M12 2v20M17 5l-5-3-5 3M17 19l-5 3-5-3" />
    </svg>
  );
}
```

#### Padel Drive & Revés (`drive`, `reves`)
```tsx
export function IconPadelRacket({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      <circle cx="12" cy="9" r="6" />
      <circle cx="12" cy="9" r="2" fill="currentColor" stroke="none" />
      <path d="M12 15v7M9 22h6" />
    </svg>
  );
}
```

### 6.2 State & Feature Icons

#### Rotation Pact Interchange (`⇄`)
```tsx
export function IconRotationPact({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      <path d="M7 16V4m0 0L3 8m4-4l4 4m10 4v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}
```

#### Confrontation Swords (Intent 3 Challenge Mode)
```tsx
export function IconSwordsChallenge({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6M19 13l2 2-6 6-2-2" />
      <path d="M9.5 6.5L21 18v3h-3L6.5 9.5" />
      <path d="M11 5l-6 6M5 11l-2-2 6-6 2 2" />
    </svg>
  );
}
```

#### Team Complete Checkmark
```tsx
export function IconConfirmedCheck({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
```

---

## 7. Component Interface Contract (`LiveMatchBoardProps`)

```typescript
import type { Sport, Format, Position } from "@/lib/sport-rules";
import type { MatchCreationIntent, ChallengeModeType } from "@/lib/match-intent-payload";

export interface SelectedPitchSlot {
  pitchIndex: number;
  position?: Position | string;
  level?: string;
}

export interface LiveMatchBoardProps {
  sport: Sport;
  format: Format;
  intent: MatchCreationIntent;
  formationId: string | null;
  selectedPitchSlots: SelectedPitchSlot[];
  onTogglePitchSlot?: (pitchIndex: number, suggestedRole: Position) => void;
  benchCount: number;
  onBenchCountChange?: (count: number) => void;
  rotationRule?: string | null;
  onRotationRuleChange?: (rule: string) => void;
  challengeModeType?: ChallengeModeType;
  hostTeamName?: string;
  readOnly?: boolean;
  className?: string;
}
```

---

## 8. CSS Classes & Token Integration

To maintain consistency with `app/globals.css`, `app/styles/formation-pitch.css`, and `app/styles/formation-picker.css`, `LiveMatchBoard` utilizes the following verified token classes:

```css
/* Container */
.live-match-board {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

/* Spot Hitbox */
.tactical-spot-hitbox {
  cursor: pointer;
}
.tactical-spot.is-locked .tactical-spot-hitbox {
  cursor: default;
}

/* Focus Visible */
.tactical-spot:focus-visible .tactical-spot-focus-ring {
  stroke: var(--flood);
  stroke-width: 2.5px;
  stroke-dasharray: none;
}

/* Side A Confirmed */
.tactical-spot-visual.is-confirmed {
  fill: var(--chalk);
  stroke: var(--turf-deep);
  stroke-width: 1.5px;
}

/* Side A Open Hole */
.tactical-spot-visual.is-open {
  fill: color-mix(in oklab, var(--chalk) 22%, transparent);
  stroke: var(--flood);
  stroke-width: 2px;
  stroke-dasharray: 3 2;
  animation: pulse-border 1.8s ease-in-out infinite;
}

/* Side B Open Rival Spot */
.tactical-spot-visual.is-rival-open {
  fill: color-mix(in oklab, var(--bib) 25%, transparent);
  stroke: var(--bib);
  stroke-width: 2px;
  stroke-dasharray: 3 2;
}

/* Bench Spot */
.tactical-spot-visual.is-bench {
  fill: color-mix(in oklab, var(--flood) 25%, transparent);
  stroke: var(--flood);
  stroke-width: 2px;
  stroke-dasharray: 2 2;
}

/* Dual-Modality Action Bar */
.live-board-spot-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.spot-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  min-height: 44px;
  min-width: 44px;
  font-family: var(--font-mono), monospace;
  font-size: 0.85rem;
  background: color-mix(in oklab, var(--paper) 88%, var(--turf));
  border: 1.5px solid color-mix(in oklab, var(--turf) 30%, transparent);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.spot-chip.is-open {
  border-color: var(--flood);
  background: color-mix(in oklab, var(--flood) 18%, var(--paper));
}

.spot-chip:focus-visible {
  outline: 2px solid var(--flood);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .tactical-spot-visual.is-open {
    animation: none;
  }
}
```

---

## 9. Implementation Roadmap for Worker M2

Worker M2 can directly translate this blueprint into code by following these 4 structured phases:
1. **Phase 1: Component Scaffold & SVGs (`components/LiveMatchBoard.tsx`)**
   - Create `components/LiveMatchBoard.tsx` with export `LiveMatchBoard`.
   - Embed inline SVG icons (`IconGoalkeeper`, `IconDefender`, `IconMidfielder`, `IconForward`, `IconRotationPact`, `IconSwordsChallenge`, `IconConfirmedCheck`).
2. **Phase 2: Court Lines & Dual Half Math**
   - Reuse/refactor `CourtLines` for the 5 sports (`futbol`, `futbol_sala`, `basquet`, `voleibol`, `padel`).
   - Derive player spots for Side A via `baseDotsForHalf` from `lib/match-formation.ts`.
   - Mirror spots for Side B ($x_B = 360 - x_A$) when `challengeModeType === 'open_slots'`.
   - Render `RivalSquadBadge` centered at $(x = 270, y = 110)$ when `challengeModeType === 'full_team'`.
3. **Phase 3: Bench Rotation Row & Pact Display**
   - Render horizontal chalk separator line at $y = 192$.
   - Render 1 to 4 substitute spots below the divider line.
   - Render interactive Rotation Pact badge displaying the current rotation rule.
4. **Phase 4: Ergonomic Touch Targets & A11y Suite**
   - Embed $r = 22\text{px}$ invisible hit circles (`tactical-spot-hitbox`).
   - Implement synchronized below-pitch `.live-board-spot-chips` action bar (guaranteed $\ge 44\times 44\text{px}$).
   - Add keyboard event listeners (`Enter` / `Space` toggle), roving focus, and accessible figcaption summary.
   - Write comprehensive component tests in `components/LiveMatchBoard.test.tsx` verifying all 3 intents and touch target sizes.
