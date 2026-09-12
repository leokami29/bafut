# Handoff Report — Explorer M2.3

**Target:** Project Orchestrator (`orchestrator_1`) & Worker M2 (`worker_m2`)  
**From:** explorer_m2_3 (Board Accessibility & Testing Explorer)  
**Date:** 2026-09-10T23:37:00Z  
**Handoff Type:** Hard (Task Complete)  
**Deliverable Document:** `c:\EstudioALL\2026\BaFut\.agents\explorer_m2_3\strategy.md`  

---

## 1. Observation

1. **Accessibility Barriers in Legacy Formation Components (`components/FormationPicker.tsx:171–205`)**:
   ```tsx
   <circle
     cx={dot.x}
     cy={dot.y}
     r={open ? 11 : 8}
     className={open ? "formation-hole is-open" : "formation-hole"}
     role={interactive ? "button" : undefined}
     tabIndex={interactive ? 0 : undefined}
     onClick={interactive ? () => toggleHole(dot) : undefined}
     onKeyDown={
       interactive
         ? (e) => {
             if (e.key === "Enter" || e.key === " ") {
               e.preventDefault();
               toggleHole(dot);
             }
           }
         : undefined
     }
     style={{ cursor: interactive ? "pointer" : "default" }}
   />
   ```
   - **Direct Observation 1.1:** Missing `aria-label` or accessible name on interactive circles. Screen readers announce "button" with zero description of role or pitch location.
   - **Direct Observation 1.2:** Missing `aria-pressed` toggle state. Assistive technologies cannot determine whether a spot is currently selected or unselected.
   - **Direct Observation 1.3:** The target diameter is $16\text{px}$ to $22\text{px}$ ($r = 8\text{px}..11\text{px}$), violating WCAG 2.2 Success Criterion 2.5.8 (Target Size minimum $24 \times 24\text{px}$) and touch recommendations ($44 \times 44\text{px}$).
   - **Direct Observation 1.4:** Missing dynamic `aria-live` announcements upon toggling pitch spots.

2. **Design Tokens & Palette in `app/styles/tokens.css:1–13`**:
   ```css
   :root {
     --turf: #0c6b4c;
     --turf-deep: #073828;
     --chalk: #d9f2a5;
     --flood: #ffd25a;
     --bib: #c42a16;
     --bib-ink: #fff8f5;
     --ink: #10231c;
     --mist: #c8e6d4;
     --paper: #dff3e6;
     --line: rgba(217, 242, 165, 0.7);
   }
   ```
   Mathematical evaluation via relative luminance algorithm:
   - `--chalk` (`#d9f2a5`) on `--turf` (`#0c6b4c`): **5.33:1** (WCAG AA Pass $\ge 4.5:1$).
   - `--chalk` (`#d9f2a5`) on `--turf-deep` (`#073828`): **10.71:1** (WCAG AAA Pass $\ge 7:1$).
   - `--flood` (`#ffd25a`) focus ring on `--turf` (`#0c6b4c`): **4.54:1** (WCAG 2.2 Non-text Pass $\ge 3.0:1$).
   - `--flood` (`#ffd25a`) focus ring on `--turf-deep` (`#073828`): **9.11:1** (WCAG AAA Pass).
   - `--ink` (`#10231c`) on `--flood` (`#ffd25a`): **11.43:1** (WCAG AAA Pass $\ge 7:1$).
   - `--bib-ink` (`#fff8f5`) on `--bib` (`#c42a16`): **5.42:1** (WCAG AA Pass $\ge 4.5:1$).
   - ⚠️ Prohibited: `--chalk` on `--paper` is **1.05:1** (Extreme fail).
   - ⚠️ Prohibited: `--flood` on `white` is **1.44:1** (Extreme fail).
   - ⚠️ Prohibited: `white` text on `--flood` spot is **1.44:1** (Extreme fail).

3. **Vitest Execution Configuration (`vitest.config.ts:10–13`) & Dependencies (`package.json`)**:
   ```typescript
   test: {
     include: ["lib/**/*.test.ts", "app/**/*.test.ts", "creative-assets/**/*.test.ts"],
     environment: "node",
   }
   ```
   - **Direct Observation 3.1:** Neither `@testing-library/react`, `jsdom`, nor `happy-dom` are installed in `node_modules` (confirmed via node check: all returned `NO`).
   - **Direct Observation 3.2:** The test environment is `"node"`.
   - **Direct Observation 3.3:** `react-dom/server`'s `renderToStaticMarkup` and `renderToString` are natively supported in Node with React 19 (`react: 19.2.8`), enabling fast, deterministic server-side DOM and HTML string verification.

4. **Component Interface Contract in `PROJECT.md:113–126`**:
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

5. **Peer Explorer Findings**:
   - `explorer_m2_1`: Established $360 \times 220$ viewBox with $X_{\text{mid}} = 180$, horizontal reflection $X_B = 360 - X_A$, bench zone at $Y=192..214$, and native `CourtLines` for 5 sports.
   - `explorer_m2_2`: Established visual states for Side A vs Side B, bench row highlighting, replacement of emojis with SVG icons, and a dual-layer hitbox model.

---

## 2. Logic Chain

1. **From Observation 1 (Missing Names & Sub-24px Targets) to Semantic & Ergonomic Architecture:**
   - *Reasoning:* A clickable SVG circle without `aria-label` or `aria-pressed` cannot be operated by blind or low-vision users. A visual circle of radius $r = 8\text{px}$ ($16\text{px}$ diameter) violates WCAG 2.5.8 ($24 \times 24\text{px}$) and touch standards ($44 \times 44\text{px}$).
   - *Inference:* Every interactive pitch spot must be an SVG `<g role="button" tabindex="0" aria-pressed={open}>` pairing an explicit label (`aria-label="Puesto {N}: {role}, {estado}"`) with an invisible concentric `<circle r="22" fill="transparent" pointerEvents="all" />`. This satisfies WCAG 4.1.2, 1.3.1, and 2.5.8 without changing the aesthetic layout of the pitch lines.

2. **From Observation 1.4 to Live Announcements (`aria-live="polite"`):**
   - *Reasoning:* When a user clicks a pitch spot or changes intent, the DOM changes without page reload.
   - *Inference:* An assistive technology user requires immediate, non-disruptive feedback. A dedicated `<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">` with a 200ms debounce ensures that spot additions, removals, bench increments, and intent switches are voiced clearly.

3. **From Observation 2 to Color Contrast Guarantees (WCAG 1.4.3 & 1.4.11):**
   - *Reasoning:* Low contrast between markings and grass reduces legibility, and indistinct focus rings exclude keyboard-only users.
   - *Inference:* Using `--chalk` (`#d9f2a5`) on `--turf` (`#0c6b4c`) yields **5.33:1** (exceeds 4.5:1). Using `--flood` (`#ffd25a`) for `:focus-visible` outlines yields **4.54:1** on turf and **9.11:1** on deep turf (exceeds 3:1 non-text requirement). Inside spots, text must strictly be `--ink` on `--flood` (**11.43:1**) and `--bib-ink` on `--bib` (**5.42:1**). Low-contrast traps (`--chalk` on white or paper, white on `--flood`) are explicitly banned.

4. **From Observation 3 to Node/Server-Side Test Architecture for Vitest:**
   - *Reasoning:* The project runs Vitest in `"node"` environment without `@testing-library/react` or a browser DOM emulator.
   - *Inference:* `components/LiveMatchBoard.test.tsx` should use `react-dom/server`'s `renderToStaticMarkup` to render components into string markup, combined with standard Vitest assertions. This ensures instantaneous, reliable test execution within the existing pipeline without introducing heavy headless browser dependencies.

5. **From Intent Requirements (R1) to Keyboard Focus Control:**
   - *Reasoning:* In Intent 2 (Solo Banca) and Intent 3 (Reto Rival), starting players are confirmed offline. Tabbing through 11 static dots on an 11v11 match creates severe keyboard fatigue.
   - *Inference:* Only spots in Intent 1 (where the user needs to select holes) receive `tabindex="0"`. In Intents 2 and 3, pitch spots are static (`tabindex="-1"`), immediately routing keyboard focus to the Bench Row or opponent inputs.

---

## 3. Caveats

1. **Non-GUI Screen Readers in CI:** Automated unit tests evaluate the rendered DOM attributes (`role`, `aria-label`, `aria-live`, `aria-pressed`, `tabindex`) and contrast formulas. End-to-end screen reader testing (NVDA on Windows, VoiceOver on macOS) must be confirmed during Milestone M4 testing.
2. **Dense Formations (11v11):** In 11v11 formations, vertical spot spacing $\Delta y \approx 29\text{px}$. The dynamic hitbox calculation drops radius from $22\text{px}$ to $13.5\text{px}$ ($27\text{px}$ diameter) to prevent hitbox overlap, which fully complies with WCAG 2.5.8 ($\ge 24\text{px}$).
3. **Vitest Config File Inclusion:** If `npm test` does not automatically scan `components/`, Worker M2 or Orchestrator should update `vitest.config.ts` to include `"components/**/*.test.tsx"` or execute tests via explicit path `npx vitest run components/LiveMatchBoard.test.tsx`.
4. No source code in `components/` or `lib/` was modified during this turn (strictly following the explorer read-only protocol).

---

## 4. Conclusion

The accessibility architecture and test specifications for `LiveMatchBoard` are completely formulated and verified in `strategy.md`.

Key achievements:
- **ARIA Semantics:** Full compliance with WCAG 2.2 AA (`role="region"`, `aria-label`, `role="button"`, `aria-pressed`, dynamic `<figcaption>`).
- **Live Announcements:** Debounced `aria-live="polite"` feedback for spot toggling, bench updates, and intent switches.
- **Keyboard Operability:** Sequential tab order, `Enter` / `Space` activation, and high-contrast `:focus-visible` focus ring ($\ge 4.5:1$).
- **Color Contrast:** Mathematically audited tokens ensuring 5.33:1 turf line contrast, 11.43:1 spot text contrast, and banning low-contrast pairings.
- **Test Specification:** 10 test suites comprising 35+ test cases specified with complete code templates ready for Worker M2 to deploy in `components/LiveMatchBoard.test.tsx`.

---

## 5. Verification Method

To independently verify this strategy:

1. **Review Technical Strategy File:**
   - Inspect `c:\EstudioALL\2026\BaFut\.agents\explorer_m2_3\strategy.md`.
   - Check the contrast formula calculations in § 6.
   - Check the props interface in § 2 and test specifications in § 8 & § 9.

2. **Independent Contrast Verification Command:**
   Execute in terminal:
   ```powershell
   node -e "
   function srgbToLin(c){c=c/255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)}
   function lum(hex){return 0.2126*srgbToLin(parseInt(hex.slice(1,3),16))+0.7152*srgbToLin(parseInt(hex.slice(3,5),16))+0.0722*srgbToLin(parseInt(hex.slice(5,7),16))}
   function cr(h1,h2){const l1=lum(h1),l2=lum(h2);return ((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)).toFixed(2)}
   console.log('Chalk on Turf:', cr('#d9f2a5','#0c6b4c') + ':1');
   console.log('Flood on Turf:', cr('#ffd25a','#0c6b4c') + ':1');
   console.log('Ink on Flood:', cr('#10231c','#ffd25a') + ':1');
   "
   ```
   Expected output:
   ```
   Chalk on Turf: 5.33:1
   Flood on Turf: 4.54:1
   Ink on Flood: 11.43:1
   ```

3. **Component Test Execution (Post-Worker M2 Implementation):**
   Run the newly authored test file:
   ```powershell
   npx vitest run components/LiveMatchBoard.test.tsx
   ```
   Verify that all 10 test suites pass with 0 errors.
