# Handoff Report — Explorer M2.2

**Target Agent:** Project Orchestrator / Worker M2 (`worker_m2`)  
**From:** explorer_m2_2 (Board State & Spot Representation Explorer)  
**Date:** 2026-09-10  
**Handoff Type:** Hard (Task Complete)  
**Deliverable File:** `c:\EstudioALL\2026\BaFut\.agents\explorer_m2_2\strategy.md`

---

## 1. Observation

Direct observations from inspecting the codebase and documentation:

1. **Spot Sizing & Target Bounds in Current Pitch Components:**
   - In `components/MatchPitchBoard.tsx:131–137`:
     ```tsx
     <circle
       className={`match-pitch-spot is-${dot.state} is-side-${dot.side}`}
       cx={dot.x}
       cy={dot.y}
       r={dot.state === "open" || dot.state === "invite" ? 7 : 5.5}
       style={{ animationDelay: `${0.08 + index * 0.04}s` }}
     />
     ```
     Visual radius $r = 5.5\text{px}$ to $7\text{px}$ gives an interactive diameter of only $11\text{px}$ to $14\text{px}$ within SVG viewBox `0 0 360 220`. There is no transparent hitbox expansion.
   - In `components/FormationPicker.tsx:172–176`:
     ```tsx
     <circle
       cx={dot.x}
       cy={dot.y}
       r={open ? 11 : 8}
       className={open ? "formation-hole is-open" : "formation-hole"}
       role={interactive ? "button" : undefined}
       tabIndex={interactive ? 0 : undefined}
       onClick={interactive ? () => toggleHole(dot) : undefined}
     />
     ```
     Visual radius $r = 8\text{px}$ to $11\text{px}$ ($16\text{px}$ to $22\text{px}$ diameter) falls below the WCAG 2.5.8 minimum target size ($24\times 24\text{px}$) and WCAG 2.5.5 touch target standard ($44\times 44\text{px}$).

2. **Bench Row Implementation:**
   - In `components/MatchPitchBoard.tsx:153–182`:
     ```tsx
     {((board.benchDotsA && board.benchDotsA.length > 0) || (board.benchDotsB && board.benchDotsB.length > 0)) ? (
       <g className="match-pitch-bench-group" aria-label="Banquillo de suplentes">
         <line x1="24" y1="192" x2="336" y2="192" stroke="#d9f2a5" strokeWidth="0.8" strokeDasharray="3 3" strokeOpacity="0.45" />
         <text x="180" y="190" textAnchor="middle" fill="#d9f2a5" fontSize="7" fillOpacity="0.7" letterSpacing="0.8">
           BANQUILLO / ROTACIÓN
         </text>
         {[...(board.benchDotsA ?? []), ...(board.benchDotsB ?? [])].map((dot, index) => (
           <g key={`bench-${dot.side}-${index}`}>
             <circle ... r={dot.state === "open" ? 6.5 : 5} ... />
             <text ...>⇄</text>
           </g>
         ))}
       </g>
     ) : null}
     ```
     The divider line is drawn at $y = 192$ and dots at $y = 206$. However, this area currently only renders read-only dots and lacks the active rotation pact label ("Rotación activa continua") and interactive controls required by Intent 2.

3. **Side B Confrontation Representation:**
   - In `components/MatchPitchBoard.tsx:90–92, 192–194`:
     Side B is either rendered with default dots or hidden with a bottom chip:
     `<p className="match-pitch-invite-chip">{sideBEmptyHint}</p>`.
     There is no visual distinction between "Buscando equipo rival completo" (squad badge) versus individual free-agent rival spots (`open_slots`).

4. **Standalone Emojis in Existing UI:**
   - In `components/CreateMatchForm.tsx:701, 709`:
     ```tsx
     <button ...>👤 Completar mi equipo</button>
     <button ...>⚔️ Buscar equipo rival</button>
     ```
     Emojis are used as standalone visual indicators without SVG vector rendering, violating WCAG 1.1.1 and 1.4.1.

5. **Payload Contract Consistency:**
   - In `lib/match-intent-payload.ts:21–26, 73–82`:
     `MatchCreationIntent = 'starter_slots' | 'bench_only' | 'challenge'`.
     `ChallengeModeType = 'full_team' | 'open_slots'`.
     `ValidatedMatchPayload` specifies `totalStartersA`, `totalBenchA`, `totalRivalB`, and `totalBenchB`.

---

## 2. Logic Chain

1. **From Observation 1 (Small Hitboxes) to Target Size Architecture:**
   - *Premise:* Physical bounding box of $11\text{px}$ to $22\text{px}$ on standard 360–390px mobile screens fails WCAG 2.5.5 ($44\times 44\text{px}$) and WCAG 2.5.8 ($24\times 24\text{px}$).
   - *Inference:* We cannot merely enlarge the visual circle to $r = 22\text{px}$ ($44\text{px}$ diameter) because that would clutter tactical pitch lines and cause visual collisions in 7v7, 8v8, and 11v11 formations.
   - *Solution:* Implement a dual-layer approach:
     1. An invisible expanded SVG circle (`<circle r="22" fill="transparent" pointerEvents="all" />`) covering $\ge 44\times 44\text{px}$.
     2. Density-adaptive hitbox radius calculation $r_{\text{hit}} = \min(22, \max(16, \lfloor \Delta y_{\min} / 2 \rfloor - 1))$ for dense formations.
     3. An adjacent, synchronized HTML action bar (`.live-board-spot-chips`) where each spot has a guaranteed CSS `min-height: 44px; min-width: 44px;`.

2. **From Observation 2 & 5 to Intent 2 (Solo Banca) Hero Focus:**
   - *Premise:* In Intent 2, the user already has full starting starters offline (`open_count = 0`), and only recruits 1 to 4 bench substitutes with an active rotation pact.
   - *Inference:* If the tactical pitch continues to prompt users to click spots on the grass, users will be confused into thinking they are picking starters.
   - *Solution:* In Intent 2, lock all starters on Side A into a confirmed, solid-chalk state with a "Titulares Listos" banner. Shift 100% of interactive focus to the Bench Row below $y = 192$, highlighting it with a glowing border, substitute chips `[1] [2] [3] [4]`, and the active rotation pact badge.

3. **From Observation 3 & 5 to Intent 3 (Reto Rival) Dual-Mode Representation:**
   - *Premise:* Intent 3 supports two distinct challenge models: `full_team` (a rival squad accepts in block) vs `open_slots` (individual free agents join Side B).
   - *Inference:* Rendering 5 or 6 individual dots when the host is challenging a full squad gives the false impression that individual players must be recruited.
   - *Solution:* For `full_team`, consolidate Side B into a prominent SVG Rival Squad Crest ($80\times 80\text{px}$) with crossed swords and `"Rival Completo ({N} jugadores)"`. For `open_slots`, render $N$ individual open rival spots with dashed `--bib` borders and role suggestions.

4. **From Observation 4 to Clean SVG Vector Icons:**
   - *Premise:* Emojis render inconsistently across platforms and fail contrast checks.
   - *Inference:* Replace all emojis with self-contained, lightweight inline SVG components (`IconGoalkeeper`, `IconDefender`, `IconMidfielder`, `IconForward`, `IconRotationPact`, `IconSwordsChallenge`, `IconConfirmedCheck`).

---

## 3. Caveats

1. **Mobile Landscape / Extreme Aspect Ratios:**
   - The SVG viewBox is fixed at `360 x 220`. On extremely narrow mobile screens (< 320px width), the below-pitch chip action bar (`.live-board-spot-chips`) wraps across multiple rows, which is intentional and accessible.
2. **Dense Formations (Fútbol 11v11):**
   - On 11v11 formations with 5 players in one vertical line, spacing between spot centers is $\approx 29\text{px}$. The dynamic hitbox calculation drops the SVG hit radius to $r = 16\text{px}$ ($32\times 32\text{px}$ hit box) to avoid overlap, relying on the below-pitch $44\times 44\text{px}$ action chips to satisfy WCAG 2.5.5 AAA.
3. **Padel 2v2 vs 4v4:**
   - Padel does not have goalkeepers; position roles are strictly `drive` and `reves`. The spot representation reflects this with racket/stroke icons rather than keeper gloves or defense shields.

---

## 4. Conclusion

The tactical spot representation and board state strategy for `LiveMatchBoard.tsx` is completely specified in `strategy.md`. It provides:
- Exact visual differentiation for Side A (confirmed vs open hole vs complete), Side B (squad crest vs open free agent spots), and the Bench Rotation Row (1–4 spots + rotation pact).
- Guaranteed WCAG 2.5.5 and 2.5.8 ergonomic compliance via dual-layer SVG hit targets ($r = 22\text{px}$) and synchronized below-pitch $44\times 44\text{px}$ action chips.
- Complete inline SVG vector icon catalog replacing all emojis.
- Full TypeScript interfaces (`LiveMatchBoardProps`), CSS design tokens, and an implementation roadmap for Worker M2.

---

## 5. Verification Method

To verify this design and its implementation in Milestone M2:

1. **Inspect Deliverables:**
   - Review `c:\EstudioALL\2026\BaFut\.agents\explorer_m2_2\strategy.md`.
   - Verify that all visual states across all 3 intents are documented with SVG properties and CSS classes.

2. **Component Test Verification (Vitest):**
   Once `components/LiveMatchBoard.tsx` is authored by Worker M2, run:
   ```powershell
   npm run test -- components/LiveMatchBoard.test.tsx
   ```
   Verify tests check:
   - Intent 1: Pitch spot toggle adds/removes open hole; bench row visible when benchCount > 0.
   - Intent 2: All starters locked; zero pitch holes selectable; bench row actively rendered with rotation rule.
   - Intent 3 (full_team): Renders consolidated Rival Squad Crest on Side B.
   - Intent 3 (open_slots): Renders $N$ distinct open rival spots on Side B.
   - Target Size: Every interactive spot has bounding box $\ge 44\times 44\text{px}$ or matching action chip $\ge 44\times 44\text{px}$.
   - Iconography: Zero emoji characters present in rendered DOM; all SVGs have `aria-hidden="true"`.
