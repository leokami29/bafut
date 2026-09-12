# Remediation Strategy & Architectural Specification: `createMatchAction`

**Document Version:** 1.0.0  
**Author:** explorer_m1_2 (Server Action & DB Security Explorer)  
**Target File:** `app/actions.ts` (`createMatchAction`)  
**Domain Validator:** `lib/match-intent-payload.ts` (`buildMatchSlotsPayload`)  
**Database Guard:** `private.guard_slot_side_insert` (`supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql`)  
**Milestone:** M1: Domain Logic, Atomic Payload Builder & Server Action Remediation  

---

## 1. Executive Summary

This specification establishes the authoritative, production-ready remediation strategy for the server action `createMatchAction` in `app/actions.ts`.

### Core Remediation Objectives
1. **Seamless Domain Integration**:
   Delegate all slot construction, format limit checks, and intent consistency validation to the pure domain builder `buildMatchSlotsPayload` from `lib/match-intent-payload.ts`.
2. **Support for Intent 2 ("Solo Banca / Suplentes")**:
   Eliminate the hardcoded legacy check `openCountRaw < 1` at `app/actions.ts:271` that rejects matches with zero starters on the pitch (`open_count = 0`), enabling hosts with pre-assembled starting lineups to open 1 to 4 bench substitutes on Side A with an active rotation pact.
3. **Trigger `guard_slot_side_insert` Compliance**:
   Strictly satisfy PostgreSQL database trigger rules:
   - Ensure all slots in Intent 1 (`starter_slots`) and Intent 2 (`bench_only`) are exclusively assigned to `side = 'a'`.
   - Ensure `match_mode = 'challenge'` is persisted in `public.matches` before any Side B slots are inserted in `public.match_slots`.
   - Restrict total Side B slots to $\le 15$ to avoid the $\ge 16$ trigger exception in `guard_slot_side_insert`.
4. **Verified Atomic Rollback & Error Humanization**:
   Guarantee clean cascade cleanup if slot insertion fails, preventing orphan matches in `public.matches`, and humanize database trigger exceptions using `humanizeSideBError`.

---

## 2. Current State Analysis & Identified Deficiencies

### 2.1 The Legacy Code Path in `app/actions.ts` (Lines 214–295)

```typescript
// Legacy code in app/actions.ts:
const matchMode = parseMatchMode(formData.get("match_mode"));
const hostTeamName = parseTeamName(formData.get("host_team_name"));
const rotationRule = parseRotationRule(formData.get("rotation_rule"));
const benchCount = parseBenchCount(formData.get("bench_count"));
const challengeTargetLevel = asOne(formData.get("challenge_target_level"), LEVELS, "any");

let slotsPayload: Array<{
  match_id?: string;
  position: Position;
  level: string;
  side: "a" | "b";
  slot_role: "starter" | "bench";
  pitch_index?: number | null;
}>;

if (matchMode === "challenge") {
  const sideBCount = playersPerSideFromFormat(format);
  slotsPayload = Array.from({ length: sideBCount }, (_, index) => ({
    position: (needKeeper && index === 0 ? "gk" : position) as Position,
    level: challengeTargetLevel,
    side: "b" as const,
    slot_role: "starter" as const,
    pitch_index: null,
  }));

  if (benchCount > 0) {
    for (let i = 0; i < benchCount; i++) {
      slotsPayload.push({
        position: "any",
        level: challengeTargetLevel,
        side: "b" as const,
        slot_role: "bench" as const,
        pitch_index: null,
      });
    }
  }
} else if (pitchParsed && "slots" in pitchParsed) {
  slotsPayload = pitchParsed.slots.map((slot) => ({
    position: slot.position,
    level: slot.level,
    side: "a" as const,
    slot_role: "starter" as const,
    pitch_index: slot.pitch_index,
  }));

  if (benchCount > 0) {
    for (let i = 0; i < benchCount; i++) {
      slotsPayload.push({
        position: "any",
        level,
        side: "a" as const,
        slot_role: "bench" as const,
        pitch_index: null,
      });
    }
  }
} else {
  // CRITICAL BOTTLENECK:
  const openCountRaw = Number(formData.get("open_count") ?? "");
  if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12) {
    return { error: "Los cupos deben ser un número entero entre 1 y 12." };
  }
  slotsPayload = Array.from({ length: openCountRaw }, (_, index) => ({
    position: (needKeeper && index === 0 ? "gk" : position) as Position,
    level,
    side: "a" as const,
    slot_role: "starter" as const,
    pitch_index: null,
  }));

  if (benchCount > 0) {
    for (let i = 0; i < benchCount; i++) {
      slotsPayload.push({
        position: "any",
        level,
        side: "a" as const,
        slot_role: "bench" as const,
        pitch_index: null,
      });
    }
  }
}
```

### 2.2 Root Causes of Failure
1. **Blocking Intent 2 ("Solo Banca / Suplentes")**:
   If the creator specifies `open_count = 0` (because their 5 starting players are already confirmed in WhatsApp or in person), line 272 evaluates `openCountRaw < 1` as `true` and throws `"Los cupos deben ser un número entero entre 1 y 12."`.
2. **Missing Format Upper-Bound Enforcement for Side A**:
   `openCountRaw > 12` is the only limit checked. For a 2v2 pádel match (`playersPerSide = 2`), a user can currently enter `open_count = 8`, creating 8 starter slots on a 2v2 pitch.
3. **Coupling & Fragility**:
   Slot generation is duplicated across three arbitrary if/else branches, making it impossible to add new features or sport rules without modifying server transport code.
4. **False Rejection on Empty Pitch Slots**:
   `parsePitchSlotsJson(String(formData.get("pitch_slots_json") ?? ""), sport)` returns `{ error: "Marcá entre 1 y 12 huecos en la cancha." }` if passed `"[]"`. If the client serializes an empty array for Intent 2 or Intent 3, line 200 prematurely aborts match creation.

---

## 3. FormData Extraction & Intent Normalization Strategy

### 3.1 Supported Intents
In accordance with `PROJECT.md § Interface Contracts`:
```typescript
export type MatchCreationIntent = "starter_slots" | "bench_only" | "challenge";
```

### 3.2 Robust Extraction with Backward Compatibility
To ensure existing tests, legacy API callers, and future clients function smoothly without breaking changes, `createMatchAction` implements a dual-layer extraction:

```typescript
// 1. Explicit intent extraction
const rawIntent = formData.get("intent")?.toString().trim();
let intent: MatchCreationIntent;

if (rawIntent === "starter_slots" || rawIntent === "bench_only" || rawIntent === "challenge") {
  intent = rawIntent;
} else {
  // Backward compatibility fallback inference
  const modeRaw = formData.get("match_mode")?.toString().trim();
  const benchRaw = Number(formData.get("bench_count") ?? 0);
  const openCountStr = formData.get("open_count")?.toString().trim();
  const pitchRaw = formData.get("pitch_slots_json")?.toString().trim();

  if (modeRaw === "challenge") {
    intent = "challenge";
  } else if (benchRaw > 0 && (!openCountStr || openCountStr === "0") && (!pitchRaw || pitchRaw === "[]")) {
    intent = "bench_only";
  } else {
    intent = "starter_slots";
  }
}
```

### 3.3 Safe Handling of `pitch_slots_json`
`parsePitchSlotsJson` must only be invoked when `intent === "starter_slots"` AND `pitch_slots_json` contains non-empty, non-trivial content (`trim() !== "" && trim() !== "[]"`):

```typescript
let pitchParsed = null;
const pitchRaw = String(formData.get("pitch_slots_json") ?? "").trim();
if (intent === "starter_slots" && pitchRaw && pitchRaw !== "[]") {
  pitchParsed = parsePitchSlotsJson(pitchRaw, sport);
  if (pitchParsed && "error" in pitchParsed) {
    return { error: pitchParsed.error };
  }
}
```

### 3.4 Mapping Form Inputs to `IntentPayloadInput`
```typescript
const pitchSlotsInput =
  intent === "starter_slots" && pitchParsed && "slots" in pitchParsed && pitchParsed.slots.length > 0
    ? pitchParsed.slots.map((s) => ({
        pitchIndex: s.pitch_index,
        position: s.position,
        level: s.level,
      }))
    : undefined;

const starterCountInput =
  intent === "starter_slots" && !pitchSlotsInput
    ? Number(formData.get("open_count") ?? 0)
    : undefined;

const benchCount = parseBenchCount(formData.get("bench_count"));
const rotationRule = formData.get("rotation_rule")?.toString();
const hostTeamName = formData.get("host_team_name")?.toString();
const challengeTargetLevel = asOne(formData.get("challenge_target_level"), LEVELS, "any");
const challengeModeType = formData.get("challenge_mode_type") === "open_slots" ? "open_slots" : "full_team";
```

---

## 4. Integration with `buildMatchSlotsPayload`

### 4.1 Invoking the Domain Builder
```typescript
const payloadResult = buildMatchSlotsPayload({
  intent,
  sport,
  format,
  formationId,
  pitchSlots: pitchSlotsInput,
  starterCount: starterCountInput,
  benchCount,
  rotationRule,
  hostTeamName,
  challengeModeType,
  defaultPosition: position,
  defaultLevel: intent === "challenge" ? challengeTargetLevel : level,
  needKeeper,
});

if (!payloadResult.ok) {
  return { error: payloadResult.error };
}

const {
  matchMode,
  hostTeamName: validatedHostTeamName,
  rotationRule: validatedRotationRule,
  slots: validatedSlots,
} = payloadResult.data;
```

### 4.2 Why this Solves the Problem
1. **Intent 2 ("Solo Banca")**:
   When `intent === "bench_only"`, `starterCountInput` and `pitchSlotsInput` are `undefined`. `buildMatchSlotsPayload` validates that `benchCount` is in $[1, 4]$, verifies `rotationRule` (fallback to `"Rotación activa continua"` if omitted), constructs the bench slots on Side A, and returns `matchMode: 'pickup'`. The restrictive `openCountRaw < 1` check is completely bypassed.
2. **Upper-Bound Validation**:
   In Intent 1, `buildMatchSlotsPayload` asserts that `startersCount <= playersPerSideFromFormat(format)`. A user cannot create 8 starters in pádel 2v2.
3. **Single Source of Truth**:
   The database entity attributes (`match_mode`, `host_team_name`, `rotation_rule`) are taken directly from the sanitized domain output.

---

## 5. PostgreSQL Integrity & Trigger `guard_slot_side_insert` Compliance

### 5.1 Trigger Mechanism (`private.guard_slot_side_insert`)
From `supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql`:
```sql
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
      -- En modo pickup: solo away_opened_by puede insertar hasta 2 cupos
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
```

### 5.2 Strict Compliance Rules Enforced by the Remediation

| Scenario | Trigger Condition Checked | How Remediation Satisfies Trigger |
|---|---|---|
| **Intent 1 (`starter_slots`)** | `new.side = 'b'`? **No** (`side = 'a'`). | Trigger condition `if new.side = 'b'` evaluates to `false`. Trigger exits immediately without DB queries. |
| **Intent 2 (`bench_only`)** | `new.side = 'b'`? **No** (`side = 'a'`). | Trigger condition `if new.side = 'b'` evaluates to `false`. Trigger exits immediately. |
| **Intent 3 (`challenge`)** | `new.side = 'b'`? **Yes**. | 1. `matches` row is inserted with `match_mode: 'challenge'` and `host_id: userId` **before** slot insertion.<br>2. `v_mode` evaluates to `'challenge'`.<br>3. `v_host is distinct from v_uid` is `false` (match host creates match).<br>4. Total Side B slots $\le 15$ ($11 \text{ starters} + 4 \text{ bench} = 15 < 16$), so `v_side_b_count >= 16` is never reached.<br>Trigger executes successfully without error. |
| **Illegal Side B in Pickup** | In pickup mode, host tries to insert side B. | Prevented at domain layer: `buildMatchSlotsPayload` forbids `side = 'b'` when intent is `starter_slots` or `bench_only`. |

---

## 6. Atomic Rollback Verification & Database Security

### 6.1 Cascade Architecture
1. **Foreign Key Definition (`supabase/migrations/20260902120000_init_core_schema.sql:102`)**:
   ```sql
   match_id uuid not null references public.matches(id) on delete cascade
   ```
2. **Row Level Security Policy (`matches_delete`)**:
   ```sql
   create policy matches_delete on public.matches for delete to authenticated
     using (host_id = (select auth.uid()));
   ```
   The match creator has direct authorization to delete their match row.

### 6.2 Rollback Sequence in `createMatchAction`
If an exception occurs during `match_slots` insertion (e.g. database timeout, trigger violation, network drop):

```typescript
const slots = validatedSlots.map((slot) => ({
  match_id: match.id,
  side: slot.side,
  slot_role: slot.slot_role,
  position: slot.position,
  level: slot.level,
  pitch_index: slot.pitch_index,
}));

const { error: slotError } = await supabase.from("match_slots").insert(slots);
if (slotError) {
  console.error("[createMatchAction] Error inserting match_slots:", slotError);
  // Atomic cascade rollback: Deleting the match cascades to any inserted slots
  await supabase.from("matches").delete().eq("id", match.id);

  // Humanized error response
  if (slotError.message && /lado b/i.test(slotError.message)) {
    return { error: humanizeSideBError(slotError.message) };
  }
  return { error: "El partido se armó mal. Inténtalo de nuevo." };
}
```

### 6.3 Pricing Override Rollback
If the venue rate override fails validation or the `apply_match_pricing` RPC fails, both slots and the match are deleted:
```typescript
if (hasOverride && (pricingError || !pricingApplied)) {
  await supabase.from("match_slots").delete().eq("match_id", match.id);
  await supabase.from("matches").delete().eq("id", match.id);
  return {
    error: pricingError?.message ?? "No se pudo aplicar el precio de la cancha.",
  };
}
```

---

## 7. Concrete Code Blueprint: Remediation of `app/actions.ts`

### 7.1 Import Adjustments
In `app/actions.ts`:

```typescript
// Replace lines 41-43 in app/actions.ts:
import {
  isGenderPolicy,
  parseBenchCount,
  parseCostPerPerson,
  parseMatchMode,
  parsePitchSlotsJson,
  parseRotationRule,
  parseSlotsJson,
  parseTeamName,
  resolveFormationIdInput,
} from "@/lib/match-write";
import { playersPerSideFromFormat } from "@/lib/match-formation";
import {
  buildMatchSlotsPayload,
  type MatchCreationIntent,
} from "@/lib/match-intent-payload";
```

### 7.2 Full Replacement Chunk for `createMatchAction` (Lines 198–349)

```typescript
  // --- START REPLACEMENT CHUNK ---
  const rawIntent = formData.get("intent")?.toString().trim();
  let intent: MatchCreationIntent;
  if (rawIntent === "starter_slots" || rawIntent === "bench_only" || rawIntent === "challenge") {
    intent = rawIntent;
  } else {
    const modeRaw = formData.get("match_mode")?.toString().trim();
    const benchRaw = Number(formData.get("bench_count") ?? 0);
    const openCountRaw = formData.get("open_count")?.toString().trim();
    const pitchRaw = formData.get("pitch_slots_json")?.toString().trim();

    if (modeRaw === "challenge") {
      intent = "challenge";
    } else if (benchRaw > 0 && (!openCountRaw || openCountRaw === "0") && (!pitchRaw || pitchRaw === "[]")) {
      intent = "bench_only";
    } else {
      intent = "starter_slots";
    }
  }

  let pitchParsed = null;
  const pitchRaw = String(formData.get("pitch_slots_json") ?? "").trim();
  if (intent === "starter_slots" && pitchRaw && pitchRaw !== "[]") {
    pitchParsed = parsePitchSlotsJson(pitchRaw, sport);
    if (pitchParsed && "error" in pitchParsed) {
      return { error: pitchParsed.error };
    }
  }

  const needKeeper = formData.get("need_keeper") === "on" && SPORT_RULES[sport].hasKeeper;
  const level = asOne(formData.get("level"), LEVELS, "any");
  const costParsed = parseCostPerPerson(String(formData.get("cost_per_person") ?? ""));
  if (costParsed && typeof costParsed === "object" && "error" in costParsed) {
    return { error: costParsed.error };
  }
  const notes = String(formData.get("notes") ?? "").trim();
  if (notes.length > 500) {
    return { error: "La nota es demasiado larga (máx. 500 caracteres)." };
  }

  const pitchSlotsInput =
    intent === "starter_slots" && pitchParsed && "slots" in pitchParsed && pitchParsed.slots.length > 0
      ? pitchParsed.slots.map((s) => ({
          pitchIndex: s.pitch_index,
          position: s.position,
          level: s.level,
        }))
      : undefined;

  const starterCountInput =
    intent === "starter_slots" && !pitchSlotsInput
      ? Number(formData.get("open_count") ?? 0)
      : undefined;

  const benchCount = parseBenchCount(formData.get("bench_count"));
  const rotationRule = formData.get("rotation_rule")?.toString();
  const hostTeamName = formData.get("host_team_name")?.toString();
  const challengeTargetLevel = asOne(formData.get("challenge_target_level"), LEVELS, "any");
  const challengeModeType = formData.get("challenge_mode_type") === "open_slots" ? "open_slots" : "full_team";

  const payloadResult = buildMatchSlotsPayload({
    intent,
    sport,
    format,
    formationId,
    pitchSlots: pitchSlotsInput,
    starterCount: starterCountInput,
    benchCount,
    rotationRule,
    hostTeamName,
    challengeModeType,
    defaultPosition: position,
    defaultLevel: intent === "challenge" ? challengeTargetLevel : level,
    needKeeper,
  });

  if (!payloadResult.ok) {
    return { error: payloadResult.error };
  }

  const {
    matchMode,
    hostTeamName: validatedHostTeamName,
    rotationRule: validatedRotationRule,
    slots: validatedSlots,
  } = payloadResult.data;

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      city_id: city.id,
      venue_id: venueId,
      host_id: userId,
      starts_at: startsAt.toISOString(),
      duration_min: durationMin,
      sport,
      format,
      formation_id: formationId,
      cost_per_person: typeof costParsed === "number" ? costParsed : null,
      gender_policy: asOne(formData.get("gender_policy"), GENDERS, "mixed"),
      notes: notes || null,
      status: "open",
      match_mode: matchMode,
      host_team_name: validatedHostTeamName,
      challenge_target_level: challengeTargetLevel,
      rotation_rule: validatedRotationRule,
    })
    .select("id, share_code")
    .single();

  if (error || !match) {
    const rateLimited = /demasiados partidos/i.test(error?.message ?? "");
    const raceHit =
      error?.code === "23P01" || isOccupancyRaceError(error?.message ?? "");
    if (raceHit) {
      const raced = await findVenueOccupancy(supabase, userId, {
        venueId,
        startsAt,
        durationMin,
      });
      if (raced && isJoinableOccupancyReason(raced.reason)) {
        return occupancyState(raced);
      }
      return { error: occupancyRaceUserMessage() };
    }
    return {
      error: rateLimited
        ? "Publicaste demasiados partidos en poco tiempo. Espera un rato."
        : "No se pudo publicar el partido. Revisa los datos.",
    };
  }

  const slots = validatedSlots.map((slot) => ({
    match_id: match.id,
    side: slot.side,
    slot_role: slot.slot_role,
    position: slot.position,
    level: slot.level,
    pitch_index: slot.pitch_index,
  }));

  const { error: slotError } = await supabase.from("match_slots").insert(slots);
  if (slotError) {
    console.error("[createMatchAction] Error inserting match_slots:", slotError);
    await supabase.from("matches").delete().eq("id", match.id);
    if (slotError.message && /lado b/i.test(slotError.message)) {
      return { error: humanizeSideBError(slotError.message) };
    }
    return { error: "El partido se armó mal. Inténtalo de nuevo." };
  }
  // --- END REPLACEMENT CHUNK ---
```

---

## 8. Verification Method & Test Plan

Worker M1 and downstream verification agents can independently verify this strategy as follows:

### 8.1 Verification of Pure Domain Validator (`lib/match-intent-payload.test.ts`)
Execute the complete test suite designed by explorer_m1_3:
```bash
npx vitest run lib/match-intent-payload.test.ts
```
Expected: All 28 test cases pass, verifying:
- Intent 1: Starters on Side A, format bounds enforced, optional bench on Side A.
- Intent 2: Zero starters, 1–4 bench slots on Side A, mandatory rotation rule, `matchMode = 'pickup'`.
- Intent 3: `matchMode = 'challenge'`, team name 2–60 chars, Side B starters equal to `playersPerSideFromFormat(format)`, total Side B slots $\le 15$.
- Security: Zero Side B slots in pickup mode, zero Side A slots in challenge mode.

### 8.2 Verification of Existing Test Suites (Zero Regressions)
```bash
npx vitest run lib/
```
Expected: All 31 existing test suites pass without regressions.

### 8.3 Manual & E2E Verification Scenarios (Tier 1–4)
1. **Solo Banca (Intent 2) Submission**:
   - Form Data: `sport: "futbol"`, `format: "5v5"`, `intent: "bench_only"`, `bench_count: "2"`, `rotation_rule: "Rotación activa continua"`, `open_count: "0"`.
   - Verification: Match created with `match_mode = 'pickup'`, 2 slots created in `match_slots` with `side = 'a'`, `slot_role = 'bench'`, `pitch_index = null`. Zero errors returned.
2. **Reto a Rival (Intent 3) Submission**:
   - Form Data: `sport: "voleibol"`, `format: "6v6"`, `intent: "challenge"`, `host_team_name: "Águilas del Valle"`, `challenge_target_level: "mid"`, `bench_count: "1"`.
   - Verification: Match created with `match_mode = 'challenge'`, 7 slots created in `match_slots` with `side = 'b'` (6 starters + 1 bench). Trigger `guard_slot_side_insert` succeeds.
3. **Trigger Invariant Verification**:
   - Intentionally attempt to submit Side B slots with `intent: "starter_slots"`.
   - Verification: `buildMatchSlotsPayload` rejects before hitting the database.
4. **Rollback Verification**:
   - Simulate a slot insertion failure (e.g. invalid foreign key or trigger rejection).
   - Verification: `supabase.from("matches").delete().eq("id", match.id)` runs and the orphan match row is cleanly deleted.
