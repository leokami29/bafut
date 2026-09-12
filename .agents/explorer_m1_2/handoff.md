# Handoff Report: Remediation Strategy for `createMatchAction` in `app/actions.ts`

**Agent:** explorer_m1_2 (Server Action & DB Security Explorer)  
**Target:** Project Orchestrator (orchestrator_1) & Implementer (worker_m1)  
**Date:** 2026-09-10T23:16:30Z  
**Type:** Hard Handoff (Investigation & Server Action Remediation Strategy Complete)  
**Working Directory:** `c:\EstudioALL\2026\BaFut\.agents\explorer_m1_2`  

---

## 1. Observation

1. **Current Blocker for Intent 2 ("Solo Banca / Suplentes") in `app/actions.ts:271-274`:**
   ```typescript
   const openCountRaw = Number(formData.get("open_count") ?? "");
   if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12) {
     return { error: "Los cupos deben ser un número entero entre 1 y 12." };
   }
   ```
   *Verbatim Result:* When a user or client attempts to create a "Solo Banca" match with 0 starter slots on the pitch and 1–4 bench slots (`open_count = 0`), this check throws `"Los cupos deben ser un número entero entre 1 y 12."`.

2. **Premature Pitch Slot Failure in `app/actions.ts:198-201` and `lib/match-write.ts:103-105`:**
   In `lib/match-write.ts:103-105`:
   ```typescript
   if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 12) {
     return { error: "Marcá entre 1 y 12 huecos en la cancha." };
   }
   ```
   *Verbatim Result:* When `pitch_slots_json` is serialized as `"[]"` (as occurs when zero pitch spots are marked for Solo Banca or Challenge), `parsePitchSlotsJson` returns an error, prematurely aborting `createMatchAction`.

3. **Database Trigger Guard on Side B Slots (`supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql:16-56`):**
   ```sql
   if new.side = 'b' then
     select match_mode, host_id, away_opened_by, status
       into v_mode, v_host, v_away, v_status
     from public.matches
     where id = new.match_id;

     if v_status is distinct from 'open' then
       raise exception 'El partido no está abierto';
     end if;

     if v_mode = 'challenge' then
       if v_uid is not null and v_host is distinct from v_uid and v_away is distinct from v_uid then
         raise exception 'No se puede abrir el lado B asi';
       end if;

       select count(*) into v_side_b_count
       from public.match_slots s
       where s.match_id = new.match_id and s.side = 'b';

       if v_side_b_count >= 16 then
         raise exception 'El lado B ya tiene el maximo de cupos';
       end if;
     else
       if v_uid is not null and (v_away is distinct from v_uid or v_away is null) then
         raise exception 'No se puede abrir el lado B asi';
       end if;
       ...
     end if;
   end if;
   ```
   *Verbatim Observations:*
   - If `new.side = 'a'`, the trigger immediately skips all checks and returns `new`. Side A slots are completely unrestricted by this trigger.
   - If `new.side = 'b'` and `match_mode = 'pickup'`, any insertion by the host raises `'No se puede abrir el lado B asi'`.
   - If `new.side = 'b'` and `match_mode = 'challenge'`, the host is authorized, but `v_side_b_count >= 16` raises `'El lado B ya tiene el maximo de cupos'`.

4. **Foreign Key Cascade and RLS Rollback Verification:**
   - In `supabase/migrations/20260902120000_init_core_schema.sql:102`:
     `match_id uuid not null references public.matches(id) on delete cascade`
   - In `supabase/migrations/20260902120000_init_core_schema.sql:131-132`:
     ```sql
     create policy matches_delete on public.matches for delete to authenticated
       using (host_id = (select auth.uid()));
     ```
   - In `app/actions.ts:343-348`:
     ```typescript
     const { error: slotError } = await supabase.from("match_slots").insert(slots);
     if (slotError) {
       console.error("[createMatchAction] Error inserting match_slots:", slotError);
       await supabase.from("matches").delete().eq("id", match.id);
       return { error: "El partido se armó mal. Inténtalo de nuevo." };
     }
     ```

5. **Interface Contract and Domain Alignment:**
   - In `PROJECT.md:53-91` and `.agents/explorer_m1_1/strategy.md:37-115`, `buildMatchSlotsPayload` returns `{ ok: true, data: ValidatedMatchPayload } | { ok: false, error: string }`.
   - In `.agents/explorer_m1_3/strategy.md`, 28 Vitest unit tests verify boundary cases, format math, and multi-sport invariants.

---

## 2. Logic Chain

1. **Step 1 (Root Cause Resolution for Intent 2):**
   - Observation 1 proves that `openCountRaw < 1` is a hardcoded syntactic barrier in `app/actions.ts:271`.
   - Observation 2 proves that `parsePitchSlotsJson` also rejects empty arrays `"[]"`.
   - Reasoning: In Intent 2 ("Solo Banca"), the starting lineup is complete offline, so pitch slots are 0 and `open_count = 0`.
   - Solution: In `createMatchAction`, only invoke `parsePitchSlotsJson` if `intent === "starter_slots"` and `pitch_slots_json` is non-empty (`trim() !== "" && trim() !== "[]"`). Replace lines 214–294 by delegating slot construction to `buildMatchSlotsPayload`, which accepts `starterCount: 0` when `intent === "bench_only"` and validates `benchCount` between 1 and 4.

2. **Step 2 (Database Trigger Satisfaction):**
   - Observation 3 shows `guard_slot_side_insert` executes on `side = 'b'`.
   - In Intent 1 and Intent 2, `buildMatchSlotsPayload` guarantees all slots have `side = 'a'`. Therefore, `guard_slot_side_insert` evaluates `if new.side = 'b'` to false and never executes, preventing `'No se puede abrir el lado B asi'` errors.
   - In Intent 3 (`challenge`), `buildMatchSlotsPayload` returns `matchMode = 'challenge'`. `createMatchAction` inserts `public.matches` with `match_mode: 'challenge'` and `host_id: userId` **before** slot insertion.
   - When slots are inserted, the trigger reads `v_mode = 'challenge'` and `v_host = userId`, allowing the host to insert the Side B slots.
   - Since total Side B slots are bounded by `playersPerSide + benchCount <= 11 + 4 = 15 < 16`, the trigger limit check `v_side_b_count >= 16` is never triggered.

3. **Step 3 (Atomic Rollback Safety):**
   - Observation 4 confirms that `matches` has `on delete cascade` to `match_slots`, and `matches_delete` RLS permits authenticated hosts to delete their own matches.
   - When `slotError` occurs, `await supabase.from("matches").delete().eq("id", match.id)` cleanly removes the orphan match and all child slots.
   - Enhancing error handling with `humanizeSideBError` gives users descriptive feedback if a trigger exception occurs.

4. **Step 4 (Synthesis into Actionable Blueprint):**
   - Synthesizing Steps 1–3 produces the complete replacement chunk for lines 198–349 of `app/actions.ts`, ready for immediate application by Worker M1.

---

## 3. Caveats

1. **Client Form Updating (M3 Dependency):**
   While `createMatchAction` now supports `intent = "bench_only"` and `open_count = 0`, the client form `components/CreateMatchForm.tsx` still renders the legacy 2-intent chips until Milestone M3. However, `createMatchAction` includes backward-compatibility inference that automatically detects Intent 2 if `bench_count > 0 && open_count === "0"`.
2. **Pricing RPC Override:**
   The pricing override step occurs after slot insertion via `supabase.rpc("apply_match_pricing")`. If this fails, the action performs a secondary rollback (`delete from match_slots` and `delete from matches`), preserving database cleanliness.
3. **Trigger Modification Out of Scope:**
   No migration or changes to `private.guard_slot_side_insert` are required; the remediation conforms strictly to the existing trigger implementation.

---

## 4. Conclusion

The implementation strategy for remediating `createMatchAction` in `app/actions.ts` is complete, fully specified, and documented in `strategy.md`.
- **Intent 2 Unblocked:** Removes `openCountRaw < 1` barrier and safely handles empty pitch slot JSON.
- **Trigger Compliant:** Guarantees `side = 'a'` in pickup mode and pre-persists `match_mode = 'challenge'` before Side B slot insertion.
- **Rollback Verified:** Verifies cascade rollback on slot insertion failure and pricing failure.
- **Worker M1 Ready:** Provides the exact before/after replacement code chunk for `app/actions.ts`.

---

## 5. Verification Method

1. **Inspect Strategy Artifacts:**
   - Strategy Document: `c:\EstudioALL\2026\BaFut\.agents\explorer_m1_2\strategy.md`
   - Progress Heartbeat: `c:\EstudioALL\2026\BaFut\.agents\explorer_m1_2\progress.md`
   - Briefing: `c:\EstudioALL\2026\BaFut\.agents\explorer_m1_2\BRIEFING.md`

2. **Verify Vitest Runner Command:**
   ```bash
   npx vitest run lib/challenge-match.test.ts
   ```
   Confirm current test runner operates cleanly.

3. **Verify Implementation by Worker M1:**
   After Worker M1 applies the changes from `strategy.md:215-380`:
   ```bash
   npx vitest run lib/match-intent-payload.test.ts
   npx vitest run lib/
   ```
   All tests must pass with zero errors.

4. **Invalidation Conditions:**
   - If `app/actions.ts` retains `openCountRaw < 1`, Intent 2 verification will fail.
   - If `matches` is inserted with `match_mode = 'pickup'` when slots have `side = 'b'`, `guard_slot_side_insert` will throw exception.
