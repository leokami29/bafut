# BaFut Backend, Database Integrity, and Sports Format Survey Report

**Author**: explorer_survey_1 (Backend & DB Integrity Explorer)  
**Date**: 2026-09-10  
**Scope**: Database schema, PostgreSQL triggers, RLS policies, Server Actions (`createMatchAction`), sports formats (`playersPerSideFromFormat`), slot payload types, and Vitest test harness in `c:\EstudioALL\2026\BaFut`.

---

## 1. Executive Summary

This investigation analyzed the backend architecture and data layer of BaFut to support the upcoming redesign of the match creation and slot configuration flow (3 intent-driven models: "Completar mi Equipo Titular", "Solo Banca / Suplentes", and "Reto a Equipo Rival").

Key findings:
1. **Database Schema & Triggers**: The database already has columns `match_mode` ('pickup' | 'challenge'), `host_team_name`, `away_team_name`, `challenge_target_level`, `rotation_rule` in `public.matches`, and `side` ('a' | 'b'), `slot_role` ('starter' | 'bench'), `pitch_index` (0-15), `custom_cost_per_person` in `public.match_slots`.
2. **Trigger `private.guard_slot_side_insert`**: Recently updated in migration `20260910180000_fix_challenge_side_b_insert_guard.sql`. When `new.side = 'b'`, it permits the host to insert Side B slots **only** if `match_mode = 'challenge'`. If `match_mode = 'pickup'`, inserting `side = 'b'` slots throws an exception (`'No se puede abrir el lado B asi'`).
3. **Server Action Bottleneck in `createMatchAction`**: Currently, `createMatchAction` in `app/actions.ts` enforces that starters on Side A must have at least 1 slot (`open_count >= 1` or `pitchParsed.slots.length >= 1`). It cannot create a match with **0 starters and only bench slots**, which directly blocks **Intention 2 ("Solo Banca / Suplentes")**.
4. **Sports Format Integrity**: `playersPerSideFromFormat` in `lib/formations-catalog.ts` calculates the exact players per side based on regex `/^(\d+)v(\d+)$/i`. Currently `createMatchAction` uses it for Challenge matches, but does not validate starter count bounds against format limits for Side A.
5. **Testing Harness**: 31 unit test suites in `lib/` run with Vitest v5.0.0 and pass (286 tests). `lib/challenge-match.test.ts` validates challenge helpers, but no tests currently cover atomic validation of all 3 creation intentions and invalid role/side combinations.

---

## 2. PostgreSQL Schema, Migrations, RLS & Triggers

### 2.1 Table Definitions & Column Constraints

#### Table: `public.matches`
Defined in `supabase/migrations/20260902120000_init_core_schema.sql` and amended in `20260903220000_venue_occupancy_sides.sql`, `20260903240000_match_formation_id.sql`, and `20260910000000_bench_and_match_challenges.sql`:

| Column | Type | Nullable | Default | Constraints / Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `city_id` | `uuid` | NO | - | FK `public.cities(id)` |
| `venue_id` | `uuid` | NO | - | FK `public.venues(id)` |
| `host_id` | `uuid` | NO | - | FK `public.profiles(id)` |
| `starts_at` | `timestamptz` | NO | - | Must be future |
| `duration_min` | `integer` | NO | - | `check (duration_min in (30, 60, 90))` |
| `sport` | `text` | NO | - | `'futbol'`, `'futbol_sala'`, `'basquet'`, `'voleibol'`, `'padel'` |
| `format` | `text` | NO | - | e.g. `'5v5'`, `'6v6'`, `'11v11'` |
| `formation_id` | `text` | YES | `null` | Catalog ID (e.g. `'futbol-11v11-4-3-3'`) |
| `cost_per_person` | `numeric` | YES | `null` | Cost per slot |
| `gender_policy` | `text` | NO | `'mixed'` | `'mixed'`, `'men'`, `'women'` |
| `notes` | `text` | YES | `null` | Max 500 chars |
| `status` | `text` | NO | `'open'` | `check (status in ('open', 'cancelled'))` |
| `share_code` | `text` | NO | - | Unique 8-char slug |
| `away_opened_by` | `uuid` | YES | `null` | FK `public.profiles(id)` |
| `occupy_range` | `tstzrange` | NO | - | Auto-synced by trigger `matches_sync_occupy_range` |
| `match_mode` | `text` | NO | `'pickup'` | `check (match_mode in ('pickup', 'challenge'))` |
| `host_team_name` | `text` | YES | `null` | `check (host_team_name is null or char_length(btrim(host_team_name)) between 2 and 60)` |
| `away_team_name` | `text` | YES | `null` | `check (away_team_name is null or char_length(btrim(away_team_name)) between 2 and 60)` |
| `challenge_target_level` | `text` | NO | `'any'` | `check (challenge_target_level in ('any', 'low', 'mid', 'high'))` |
| `rotation_rule` | `text` | YES | `null` | `check (rotation_rule is null or char_length(btrim(rotation_rule)) between 2 and 120)` |

#### Table: `public.match_slots`
Defined in `20260902120000_init_core_schema.sql` and amended across migrations:

| Column | Type | Nullable | Default | Constraints / Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `match_id` | `uuid` | NO | - | FK `public.matches(id) on delete cascade` |
| `position` | `text` | NO | `'any'` | `check (position in ('any', 'gk', 'def', 'mid', 'fwd', 'cierre', 'ala', 'pivot', 'base', 'escolta', 'ala_pivot', 'armador', 'central', 'opuesto', 'receptor', 'libero', 'drive', 'reves'))` |
| `level` | `text` | NO | `'any'` | `check (level in ('low', 'mid', 'high', 'any'))` |
| `side` | `text` | NO | `'a'` | `check (side in ('a', 'b'))` (from `20260903220000_venue_occupancy_sides.sql`) |
| `pitch_index` | `integer` | YES | `null` | `check (pitch_index is null or (pitch_index >= 0 and pitch_index < 16))` (from `20260903240000_match_formation_id.sql`) |
| `slot_role` | `text` | NO | `'starter'` | `check (slot_role in ('starter', 'bench'))` (from `20260910000000_bench_and_match_challenges.sql`) |
| `custom_cost_per_person` | `numeric` | YES | `null` | `check (custom_cost_per_person is null or custom_cost_per_person >= 0)` |
| `created_at` | `timestamptz` | NO | `now()` | Timestamp |

### 2.2 Row Level Security (RLS) Policies on `match_slots`
From `supabase/migrations/20260902120000_init_core_schema.sql`:

```sql
alter table public.match_slots enable row level security;

create policy match_slots_select on public.match_slots
  for select to anon, authenticated using (true);

create policy match_slots_insert on public.match_slots
  for insert to authenticated
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.host_id = (select auth.uid())
    )
  );

create policy match_slots_delete on public.match_slots
  for delete to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.host_id = (select auth.uid())
    )
  );
```
**RLS Assessment**:
- The match creator (`host_id = auth.uid()`) has full authorization to insert slots for that match.
- This RLS policy does not restrict `side` or `slot_role`. The side restriction is governed by the database trigger `guard_slot_side_insert`.

### 2.3 Database Trigger: `private.guard_slot_side_insert`
Located in `supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql`:

```sql
create or replace function private.guard_slot_side_insert()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_mode text;
  v_host uuid;
  v_away uuid;
  v_status text;
  v_uid uuid := (select auth.uid());
  v_side_b_count int;
begin
  if new.side = 'b' then
    select match_mode, host_id, away_opened_by, status
      into v_mode, v_host, v_away, v_status
    from public.matches
    where id = new.match_id;

    if v_status is distinct from 'open' then
      raise exception 'El partido no está abierto';
    end if;

    if v_mode = 'challenge' then
      -- En modo reto, el host anfitrión crea los cupos del equipo rival (lado B).
      -- También se permite si el capitán rival o service role está activo.
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
      -- En modo pickup legacy, quien abrió lado B (away_opened_by) puede insertar hasta 2 cupos
      if v_uid is not null and (v_away is distinct from v_uid or v_away is null) then
        raise exception 'No se puede abrir el lado B asi';
      end if;

      select count(*) into v_side_b_count
      from public.match_slots s
      where s.match_id = new.match_id and s.side = 'b';

      if v_side_b_count >= 2 then
        raise exception 'El lado B ya tiene el maximo de cupos';
      end if;
    end if;
  end if;
  return new;
end;
$function$;
```

**Trigger Behavior & Security Rules**:
1. **Challenge Mode (`match_mode = 'challenge'`)**:
   - Host (`v_host = auth.uid()`) is allowed to insert slots on `side = 'b'`.
   - Maximum 16 slots on Side B.
   - This allows the creator of a challenge match to generate the full roster of rival slots (e.g., 6 for 6v6 voleibol, 11 for 11v11 fútbol).
2. **Pickup Mode (`match_mode = 'pickup'`)**:
   - If `new.side = 'b'`, the host CANNOT insert slots on Side B. Only `away_opened_by` (an external user joining to challenge) can insert up to 2 slots via specific RPCs.
   - **Crucial Rule**: In Intention 1 ("Completar mi Equipo Titular") and Intention 2 ("Solo Banca / Suplentes"), `match_mode` is `'pickup'`, and **all slots must have `side = 'a'`**. If any slot in Intention 1 or 2 is submitted with `side = 'b'`, this trigger immediately throws an exception and rolls back match creation.
3. **Side Immobility Trigger (`guard_slot_match_id`)**:
   - In `20260903220000_venue_occupancy_sides.sql`:
     ```sql
     if new.side is distinct from old.side then
       raise exception 'No se puede cambiar el lado del cupo';
     end if;
     ```
   - Slots cannot mutate sides once created.

---

## 3. Server Action Investigation: `createMatchAction`

### 3.1 Location and Signature
- **File**: `app/actions.ts`
- **Line**: 130
- **Signature**: `export async function createMatchAction(formData: FormData): Promise<MatchComposeActionState>`

### 3.2 Current Flow & Slot Construction
```
FormData
  │
  ├── Extract city, venue, sport, format, duration, position, formation_id, pitch_slots_json,
  │   match_mode, host_team_name, rotation_rule, bench_count, challenge_target_level
  │
  ├── Branch 1: matchMode === "challenge"
  │     ├── sideBCount = playersPerSideFromFormat(format)
  │     ├── Starters: Array of sideBCount with side: "b", slot_role: "starter", pitch_index: null
  │     └── Bench: If benchCount > 0, benchCount slots with side: "b", slot_role: "bench", pitch_index: null
  │
  ├── Branch 2: pitchParsed && "slots" in pitchParsed (pitch_slots_json)
  │     ├── Starters: pitchParsed.slots mapped with side: "a", slot_role: "starter", pitch_index: slot.pitch_index
  │     └── Bench: If benchCount > 0, benchCount slots with side: "a", slot_role: "bench", pitch_index: null
  │
  └── Branch 3: Fallback open_count
        ├── openCountRaw = Number(formData.get("open_count")) [Must be 1..12]
        ├── Starters: openCountRaw slots with side: "a", slot_role: "starter", pitch_index: null
        └── Bench: If benchCount > 0, benchCount slots with side: "a", slot_role: "bench", pitch_index: null
```

### 3.3 Identified Gaps & Deficiencies in `createMatchAction`

1. **Inability to create "Solo Banca / Suplentes" (Intention 2)**:
   - Line 271-274 of `app/actions.ts`:
     ```ts
     const openCountRaw = Number(formData.get("open_count") ?? "");
     if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12) {
       return { error: "Los cupos deben ser un número entero entre 1 y 12." };
     }
     ```
   - In Intention 2, the user has 0 open starter slots on the pitch and specifies only `bench_count` (1 to 4).
   - Currently, if `open_count` is 0 or omitted, the action fails with `"Los cupos deben ser un número entero entre 1 y 12."`!
   - Similarly, if `pitch_slots_json` is `[]`, `parsePitchSlotsJson` in `lib/match-write.ts:103` fails with `"Marcá entre 1 y 12 huecos en la cancha."`.
   - **Fix Required**: When the intention is "Solo Banca", starter count is 0 and `bench_count >= 1` must be permitted, requiring a valid `rotation_rule`.

2. **Missing Upper-Bound Validation against Format Limits**:
   - For Side A starters, `createMatchAction` only validates `openCountRaw <= 12`.
   - It does not check if `startersCount <= playersPerSideFromFormat(format)`.
   - Example flaw: In pádel `2v2` (`playersPerSide = 2`), a user could currently create 8 open starter spots, which violates the sports format rules.
   - **Fix Required**: Enforce `startersCount <= playersPerSideFromFormat(format)` for Intention 1.

3. **Atomic Rollback Verification**:
   - Lines 343-348 in `app/actions.ts`:
     ```ts
     const { error: slotError } = await supabase.from("match_slots").insert(slots);
     if (slotError) {
       console.error("[createMatchAction] Error inserting match_slots:", slotError);
       await supabase.from("matches").delete().eq("id", match.id);
       return { error: "El partido se armó mal. Inténtalo de nuevo." };
     }
     ```
   - If `guard_slot_side_insert` or any other DB constraint fails during `match_slots` insertion, `createMatchAction` deletes the created match row (`supabase.from("matches").delete().eq("id", match.id)`), ensuring no orphan matches remain in PostgreSQL.

---

## 4. Sports Format Helpers & Limits

### 4.1 `playersPerSideFromFormat`
Defined in `lib/formations-catalog.ts:24` and re-exported in `lib/match-formation.ts:17`:
```ts
export function playersPerSideFromFormat(format: string | null | undefined): number {
  const match = /^(\d+)v(\d+)$/i.exec(format?.trim() ?? "");
  if (!match) return 5;
  return Math.max(1, Number(match[1]));
}
```

### 4.2 Sports Catalog Matrix (`lib/sport-rules.ts`)

| Sport (`Sport`) | Formats (`Format[]`) | Default Format | Players Per Side | Keeper? | Allowed Positions |
|---|---|---|---|---|---|
| `futbol` | 5v5, 6v6, 7v7, 8v8, 11v11 | 5v5 | 5, 6, 7, 8, 11 | Yes (`hasKeeper: true`) | `any`, `gk`, `def`, `mid`, `fwd` |
| `futbol_sala` | 5v5 | 5v5 | 5 | Yes (`hasKeeper: true`) | `any`, `gk`, `cierre`, `ala`, `pivot` |
| `basquet` | 3v3, 5v5 | 5v5 | 3, 5 | No (`hasKeeper: false`) | `any`, `base`, `escolta`, `ala`, `ala_pivot`, `pivot` |
| `voleibol` | 2v2, 6v6 | 6v6 | 2, 6 | No (`hasKeeper: false`) | `any`, `armador`, `central`, `opuesto`, `receptor`, `libero` |
| `padel` | 2v2, 4v4 | 2v2 | 2, 4 | No (`hasKeeper: false`) | `any`, `drive`, `reves` |

---

## 5. Slot Types & Payload Specifications

### 5.1 Type Definitions
In `lib/constants.ts` and `lib/match-write.ts`:
- `MatchMode = 'pickup' | 'challenge'`
- `SlotRole = 'starter' | 'bench'`
- `Level = 'any' | 'low' | 'mid' | 'high'`
- `Side = 'a' | 'b'`

### 5.2 Payload Expectations for the 3 Intentions

| Field | Intention 1: Completar Titular | Intention 2: Solo Banca | Intention 3: Reto Rival |
|---|---|---|---|
| `match_mode` | `'pickup'` | `'pickup'` | `'challenge'` |
| `host_team_name` | Optional (null or 2-60 chars) | Optional (null or 2-60 chars) | **Mandatory** / strongly recommended (2-60 chars) |
| `starters count` | `1` to `playersPerSideFromFormat(format)` | `0` (no slots on pitch) | Exactly `playersPerSideFromFormat(format)` |
| `starters side` | Strictly `'a'` | None | Strictly `'b'` |
| `starters role` | Strictly `'starter'` | None | Strictly `'starter'` |
| `pitch_index` | `0` to `15` (if interactive) or `null` | Strictly `null` | Strictly `null` |
| `bench count` | `0` to `4` | `1` to `4` | `0` to `4` |
| `bench side` | `'a'` | `'a'` | `'b'` |
| `bench role` | `'bench'` | `'bench'` | `'bench'` |
| `rotation_rule` | Required if bench > 0 | **Mandatory** (2-120 chars) | Required if bench > 0 |

---

## 6. Vitest Test Harness & Existing Coverage

### 6.1 Configuration (`vitest.config.ts`)
```ts
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["lib/**/*.test.ts", "app/**/*.test.ts", "creative-assets/**/*.test.ts"],
    environment: "node",
  },
});
```
- **Test execution command**: `npx vitest run` or `npm test`
- Verification run: Executed `npx vitest run lib/`, returned **31 passed test suites**, **286 passed tests** in ~2 seconds.

### 6.2 Current Test File: `lib/challenge-match.test.ts`
- Tests basic helper functions: `openStarterSlotCount`, `openBenchSlotCount`, `openSideASlotCount`, `openSideBSlotCount`, `isChallengeMatch`, `matchDisplayStatus`.
- Tests parser helpers: `parseMatchMode`, `parseTeamName`, `parseBenchCount`, `parseRotationRule`.
- Tests manual construction of 6v6 challenge slots.

### 6.3 Test Coverage Needs for New Intent Architecture
To verify the 3 intentions and prevent regressions, tests should cover:
1. **Atomic builder function (`buildMatchSlotsPayload`)**:
   - Intention 1: Only starters (`side: 'a'`, `slot_role: 'starter'`, `pitch_index` validation, count bounds).
   - Intention 1: Starters + bench (`side: 'a'`, starters + bench, rotation rule).
   - Intention 2: Solo Banca (`side: 'a'`, `starters = 0`, `bench: 1..4`, mandatory `rotation_rule`).
   - Intention 3: Reto a Rival (`side: 'b'`, count strictly matching `playersPerSideFromFormat(format)` for all sports formats, `match_mode: 'challenge'`).
2. **Invalid Combination Rejections**:
   - Intention 1 or 2 with `side: 'b'` rejected before DB call (saving round-trips and trigger failures).
   - Starters exceeding `playersPerSideFromFormat(format)`.
   - Bench > 0 without rotation rule.
   - Duplicate `pitch_index` in starters.
   - Challenge match with non-challenge mode.

---

## 7. Next.js Conventions & Breaking Changes (AGENTS.md)

- **Version**: Next.js `16.3.4`, React `19.2.8`.
- **Form Actions**:
  - `CreateMatchForm.tsx` uses React 19's `useActionState` from `"react"`, not the deprecated `useFormState` from `"react-dom"`.
  - Server actions in `app/actions.ts` have `"use server"` declared at the file level.
- **Cookies**: In Next.js 15+, `cookies()` from `next/headers` is asynchronous (`await cookies()`), which `app/actions.ts` already observes.
- **Client Components**: Client components must maintain `"use client"` at line 1.
- **Accessibility**: Form controls must adhere to WCAG 2.2 AA (radiogroups with arrow keys, minimum 4.5:1 contrast, explicit ARIA live regions for dynamic count updates).

---

## 8. Summary of Recommendations for Downstream Agents

1. **Modular Slot Intent Payload Builder (`lib/match-intent-payload.ts`)**:
   - Create a clean, pure TypeScript helper that encapsulates intent parsing, validation against `playersPerSideFromFormat`, rotation rules, and payload generation.
   - Test it comprehensively in Vitest (`lib/match-intent-payload.test.ts`).
   - Integrate it into `createMatchAction` in `app/actions.ts`.
2. **Support 0 Starters in `createMatchAction`**:
   - Update `createMatchAction` to allow `open_count = 0` when `bench_count > 0` and rotation rule is present (Intention 2).
3. **Dual Live Match Board UI (`LiveMatchBoard.tsx` or updating `FormationPicker.tsx` / `MatchPitchBoard.tsx`)**:
   - For Intention 1: Render Side A starters and optional bench.
   - For Intention 2: Render full Side A pitch as complete/greyed out with prominent bench badges and rotation rule.
   - For Intention 3: Render confrontation `[Mi Equipo (A)] vs [Equipo Rival (B)]`, showing Side A filled and Side B displaying open rival slots matching `playersPerSideFromFormat(format)`.
