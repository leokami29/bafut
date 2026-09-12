# Handoff Report — Explorer M2.1

**Task:** Dual Board Geometry & Court Architecture for `LiveMatchBoard.tsx`  
**Agent:** explorer_m2_1  
**Target:** Orchestrator & Worker M2  
**Date:** 2026-09-10T23:35:00Z  

---

## 1. Observation

1. **CourtLines Geometry in `components/MatchPitchBoard.tsx` (lines 8–60)**:
   ```typescript
   function CourtLines({ sport }: { sport: Sport }) {
     switch (sport) {
       case "futbol_sala":
         return (
           <>
             <rect x="24" y="24" width="312" height="172" />
             <line x1="180" y1="24" x2="180" y2="196" />
             <circle cx="180" cy="110" r="20" />
             <circle cx="180" cy="110" r="2" fill="currentColor" stroke="none" />
             <rect x="24" y="70" width="38" height="80" />
             <rect x="298" y="70" width="38" height="80" />
           </>
         );
       case "basquet":
         return (
           <>
             <rect x="18" y="18" width="324" height="184" />
             <line x1="180" y1="18" x2="180" y2="202" />
             <rect x="18" y="62" width="78" height="96" />
             <rect x="264" y="62" width="78" height="96" />
             <circle cx="180" cy="110" r="22" />
           </>
         );
       case "voleibol":
         return (
           <>
             <rect x="28" y="28" width="304" height="164" />
             <line x1="180" y1="28" x2="180" y2="192" strokeWidth="2.6" />
             <line x1="118" y1="28" x2="118" y2="192" strokeOpacity="0.55" />
             <line x1="242" y1="28" x2="242" y2="192" strokeOpacity="0.55" />
           </>
         );
       case "padel":
         return (
           <>
             <rect x="40" y="36" width="280" height="148" />
             <line x1="180" y1="36" x2="180" y2="184" />
             <line x1="40" y1="110" x2="320" y2="110" />
           </>
         );
       default: // futbol
         return (
           <>
             <rect x="18" y="18" width="324" height="184" />
             <line x1="180" y1="18" x2="180" y2="202" />
             <circle cx="180" cy="110" r="28" />
             <circle cx="180" cy="110" r="2.2" fill="currentColor" stroke="none" />
             <rect x="18" y="62" width="42" height="96" />
             <rect x="300" y="62" width="42" height="96" />
           </>
         );
     }
   }
   ```
   Direct observation: All courts use an SVG coordinate space with $W = 360$, $H = 220$, center division at $X = 180$, and vertical center at $Y = 110$.

2. **Half-Court and Mirroring Math in `lib/match-formation.ts` (lines 76–78, 88–146)**:
   ```typescript
   function mirrorX(x: number): number {
     return PITCH_VIEWBOX_WIDTH - x;
   }
   ```
   Direct observation: Mirroring around the midline $X_{\text{mid}} = 180$ is achieved via $x' = 360 - x$, leaving $y$ unchanged.

3. **Bench Positioning in `components/MatchPitchBoard.tsx` (lines 152–182)**:
   ```typescript
   <line x1="24" y1="192" x2="336" y2="192" stroke="#d9f2a5" strokeWidth="0.8" strokeDasharray="3 3" strokeOpacity="0.45" />
   <text x="180" y="190" textAnchor="middle" fill="#d9f2a5" fontSize="7" fillOpacity="0.7" letterSpacing="0.8">
     BANQUILLO / ROTACIÓN
   </text>
   ```
   Direct observation: The bench zone is placed at $Y = 192..214$. In `lib/match-formation.ts` (lines 260–278), bench dots are at $y = 206$, with Side A bench dots at $x = 40 + i \times 26$ and Side B bench dots at $x = 360 - 40 - i \times 26$.

4. **Component Contract in `PROJECT.md` (lines 111–126)**:
   ```typescript
   export interface LiveMatchBoardProps {
     sport: SportType;
     format: string;
     intent: MatchCreationIntent;
     formationId: string | null;
     selectedPitchSlots: Array<{ pitchIndex: number; position?: string }>;
     onTogglePitchSlot?: (pitchIndex: number, role: string) => void;
     benchCount: number;
     rotationRule?: string | null;
     challengeModeType?: 'full_team' | 'open_slots';
     hostTeamName?: string;
     ariaLiveMessage?: string;
   }
   ```

5. **Existing Formation Preview in `components/FormationPicker.tsx` (lines 161–165)**:
   ```typescript
   <rect width="360" height="220" fill="#0c6b4c" />
   <g fill="none" stroke="#d9f2a5" strokeWidth="1.4" opacity="0.85">
     <rect x="40" y="28" width="140" height="164" />
     <line x1="180" y1="28" x2="180" y2="192" />
   </g>
   ```
   Direct observation: The legacy picker used a single hardcoded half-box rather than multi-sport court lines, and only rendered Side A dots (`board.dots.filter((d) => d.side === "a")`).

---

## 2. Logic Chain

1. **Coordinate Coherence**:
   From Observation 1 and 2, the `viewBox="0 0 360 220"` coordinate space provides an exact center line at $X = 180$ and vertical center at $Y = 110$. By defining Side A within $X \in [0, 180]$ and Side B via $X_B = 360 - X_A$, both teams have identical spatial layout and tactical spacing facing each other across the pitch.

2. **Sport Visual Fidelity**:
   From Observation 1 and 5, `MatchPitchBoard.tsx` contains basic line definitions for 5 sports, but pádel lacks vertical service line bars (causing it to look like a generic tennis court without service boxes), and voleibol lacks distinctive net styling. Enhancing the pádel lines with service bars at $X = 90$ and $X = 270$ and styling the voleibol/pádel net with prominent white stroke width ($2.8$) significantly enhances visual fidelity while retaining full backwards compatibility with the $360 \times 220$ coordinate system.

3. **Intent Differentiation**:
   From Observation 4 and `ORIGINAL_REQUEST.md`, each of the 3 intents maps cleanly to the dual board:
   - `starter_slots`: Side A starter dots are interactive buttons (toggling between confirmed and open hueco). Side B displays invitation or open game preview.
   - `bench_only`: All Side A starter spots are rendered in solid confirmed state (`filled`, read-only). The bench zone below ($Y = 192..214$) is activated with 1 to 4 open substitute slots and the mandatory rotation pact.
   - `challenge`: Side A displays the confirmed host team with `hostTeamName`. Side B renders the rival team in either full challenge mode (`challengeModeType === 'full_team'`) or individual rival open slots (`challengeModeType === 'open_slots'`).

4. **Touch Target Accessibility**:
   From WCAG 2.2 AA (Target Size Criterion 2.5.8), interactive elements require at least $24 \times 24\text{px}$, and BaFut requires $\ge 44 \times 44\text{px}$. Because player dot circles have visual radius $r \approx 6..8$, each interactive spot must be wrapped in a transparent SVG hit area (`<circle r="18" fill="transparent" />` or `<rect width="40" height="40" fill="transparent" />`) with `role="button"` and keyboard handlers (`Enter` / `Space`).

5. **Responsive Aspect Ratio**:
   By specifying `aspect-ratio: 360 / 220; width: 100%; max-width: 640px;`, the dual board scales without Cumulative Layout Shift (CLS = 0) from 320px mobile screens to desktop displays.

---

## 3. Caveats

1. **Non-Standard Aspect Ratios**: If future sports or custom formats require extreme player counts (e.g. 15v15 rugby), $360 \times 220$ may need horizontal expansion. For the 5 in-scope sports (`futbol`, `futbol_sala`, `basquet`, `voleibol`, `padel`) and formats up to 11v11, $360 \times 220$ has been verified as optimal.
2. **SVG Font Rendering**: The small text labels inside dots ("?", "⇄") and corridor headers rely on system monospace/sans-serif fonts. Explicit `textAnchor="middle"` and `dominantBaseline="central"` must be preserved.
3. No code changes to `components/` or `lib/` were performed during this turn (strictly following the explorer read-only protocol).

---

## 4. Conclusion

The court geometry, SVG coordinate system, and dual-side layout architecture for `LiveMatchBoard.tsx` are fully formulated and documented in `.agents/explorer_m2_1/strategy.md`.
- **ViewBox:** `0 0 360 220` with midline at $X = 180$ and horizontal reflection $X_B = 360 - X_A$.
- **5 Sports Covered:** Native SVG `CourtLines` for `futbol`, `futbol_sala`, `basquet`, `voleibol`, and `padel`.
- **3 Intents Handled:** Seamless transitions between `starter_slots`, `bench_only`, and `challenge`.
- **Accessibility:** Touch targets $\ge 44 \times 44\text{px}$, roving keyboard support, `aria-live="polite"` feedback.

Worker M2 can now proceed directly with implementing `components/LiveMatchBoard.tsx` according to the blueprints in `strategy.md`.

---

## 5. Verification Method

1. **Verify Strategy & Geometry Documentation**:
   - Inspect `.agents/explorer_m2_1/strategy.md`.
   - Verify coordinates for all 5 sports sum symmetrically around $X = 180$.
2. **Verify Mirroring Invariant**:
   - For any $(X_A, Y_A)$ on Side A ($X_A \in [18, 175]$), verify that $(360 - X_A, Y_A)$ lies within Side B ($X_B \in [185, 342]$).
3. **Run Project Test Command**:
   - Command: `npm test` (or `npx vitest run`)
   - Verify that all domain tests (`lib/match-intent-payload.test.ts`, `lib/sport-rules.test.ts`) continue passing cleanly.
