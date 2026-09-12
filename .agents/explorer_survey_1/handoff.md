# Handoff Report: Backend, Database Schema, Triggers & Formats Investigation

**Agent**: explorer_survey_1 (Backend & DB Integrity Explorer)  
**Date**: 2026-09-10  
**Type**: Hard Handoff (Investigation Complete)  
**Deliverable Document**: `c:\EstudioALL\2026\BaFut\.agents\explorer_survey_1\survey_report.md`

---

## 1. Observation

1. **Database Schema & Constraints**:
   - `public.matches` contains columns: `match_mode text default 'pickup'`, `host_team_name text null`, `away_team_name text null`, `challenge_target_level text default 'any'`, and `rotation_rule text null` (`supabase/migrations/20260910000000_bench_and_match_challenges.sql:5-10`).
   - `public.match_slots` contains columns: `side text default 'a'` with check `side in ('a', 'b')` (`20260903220000_venue_occupancy_sides.sql:19-23`), `pitch_index integer check (pitch_index is null or (pitch_index >= 0 and pitch_index < 16))` (`20260903240000_match_formation_id.sql:10-20`), `slot_role text default 'starter' check (slot_role in ('starter', 'bench'))` (`20260910000000_bench_and_match_challenges.sql:52-62`).

2. **Trigger `guard_slot_side_insert`**:
   - In `supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql:17-55`:
     ```sql
     if new.side = 'b' then
       ...
       if v_mode = 'challenge' then
         if v_uid is not null and v_host is distinct from v_uid and v_away is distinct from v_uid then
           raise exception 'No se puede abrir el lado B asi';
         end if;
         ...
       else
         if v_uid is not null and (v_away is distinct from v_uid or v_away is null) then
           raise exception 'No se puede abrir el lado B asi';
         end if;
     ```
   - In `match_mode = 'challenge'`, the match host (`v_host = v_uid`) is allowed to insert up to 16 slots with `side = 'b'`. In any other mode (`pickup`), inserting `side = 'b'` slots throws `'No se puede abrir el lado B asi'`.

3. **RLS Policies on `match_slots`**:
   - In `supabase/migrations/20260902120000_init_core_schema.sql:135-141`:
     ```sql
     create policy match_slots_insert on public.match_slots for insert to authenticated
       with check (
         exists (
           select 1 from public.matches m
           where m.id = match_id and m.host_id = (select auth.uid())
         )
       );
     ```
   - The host has full RLS permission to insert slots into their match.

4. **Server Action `createMatchAction`**:
   - In `app/actions.ts:271-274`:
     ```ts
     const openCountRaw = Number(formData.get("open_count") ?? "");
     if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12) {
       return { error: "Los cupos deben ser un número entero entre 1 y 12." };
     }
     ```
   - If `match_mode !== 'challenge'` and `pitch_slots_json` is not passed or empty, `openCountRaw` requires `>= 1`.
   - In `lib/match-write.ts:103`:
     ```ts
     if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 12) {
       return { error: "Marcá entre 1 y 12 huecos en la cancha." };
     }
     ```
   - Neither branch allows 0 starters on the pitch, blocking Intention 2 ("Solo Banca / Suplentes").
   - In `app/actions.ts:343-348`:
     ```ts
     const { error: slotError } = await supabase.from("match_slots").insert(slots);
     if (slotError) {
       console.error("[createMatchAction] Error inserting match_slots:", slotError);
       await supabase.from("matches").delete().eq("id", match.id);
       return { error: "El partido se armó mal. Inténtalo de nuevo." };
     }
     ```
   - Rollback is already in place: if slot insertion fails (e.g. constraint or trigger violation), the match row is deleted immediately.

5. **Sports Formats**:
   - `playersPerSideFromFormat(format)` in `lib/formations-catalog.ts:24-28` parses `/^(\d+)v(\d+)$/i`.
   - `SPORT_RULES` in `lib/sport-rules.ts:38-69` maps sports (`futbol`, `futbol_sala`, `basquet`, `voleibol`, `padel`) to formats (`2v2`, `3v3`, `4v4`, `5v5`, `6v6`, `7v7`, `8v8`, `11v11`), keeper requirements, and allowed positions.

6. **Test Harness & Execution**:
   - Tested command: `npx vitest run lib/` executed with exit code 0; 31 passed test files, 286 passed tests.
   - `lib/challenge-match.test.ts` (9 tests) verifies domain counters and parsing helpers.

---

## 2. Logic Chain

1. **Premise 1**: The user request requires three distinct match creation intentions:
   - Intention 1: Completar mi Equipo Titular (`side = 'a'`, `slot_role = 'starter'`, optional `bench_count`).
   - Intention 2: Solo Banca / Suplentes (Titulares completos por fuera del app -> 0 open starter slots, `bench_count` 1 to 4 with mandatory rotation pact).
   - Intention 3: Reto a Equipo Rival (`match_mode = 'challenge'`, `host_team_name` validated, rival slots on `side = 'b'` matching format count).
2. **From Observation 2 & 3**:
   - In PostgreSQL, the host can only insert `side = 'b'` slots when `match_mode = 'challenge'`. If Intention 1 or 2 attempted to generate `side = 'b'` slots, the trigger `guard_slot_side_insert` would fail with an exception. Therefore, Intentions 1 and 2 must generate strictly `side = 'a'`, and Intention 3 must generate strictly `match_mode = 'challenge'` with `side = 'b'` for rival slots.
3. **From Observation 4**:
   - Currently, `createMatchAction` rejects any match where starters are less than 1 (`openCountRaw < 1` or `parsed.length < 1`).
   - Therefore, without updating `createMatchAction`, Intention 2 cannot be saved to the database.
4. **From Observation 4 & 5**:
   - Side A starters are currently only validated against `openCountRaw <= 12`, allowing users to exceed format limits (e.g., requesting 6 starters in 2v2 pádel).
   - Therefore, an atomic validation helper must validate `startersCount <= playersPerSideFromFormat(format)`.
5. **From Observation 6**:
   - Vitest runs cleanly in `node` environment across `lib/**/*.test.ts`. An atomic payload builder with unit tests in `lib/` can be thoroughly verified without external mock servers.

---

## 3. Caveats

- **No Caveats** regarding database schema: All required columns (`match_mode`, `host_team_name`, `rotation_rule`, `side`, `slot_role`, `pitch_index`, `custom_cost_per_person`) already exist in the database and do not require additional schema migrations.
- **Frontend Scope**: The visual component `CreateMatchForm.tsx` currently lacks the 3-intent switcher, accessible radiogroup buttons, and dual board representation for Intention 3. Those UI components will need to be implemented by downstream builder agents.

---

## 4. Conclusion

1. The database layer and PostgreSQL triggers (`guard_slot_side_insert`) are fully prepared and secure for challenge mode (`side = 'b'`) and bench slots (`slot_role = 'bench'`).
2. The core backend change needed is in the slot payload generation and validation logic:
   - Allow 0 starters on Side A when `bench_count >= 1` and `rotation_rule` is set (enabling Intention 2).
   - Enforce `startersCount <= playersPerSideFromFormat(format)` on Side A (enabling Intention 1 limits).
   - Validate `host_team_name` (2-60 chars) and generate exactly `playersPerSideFromFormat(format)` Side B slots when `match_mode === 'challenge'` (enabling Intention 3).
3. Recommended implementation: Create a pure, decoupled validator `buildMatchSlotsPayload` in `lib/` with 100% test coverage in Vitest (`lib/match-intent-payload.test.ts`), and integrate it directly into `createMatchAction`.

---

## 5. Verification Method

1. **Run Vitest Tests**:
   ```bash
   npx vitest run lib/challenge-match.test.ts
   npx vitest run lib/
   ```
2. **Inspect Migration Files**:
   - `supabase/migrations/20260910000000_bench_and_match_challenges.sql`
   - `supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql`
3. **Inspect Server Action**:
   - `app/actions.ts:130-350`
4. **Invalidation Condition**:
   - If a slot with `side = 'b'` is inserted when `match_mode = 'pickup'`, the PostgreSQL trigger `guard_slot_side_insert` will throw: `"No se puede abrir el lado B asi"`.
