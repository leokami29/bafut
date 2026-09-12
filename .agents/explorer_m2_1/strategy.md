# Live Tactical Dual Board (`LiveMatchBoard.tsx`) — Geometry & Architecture Strategy

**Document Version:** 1.0.0  
**Author:** explorer_m2_1 (Dual Board Geometry & Court Architecture Explorer)  
**Target Milestone:** M2 (Live Tactical Dual Board Component)  
**Status:** Approved for Implementation  

---

## 1. Executive Summary & Architectural Vision

The `LiveMatchBoard.tsx` component is the visual centerpiece of the BaFut match creation and slot ("hueco") configuration flow. It replaces static, disconnected previews with an interactive, intent-driven tactical board that renders both halves of the playing field simultaneously:
- **Lado A (Left / Anfitrión):** Renders host team composition with clear visual differentiation between confirmed starters, open tactical starter spots ("huecos"), and bench substitutes with their mandatory rotation pact.
- **Lado B (Right / Rival):** Renders rival team composition according to the selected intent (preview/open in pickup mode; complete rival team or open rival slots in challenge mode).
- **Multi-Sport Geometry:** Native SVG line markings for 5 sports (fútbol, fútbol sala, básquet, vóley, pádel).
- **Dual-Side Coordinate Symmetry:** Mathematical reflection around the central dividing line / net ($x = 180$).
- **WCAG 2.2 AA Compliance:** Generous touch targets ($\ge 44 \times 44\text{px}$), keyboard accessible spots (`Enter` / `Space`), text contrast $\ge 4.5:1$, and dynamic screen reader announcements (`aria-live="polite"`).

---

## 2. Multi-Sport Court Lines Geometry

All court drawings operate within the standard BaFut SVG coordinate system:
$$\text{viewBox} = [0, 0, 360, 220]$$
- Width: $W = 360$
- Height: $H = 220$
- Center X (Midline / Net): $X_{\text{mid}} = 180$
- Center Y (Vertical axis of symmetry): $Y_{\text{mid}} = 110$

### 2.1 Turf & Pitch Canvas
- **Background Gradient:** Linear gradient from `#0a5c41` (top-left) through `#0c6b4c` (mid) to `#084a35` (bottom-right).
- **Line Stroke Color:** `#d9f2a5` (high-contrast chalk lime, contrast ratio $> 5.8:1$ against turf).
- **Line Stroke Width:** `1.5` for standard boundary lines; `2.6` to `2.8` for nets.

---

### 2.2 Sport-by-Sport Court Specifications

```
                       X = 180 (Midline / Net)
        ◄──────── Lado A (Host) ────────►◄──────── Lado B (Rival) ───────►
   0 ┌───────────────────────────────────┬───────────────────────────────────┐ 360
     │   ┌───────────────────────────┐   │   ┌───────────────────────────┐   │
     │   │ [GK A]                    │   │   │                    [GK B] │   │
     │   │                           │ ( O ) │                           │   │
     │   │        Side A Lines       │   │   │        Side B Lines       │   │
     │   │                           │   │   │                           │   │
     │   └───────────────────────────┘   │   └───────────────────────────┘   │
 192 ├ - - - - - - - - - - - - - - - - - ┼ - - - - - - - - - - - - - - - - - ┤
     │  [⇄ Bench A: 1-4]                 │              [⇄ Bench B: 1-4]     │
 220 └───────────────────────────────────┴───────────────────────────────────┘
```

#### 1. Fútbol (Soccer: 5v5, 6v6, 7v7, 8v8, 11v11)
- **Outer boundary:** `<rect x="18" y="18" width="324" height="184" rx="2" fill="none" stroke="#d9f2a5" strokeWidth="1.5" />`
- **Halfway line:** `<line x1="180" y1="18" x2="180" y2="202" stroke="#d9f2a5" strokeWidth="1.5" />`
- **Center circle:** `<circle cx="180" cy="110" r="28" fill="none" stroke="#d9f2a5" strokeWidth="1.5" />`
- **Center spot:** `<circle cx="180" cy="110" r="2.2" fill="#d9f2a5" stroke="none" />`
- **Side A Penalty Box:** `<rect x="18" y="62" width="42" height="96" fill="none" stroke="#d9f2a5" strokeWidth="1.4" />`
- **Side B Penalty Box:** `<rect x="300" y="62" width="42" height="96" fill="none" stroke="#d9f2a5" strokeWidth="1.4" />`
  *(Note: $300 = 360 - 18 - 42$, exact reflection).*
- **Penalty spots (optional subtle):** Side A at `(50, 110)`, Side B at `(310, 110)`.

#### 2. Fútbol Sala (Futsal: 5v5)
- **Outer boundary:** `<rect x="24" y="24" width="312" height="172" rx="2" fill="none" stroke="#d9f2a5" strokeWidth="1.5" />`
- **Halfway line:** `<line x1="180" y1="24" x2="180" y2="196" stroke="#d9f2a5" strokeWidth="1.5" />`
- **Center circle:** `<circle cx="180" cy="110" r="20" fill="none" stroke="#d9f2a5" strokeWidth="1.5" />`
- **Center spot:** `<circle cx="180" cy="110" r="2.0" fill="#d9f2a5" stroke="none" />`
- **Side A Penalty Area (6m D-zone):** `<rect x="24" y="70" width="38" height="80" rx="14" fill="none" stroke="#d9f2a5" strokeWidth="1.4" />`
- **Side B Penalty Area (6m D-zone):** `<rect x="298" y="70" width="38" height="80" rx="14" fill="none" stroke="#d9f2a5" strokeWidth="1.4" />`
  *(Note: $298 = 360 - 24 - 38$, exact reflection).*
- **Second penalty spots (10m mark):** `(88, 110)` and `(272, 110)`.

#### 3. Básquet (Basketball: 3v3, 5v5)
- **Outer boundary:** `<rect x="18" y="18" width="324" height="184" rx="2" fill="none" stroke="#d9f2a5" strokeWidth="1.5" />`
- **Halfway line:** `<line x1="180" y1="18" x2="180" y2="202" stroke="#d9f2a5" strokeWidth="1.5" />`
- **Center circle:** `<circle cx="180" cy="110" r="22" fill="none" stroke="#d9f2a5" strokeWidth="1.5" />`
- **Side A Free-Throw Key (The Paint):** `<rect x="18" y="74" width="68" height="72" fill="none" stroke="#d9f2a5" strokeWidth="1.4" />`
- **Side B Free-Throw Key (The Paint):** `<rect x="274" y="74" width="68" height="72" fill="none" stroke="#d9f2a5" strokeWidth="1.4" />`
  *(Note: $274 = 360 - 18 - 68$, exact reflection).*
- **Free throw semi-circles:**
  - Side A: `<path d="M 86 88 A 22 22 0 0 1 86 132" fill="none" stroke="#d9f2a5" strokeWidth="1.4" />`
  - Side B: `<path d="M 274 88 A 22 22 0 0 0 274 132" fill="none" stroke="#d9f2a5" strokeWidth="1.4" />`
- **3-Point Arcs (Enhanced Recognition):**
  - Side A: `<path d="M 18 42 L 46 42 A 76 76 0 0 1 46 178 L 18 178" fill="none" stroke="#d9f2a5" strokeWidth="1.2" strokeOpacity="0.8" />`
  - Side B: `<path d="M 342 42 L 314 42 A 76 76 0 0 0 314 178 L 342 178" fill="none" stroke="#d9f2a5" strokeWidth="1.2" strokeOpacity="0.8" />`

#### 4. Voleibol (Volleyball: 2v2, 6v6)
- **Outer boundary:** `<rect x="28" y="28" width="304" height="164" rx="1" fill="none" stroke="#d9f2a5" strokeWidth="1.5" />`
- **The Net (Dividing Line):** `<line x1="180" y1="26" x2="180" y2="194" stroke="#ffffff" strokeWidth="2.8" />`
  - Visual Net Cable / Mesh indicator: Distinct bright white central bar with antenna accents at top `(180, 24)` and bottom `(180, 196)`.
- **Side A Attack Line (3m line / Zona de ataque):** `<line x1="126" y1="28" x2="126" y2="192" stroke="#d9f2a5" strokeWidth="1.4" strokeDasharray="5 3" strokeOpacity="0.65" />`
- **Side B Attack Line (3m line / Zona de ataque):** `<line x1="234" y1="28" x2="234" y2="192" stroke="#d9f2a5" strokeWidth="1.4" strokeDasharray="5 3" strokeOpacity="0.65" />`
  *(Note: $180 - 126 = 54$; $234 - 180 = 54$, exact reflection).*

#### 5. Pádel (Padel: 2v2, 4v4)
- **Outer Glass / Fence boundary:** `<rect x="40" y="36" width="280" height="148" rx="2" fill="none" stroke="#d9f2a5" strokeWidth="1.8" />`
- **The Net:** `<line x1="180" y1="34" x2="180" y2="186" stroke="#ffffff" strokeWidth="2.8" />`
- **Longitudinal Center Service Line:** `<line x1="90" y1="110" x2="270" y2="110" stroke="#d9f2a5" strokeWidth="1.3" />`
- **Side A Service Line (Línea de servicio):** `<line x1="90" y1="36" x2="90" y2="184" stroke="#d9f2a5" strokeWidth="1.3" />`
- **Side B Service Line (Línea de servicio):** `<line x1="270" y1="36" x2="270" y2="184" stroke="#d9f2a5" strokeWidth="1.3" />`
  *(Note: $180 - 90 = 90$; $270 - 180 = 90$, creating the authentic 4 service boxes around the net).*

---

## 3. Dual Half-Court Coordinate Calculations & Mirroring

### 3.1 Mathematical Formulation of Base Dots (Lado A)
The coordinates for Side A players are generated deterministically from the sport rules and formation entry (`lines` array):
- $N_{\text{lines}} = \text{number of active outfield tactical lines}$
- For sports with Goalkeeper (`futbol`, `futbol_sala`), the goalkeeper is placed at $(X_{\text{gk}}, Y_{\text{mid}} = 110)$:
  - Fútbol: $X_{\text{gk}} = 46$
  - Futsal: $X_{\text{gk}} = 52$
  - Básquet / Vóley / Pádel: $X_{\text{gk}} = \text{none}$ (no goalkeeper).
- Outfield line distribution across $X$:
  $$X_{\text{line}}(k) = X_{\text{left}} + \frac{k}{N_{\text{lines}} - 1} (X_{\text{right}} - X_{\text{left}})$$
  - Fútbol: $X_{\text{left}} = 88, X_{\text{right}} = 168$
  - Futsal: $X_{\text{left}} = 95, X_{\text{right}} = 165$
  - Básquet: $X_{\text{left}} = 70, X_{\text{right}} = 155$
  - Vóley: Front line at $X = 150$, Back line at $X = 105$
  - Pádel: Front line at $X = 145$, Back line at $X = 100$
- Vertical player distribution within a tactical line of $M$ players:
  $$Y(j, M) = Y_{\text{top}} + \frac{j}{M - 1} (Y_{\text{bottom}} - Y_{\text{top}}) \quad \text{for } j \in [0, M-1]$$
  If $M = 1$, $Y(0, 1) = \frac{Y_{\text{top}} + Y_{\text{bottom}}}{2} = 110$.
  - Fútbol / Futsal / Básquet / Vóley: $Y_{\text{top}} = 52, Y_{\text{bottom}} = 168$
  - Pádel: $Y_{\text{top}} = 78, Y_{\text{bottom}} = 142$

### 3.2 Dual-Side Mirroring Formula (Lado B)
Every player on Side B is the exact horizontal reflection of the corresponding tactical position:
$$X_B = W_{\text{viewBox}} - X_A = 360 - X_A$$
$$Y_B = Y_A$$

**Preservation Invariants:**
1. $X_A < 180 \iff X_B > 180$. No player from Side A ever crosses the midline, and vice versa.
2. Distance to midline is strictly preserved: $|180 - X_A| = |X_B - 180|$.
3. Vertical lane alignment is preserved: Goalkeepers are both at $Y = 110$; left-wingers on Side A ($Y = 52$) mirror to right-wingers on Side B facing them ($Y = 52$).

### 3.3 Bench & Rotation Zone Coordinates
Below the court boundary ($Y > 188$), a dashed separation line and label delineate the substitution bench:
- **Dashed Corridor Line:** `<line x1="24" y1="192" x2="336" y2="192" stroke="#d9f2a5" strokeWidth="0.8" strokeDasharray="3 3" strokeOpacity="0.45" />`
- **Corridor Label:** `<text x="180" y="190" textAnchor="middle" fill="#d9f2a5" fontSize="7" letterSpacing="0.8">BANQUILLO / ROTACIÓN</text>`
- **Side A Bench Spots ($0 \le i < \text{benchCount}$):**
  $$X_{\text{benchA}}(i) = 40 + i \times 26, \quad Y_{\text{benchA}} = 206$$
  - $i=0 \implies X = 40$
  - $i=1 \implies X = 66$
  - $i=2 \implies X = 92$
  - $i=3 \implies X = 118$ (comfortably left of $X=180$).
- **Side B Bench Spots ($0 \le i < \text{benchCount}$):**
  $$X_{\text{benchB}}(i) = 360 - 40 - i \times 26, \quad Y_{\text{benchB}} = 206$$
  - $i=0 \implies X = 320$
  - $i=1 \implies X = 294$
  - $i=2 \implies X = 268$
  - $i=3 \implies X = 242$ (comfortably right of $X=180$).

---

## 4. Intent-Driven State Matrix

The visual presentation of Lado A and Lado B shifts deterministically based on `intent`:

| Intent | Lado A (Host) | Lado B (Rival) | Bench Zone | Interaction Behavior |
|---|---|---|---|---|
| **`starter_slots`** ("Completar mi Equipo Titular") | • Unselected spots = Confirmed Host (`filled`)<br>• Selected spots = Open Huecos (`open`, "?") | • Placeholder rival slots (`invite` or `ghost`)<br>• Subtitle: "Partido en armado / Rival por definir" | • Rendered if `benchCount > 0`<br>• Shows 1-4 substitute slots with `⇄` icon | • Clicking Lado A starter spots toggles hueco on/off<br>• Lado B is non-interactive |
| **`bench_only`** ("Solo Banca / Suplentes") | • All starter spots = 100% Confirmed Host (`filled`)<br>• Badge: "Titulares completos (externos)" | • Placeholder rival slots (`ghost`)<br>• Subtitle: "Rival por definir" | • Prominently highlighted<br>• Shows `benchCount` (1-4) open substitute huecos<br>• Displays active rotation pact | • Cancha starter spots are disabled/read-only with explanatory tooltip<br>• Focus is exclusively on bench rotation |
| **`challenge`** ("Reto a Equipo Rival") | • All starter spots = 100% Confirmed Host (`filled`)<br>• Labeled with `hostTeamName` | • **`full_team`:** All rival spots in challenge state (`rival_challenge`)<br>• **`open_slots`:** Rival spots open for free agents (`open`) | • Optional host/rival bench | • Clear dual header: `[Mi Equipo (A)] vs [Equipo Rival (B)]`<br>• Explicit rival count displayed |

### 4.1 Dot Visual States & Tokens

```css
/* Filled / Confirmed Player */
.match-pitch-spot.is-filled {
  fill: var(--flood, #00f0ff);
  stroke: #ffffff;
  stroke-width: 1.5;
}

/* Open Tactical Hueco */
.match-pitch-spot.is-open {
  fill: var(--bib, #ffd700);
  stroke: #ffffff;
  stroke-width: 2.2;
  filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.6));
}

/* Challenge Rival Slot */
.match-pitch-spot.is-rival-challenge {
  fill: #ff4d4d;
  stroke: #ffffff;
  stroke-width: 1.8;
}

/* Ghost / Placeholder */
.match-pitch-spot.is-ghost {
  fill: transparent;
  stroke: rgba(217, 242, 165, 0.45);
  stroke-dasharray: 2 2;
}

/* Bench Substitute */
.match-pitch-spot.is-bench {
  stroke-dasharray: 3 2;
}
```

---

## 5. Responsive Scaling & Accessibility (WCAG 2.2 AA)

### 5.1 Responsive Container Geometry
- **Aspect Ratio Locking:** `aspect-ratio: 360 / 220` prevents Cumulative Layout Shift (CLS = 0).
- **Fluid Width:** `width: 100%; max-width: 640px;` scales naturally from small mobile screens (320px) up to desktop.
- **High-DPI Vector Rendering:** Native SVG vectors ensure pixel-crisp rendering on 2x/3x mobile displays.

### 5.2 WCAG 2.2 AA Touch Target Size ($\ge 44 \times 44\text{px}$)
While the visual player dot has radius $r \in [5.5, 9]\text{px}$, every interactive spot is wrapped in a transparent bounding target:
```tsx
<g
  role="button"
  tabIndex={interactive ? 0 : -1}
  aria-label={getSpotAriaLabel(spot)}
  aria-pressed={spot.state === "open"}
  onClick={() => onTogglePitchSlot?.(spot.pitchIndex, spot.role)}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTogglePitchSlot?.(spot.pitchIndex, spot.role);
    }
  }}
  className="match-pitch-spot-target"
>
  {/* Invisible touch target guaranteeing minimum 44x44px hitbox */}
  <circle cx={spot.x} cy={spot.y} r={18} fill="transparent" />
  
  {/* Visible styled spot */}
  <circle cx={spot.x} cy={spot.y} r={spot.state === "open" ? 8 : 6} className={`match-pitch-spot is-${spot.state}`} />
  
  {/* Mark: ? for open, ⇄ for bench */}
  {spot.mark && <text x={spot.x} y={spot.y} className="match-pitch-spot-mark">{spot.mark}</text>}
</g>
```

### 5.3 Live Region Announcements (`aria-live="polite"`)
When a user toggles an open slot or switches an intent, a polite dynamic announcement is made:
- E.g.: `"Hueco titular 3 marcado como abierto. Rol sugerido: Mediocampista."`
- E.g.: `"Modo Solo Banca seleccionado. Titulares completos. 2 suplentes en rotación."`

---

## 6. Format Caption & Contextual Helper

To provide immediate cognitive clarity, a pure pedagogical caption helper is formulated:

```typescript
export function getFormatCaption(sport: Sport, format: string, formationLabel?: string): {
  headline: string;
  detail: string;
  perSide: number;
} {
  const perSide = playersPerSideFromFormat(format);
  
  switch (sport) {
    case "voleibol":
      return {
        headline: `Vóley ${format}: ${perSide} titulares por lado`,
        detail: format === "6v6" 
          ? "3 en zona de red (ataque) y 3 en zona zaguero (defensa)" 
          : "2 jugadores en cancha en cobertura paralela o diagonal",
        perSide,
      };
    case "basquet":
      return {
        headline: `Básquet ${format}: ${perSide} jugadores por lado`,
        detail: format === "3v3" 
          ? "Media cancha con posesión alternada" 
          : "Cancha completa con quinteto titular",
        perSide,
      };
    case "padel":
      return {
        headline: `Pádel ${format}: ${perSide} jugadores por lado`,
        detail: format === "2v2" 
          ? "Pareja clásica (jugador de Drive + jugador de Revés)" 
          : "4 jugadores en modalidad americana / equipos",
        perSide,
      };
    case "futbol_sala":
      return {
        headline: `Futsal ${format}: 5 titulares por lado`,
        detail: "1 arquero + 4 jugadores de campo (cierre, alas y pivot)",
        perSide: 5,
      };
    case "futbol":
    default: {
      const outfield = perSide - 1;
      return {
        headline: `Fútbol ${format}: ${perSide} titulares por lado`,
        detail: `1 arquero + ${outfield} jugadores de campo${formationLabel ? ` (dibujo táctico ${formationLabel})` : ""}`,
        perSide,
      };
    }
  }
}
```

---

## 7. Implementation Blueprint for Worker M2

The implementing worker should structure `components/LiveMatchBoard.tsx` as follows:

```
components/
└── LiveMatchBoard.tsx
    ├── interface LiveMatchBoardProps
    ├── function CourtLines({ sport }: { sport: Sport })
    ├── function PitchSpot({ dot, onToggle, interactive }: SpotProps)
    ├── function BenchCorridor({ benchA, benchB, rotationRule }: BenchProps)
    ├── function BoardHeader({ intent, hostTeamName, sport, format }: HeaderProps)
    └── function BoardCaption({ sport, format, formationLabel, openA, openB }: CaptionProps)
```

**Testing & Verification Criteria for Worker M2:**
1. Component renders clean SVG without errors for all 5 sports (`futbol`, `futbol_sala`, `basquet`, `voleibol`, `padel`).
2. Symmetrical horizontal reflection ($X_B = 360 - X_A$) verified for all tactical spots.
3. Full keyboard navigation (`Tab`, `Enter`, `Space`) operational on Lado A spots under `intent: 'starter_slots'`.
4. Read-only starter spots enforced under `intent: 'bench_only'`.
5. Prominent rival team display verified under `intent: 'challenge'`.
6. Automated Vitest suite in `components/LiveMatchBoard.test.tsx` verifying render, intent switching, and touch targets.
