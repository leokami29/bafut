# Dispatch Instructions — M1 Explorer 2

## 2026-09-10T23:13:00Z

From: Project Orchestrator (orchestrator_1)
Target: explorer_m1_2 (teamwork_preview_explorer)
Working directory: c:\EstudioALL\2026\BaFut\.agents\explorer_m1_2
Role: Server Action & DB Security Explorer

Milestone:
M1: Domain Logic, Atomic Payload Builder & Server Action Remediation

Objective:
Investigate and design the remediation of `createMatchAction` in `app/actions.ts` to seamlessly integrate `buildMatchSlotsPayload`.

Read:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md
- c:\EstudioALL\2026\BaFut\PROJECT.md
- c:\EstudioALL\2026\BaFut\.agents\explorer_survey_1\survey_report.md
- c:\EstudioALL\2026\BaFut\app\actions.ts

Deliverable:
Formulate an exact implementation strategy for `app/actions.ts`:
- How to extract intent fields from `formData`.
- How to remove the restrictive `openCountRaw < 1` check that blocks Intent 2 ("Solo Banca").
- How to ensure database trigger `guard_slot_side_insert` is strictly satisfied (only inserting Side B slots when `match_mode = 'challenge'`).
- Verify rollback logic when slot insertion fails.
- Write `strategy.md` and `handoff.md` in your directory.
- Report back when done.
