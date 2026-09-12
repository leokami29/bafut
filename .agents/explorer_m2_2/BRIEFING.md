# BRIEFING — 2026-09-10T23:37:00Z

## Mission
Investigate and design the interactive player spot representation, visual states across all 3 intents, touch target ergonomics (>= 44x44px), and bench rotation row for `LiveMatchBoard.tsx`.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: Board State & Spot Representation Explorer, UI/UX & A11y Ergonomics Specialist
- Working directory: c:\EstudioALL\2026\BaFut\.agents\explorer_m2_2
- Original parent: d4c119cc-b9a6-4d68-81b6-7a770dc4f2e3
- Milestone: M2 (Live Tactical Dual Board Component)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in production files (`components/LiveMatchBoard.tsx`, `components/FormationPicker.tsx`, `components/MatchPitchBoard.tsx`).
- Document exact design strategy in `strategy.md`.
- Ensure touch target bounding hit area >= 44x44px (WCAG 2.5.5 / 2.5.8).
- Clean SVG vector icons for position/role (no standalone emojis).
- Write `handoff.md` following the 5-component protocol.
- Send completion message to parent upon finishing.

## Current Parent
- Conversation ID: d4c119cc-b9a6-4d68-81b6-7a770dc4f2e3
- Updated: 2026-09-10T23:37:00Z

## Investigation State
- **Explored paths**:
  - `components/FormationPicker.tsx`: Analyzed single-team formation picker, toggle hole behavior, SVG rendering (viewBox 360x220, r=8/11 circles, lacking 44x44px hit bounds).
  - `components/MatchPitchBoard.tsx`: Analyzed dual pitch board, `CourtLines` for 5 sports, `SideHit` overlays, bench row layout at y=192-206.
  - `lib/match-formation.ts`: Analyzed `baseDotsForHalf`, `spreadY`, `lineXs`, `mirrorX`, `marksMapFromSlots`, `marksMapFromCounts`, `FormationDotState`.
  - `lib/formations-catalog.ts`: Analyzed `playersPerSideFromFormat`, sports catalogs (futbol 5v5-11v11, futsal, basquet 3v3/5v5, voley 2v2/6v6, padel 2v2/4v4), positions/roles.
  - `lib/match-intent-payload.ts`: Verified input/output types, `MatchCreationIntent`, `ChallengeModeType`, and slot building rules.
  - `app/styles/formation-pitch.css` & `formation-picker.css`: Analyzed CSS tokens (`--chalk`, `--turf`, `--flood`, `--bib`), animations, hit button layouts.
  - `spec_report.md`: Reviewed full specification requirements R1, R2, R3, R4 and edge cases E01-E14.
- **Key findings**:
  - Established dual-layer SVG spot architecture with $r = 22\text{px}$ invisible hit circles delivering $\ge 44\times 44\text{px}$ touch targets.
  - Designed density-adaptive hitbox scaling for dense lineups (e.g. 11v11) combined with synchronized below-pitch 44px HTML action chips.
  - Fully mapped the 3 intents to Side A, Side B, and Bench Row behaviors:
    - Intent 1: Interactive pitch spots on Side A + optional bench spots.
    - Intent 2: Locked confirmed starters on Side A + hero focus on Bench Row with 1–4 spots and active rotation pact badge.
    - Intent 3: Consolidated Rival Squad Crest (full_team) vs $N$ individual open rival spots (open_slots).
  - Replaced all emojis with a custom vector SVG catalog for roles (`gk`, `def`, `mid`, `fwd`, `armador`, `padel`) and states (`⇄` rotation pact, swords challenge, checkmark).

## Key Decisions Made
- Deliverable strategy established in `strategy.md`.
- Handoff report finalized in `handoff.md`.
- All constraints and acceptance criteria satisfied.

## Artifact Index
- `BRIEFING.md` — Persistent agent memory and status index
- `progress.md` — Workflow liveness heartbeat
- `strategy.md` — Detailed tactical spot & board UI/UX design blueprint
- `handoff.md` — 5-component handoff report for parent/implementer
