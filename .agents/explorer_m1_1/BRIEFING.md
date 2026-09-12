# BRIEFING — 2026-09-10T23:14:30Z

## Mission
Investigate and formulate the exact implementation strategy for lib/match-intent-payload.ts (types, format bounds, rotation rules, prevention of illegal side/role combinations).

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Domain Logic & Payload Architecture Explorer
- Working directory: c:\EstudioALL\2026\BaFut\.agents\explorer_m1_1
- Original parent: d4c119cc-b9a6-4d68-81b6-7a770dc4f2e3
- Milestone: M1: Domain Logic, Atomic Payload Builder & Server Action Remediation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement production source code directly
- Focus on `lib/match-intent-payload.ts` design and specification
- Write findings, strategy, and handoff in `.agents/explorer_m1_1/`
- Communicate results back to parent via `send_message`

## Current Parent
- Conversation ID: d4c119cc-b9a6-4d68-81b6-7a770dc4f2e3
- Updated: not yet

## Investigation State
- **Explored paths**: `supabase/migrations/`, `app/actions.ts`, `lib/constants.ts`, `lib/match-write.ts`, `lib/formations-catalog.ts`, `lib/sport-rules.ts`, `lib/types.ts`, `lib/challenge-match.test.ts`, survey reports.
- **Key findings**:
  1. `private.guard_slot_side_insert` forbids `side = 'b'` when `match_mode = 'pickup'` (raises `'No se puede abrir el lado B asi'`).
  2. `private.guard_slot_side_insert` caps Side B slots at 15 (`v_side_b_count >= 16` raises `'El lado B ya tiene el maximo de cupos'`).
  3. `createMatchAction` in `app/actions.ts` currently fails when `open_count = 0`, blocking Intent 2 ("Solo Banca").
  4. Format limits (`playersPerSideFromFormat`) must be strictly enforced on Intent 1 starters to prevent sports format overflow (e.g. 3 starters in 2v2 pádel).
  5. Check constraints require `matches.host_team_name` between 2 and 60 chars and `matches.rotation_rule` between 2 and 120 chars.
- **Unexplored areas**: None for M1 scope; domain logic and contracts are fully mapped.

## Key Decisions Made
- Formulated exact types: `MatchCreationIntent`, `IntentPayloadInput`, `IntentPitchSlotInput`, `ValidatedSlot`, `ValidatedMatchPayload`, `MatchPayloadResult`.
- Defined invariant rules for Intent 1 (`starter_slots`), Intent 2 (`bench_only`), and Intent 3 (`challenge`).
- Prevented illegal role/side combinations before any DB call.
- Designed integration path with `createMatchAction` maintaining backward-compatible intent inference.
- Documented comprehensive strategy in `strategy.md` and 5-component handoff in `handoff.md`.

## Artifact Index
- `.agents/explorer_m1_1/BRIEFING.md` — Persistent memory
- `.agents/explorer_m1_1/progress.md` — Liveness heartbeat
- `.agents/explorer_m1_1/strategy.md` — Implementation strategy for lib/match-intent-payload.ts
- `.agents/explorer_m1_1/handoff.md` — 5-component handoff report
