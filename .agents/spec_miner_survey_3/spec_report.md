# BaFut Match Creation & Slot Architecture Specification Report
**Document ID:** SPEC-BAFUT-M1-SURVEY-3  
**Date:** 2026-09-10  
**Status:** Canonical Reference Specification  
**Author:** spec_miner_survey_3 (Teamwork Specification Miner & WCAG 2.2 AA Specialist)  
**Scope:** R1 (Intent-Driven UI), R2 (Live Match Board), R3 (Payload & DB Integrity), R4 (Accessibility WCAG 2.2 AA), Sports Format Math, and Tier 1–4 Acceptance Test Criteria.

---

## 1. Executive Summary

This specification establishes the authoritative requirements and interface contracts for the complete redesign of BaFut's match creation and slot ("huecos") configuration workflow. It replaces legacy disconnected form controls with an **Intent-Driven Architecture (R1)**, provides an interactive and accessible **Dual Visual Match Board (R2)**, enforces atomic **Payload and Database Integrity (R3)** with zero schema violations, and satisfies all **WCAG 2.2 AA accessibility standards (R4)** including full keyboard operability, roving tabindex, ARIA live announcements, 4.5:1 text contrast, and vector SVG icons without emoji reliance.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| F01 | R1 Intent | Intent 1: "Completar mi Equipo Titular" | The host wants to complete missing starters in side A. Supports selecting holes on pitch or setting open count, plus optional bench players. | `open_count` (1–12) OR `pitch_slots_json` (1–12 items), `bench_count` (0–4), `rotation_rule` (if bench > 0) | `side='a'`, `slot_role='starter'`, plus `bench_count` slots on `side='a'`, `slot_role='bench'` | Rejects `open_count < 1` or invalid pitch indexes (> 15). | `ORIGINAL_REQUEST.md`, `CreateMatchForm.tsx:748` |
| F02 | R1 Intent | Intent 2: "Solo Banca / Suplentes" | Host already has full starting lineup offline. UI hides starter pitch slot selection and focuses strictly on substitutes (1–4) and mandatory active rotation pact. | `bench_count` (1–4), `rotation_rule` (non-empty string, 2–120 chars) | `side='a'`, `slot_role='bench'` (1–4 slots), 0 starter slots | Rejects `bench_count < 1` or missing rotation rule. Server currently requires `open_count >= 1`, requiring fix in `createMatchAction`. | `ORIGINAL_REQUEST.md`, `20260910000000_bench_and_match_challenges.sql` |
| F03 | R1 Intent | Intent 3: "Reto a Equipo Rival" | Host team is complete and seeks an opponent. Dual confrontation view `[Mi Equipo (A)] vs [Equipo Rival (B)]`. Creates `side='b'` slots equal to sport format capacity. | `host_team_name` (optional, 2–60 chars), `challenge_target_level` ('any'\|'low'\|'mid'\|'high'), `bench_count` (0–4), rival mode ('full_team'\|'open_agents') | `match_mode='challenge'`, `side='b'`, `slot_role='starter'` (`sideBCount` slots) + optional `side='b'`, `slot_role='bench'` | Rejects team name length < 2 or > 60 chars. `guard_slot_side_insert` validates `v_mode = 'challenge'`. | `ORIGINAL_REQUEST.md`, `20260910180000_fix_challenge_side_b_insert_guard.sql` |
| F04 | R2 Board | Dual Pitch Tactical Board | Interactive SVG pitch displaying home side A and away side B in real time with court lines customized by sport. | `MatchFormationBoard` (sport, format, formationId, dots, benchDotsA, benchDotsB) | Scalable SVG (viewBox: 360x220) with interactive spots, bench area, and summary figcaption | Fallback to default formation and dimensions if parameters invalid. | `MatchPitchBoard.tsx:68`, `match-formation.ts:216` |
| F05 | R2 Board | Spot State Semantics | Renders tactical spots with distinct visual and accessible indicators: `filled` (home confirmed), `open` (`?` mark), `invite` (`+` mark), `ghost` (unselected), `bench` (`⇄` mark). | `FormationDotState` ('filled'\|'open'\|'ghost'\|'invite') and `role` ('starter'\|'bench') | Circle + symbol text + SVG outline style | Unrecognized state defaults to `ghost`. | `MatchPitchBoard.tsx:132`, `match-formation.ts:19` |
| F06 | R2 Board | Bench Rotation Area | Dedicated zone at bottom of tactical board (y=192–206) separated by dashed chalk line displaying active bench spots and rotation rule summary. | `benchDotsA`, `benchDotsB`, `rotation_rule` | Dashed separator line, bench circles with `⇄` icon, caption with rotation rule | Hidden if neither side has bench spots. | `MatchPitchBoard.tsx:153` |
| F07 | R3 Payload | Sanitized Slot Payload Generation | Generates strictly typed slot arrays ensuring `side`, `slot_role`, `pitch_index`, `level`, and `position` conform to schema. | Raw form inputs (`FormData`) | `slotsPayload: Array<{ position, level, side, slot_role, pitch_index }>` | Returns descriptive Spanish error message if sanitization fails. | `app/actions.ts:220`, `lib/match-write.ts:25` |
| F08 | R3 DB | DB Trigger `guard_slot_side_insert` | Security definer trigger preventing unauthorized creation of side B slots in PostgreSQL. Allows host in challenge mode up to 16 slots. | `new.side`, `new.match_id`, `auth.uid()` | Database execution or exception | Raises exception `'No se puede abrir el lado B asi'` if pickup mode or unauthorized. | `20260910180000_fix_challenge_side_b_insert_guard.sql` |
| F09 | R3 DB | Atomic Rollback on Slot Failure | Automatically cascades rollback by deleting the orphaned match row if slot insertion or pricing override fails. | `match.id`, `slotError` | Deleted match record, clean user error state | Logs server error, returns `"El partido se armó mal. Inténtalo de nuevo."` | `app/actions.ts:344` |
| F10 | R4 A11y | Semantic Radiogroup with Roving Tabindex | Intent selector exposes `role="radiogroup"` and `role="radio"` with keyboard navigation via `ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown`. | Keyboard event (`keydown`) | Focus movement, `aria-checked` update, state transition | Ignores unmapped keys. | `SKILL.md:171`, WCAG 2.1.1, WCAG 2.4.7 |
| F11 | R4 A11y | ARIA Polite Live Region | Hidden live region (`aria-live="polite"`, `aria-atomic="true"`) announcing intent changes, slot increments, bench additions, and format changes. | State changes in UI | Screen reader utterance string | Gracefully suppressed when state is unchanged. | `SKILL.md:401`, WCAG 4.1.3 |
| F12 | R4 A11y | Non-Text Contrast & Focus Indicators | Focus outlines using `:focus-visible` with minimum 3:1 contrast against backgrounds, and `scroll-margin` to prevent obstruction by sticky action bars. | Keyboard Tab/Arrow focus | Visible 2px outline with 2px offset | Fallback to default browser outline if CSS unset. | `SKILL.md:123, 220`, WCAG 2.4.7, WCAG 2.4.11 |
| F13 | R4 A11y | Accessible Vector SVG Icons | Replaces emojis (`👤`, `⚔️`, `🔄`) with scalable SVG icons marked with `aria-hidden="true"` and paired with visible text or `.sr-only` spans. | Icon render | Vector graphic + accessible label | Emojis alone without text violate WCAG 1.1.1 & 1.4.1. | `ORIGINAL_REQUEST.md:31`, `SKILL.md:75` |
| F14 | Math | `playersPerSideFromFormat` Math Engine | Extracts numeric players per side from string pattern `^(\d+)v(\d+)$` (e.g. 5v5 -> 5, 6v6 -> 6, 11v11 -> 11). | `format: string \| null \| undefined` | `number` (minimum 1, default 5) | Returns fallback 5 for null, undefined, or malformed strings. | `formations-catalog.ts:24`, `match-formation.ts:4` |
| F15 | Domain | Full Team Challenge RPC | RPC `accept_challenge_full_team` atomically registers rival team name, sets away captain, and fills first side B slot. | `p_match_id: uuid`, `p_team_name: text` | `share_code: text` | Throws if team name < 2 chars, match not open, or user is host. | `20260910000000_bench_and_match_challenges.sql:135` |

---

## 3. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| E01 | Intent 2 (Solo Banca) | `open_count = 0`, `bench_count = 2`, `match_mode = 'pickup'` | Currently fails in `createMatchAction` (`"Los cupos deben ser un número entero entre 1 y 12."`). Specification dictates: when `bench_count >= 1` in Solo Banca, `open_count = 0` is valid and creates 2 bench slots on Side A. |
| E02 | Intent 3 (Reto Rival) | Volleyball 6v6 (`format = '6v6'`), `bench_count = 0` | Side B count must be exactly `playersPerSideFromFormat("6v6") = 6`. Generates 6 starters on `side = 'b'`, 0 slots on `side = 'a'`. |
| E03 | Intent 3 (Reto Rival) | Football 11v11 (`format = '11v11'`), `bench_count = 4` | Generates 11 starters on `side = 'b'` + 4 bench slots on `side = 'b'` = 15 total Side B slots. Satisfies PostgreSQL trigger constraint (`v_side_b_count < 16`). |
| E04 | DB Trigger Constraint | Attempt to insert 17th slot on Side B in challenge mode | Trigger `guard_slot_side_insert` aborts with `raise exception 'El lado B ya tiene el maximo de cupos'`. Server rolls back and deletes match. |
| E05 | DB Trigger Constraint | Attempt to insert Side B slot in `match_mode = 'pickup'` | Trigger `guard_slot_side_insert` aborts with `'No se puede abrir el lado B asi'` because `away_opened_by` is null and mode is not challenge. |
| E06 | Team Name Bounds | `host_team_name = "A"` (1 character) or `host_team_name = "   "` | Postgres constraint `matches_host_team_name_len` checks `char_length(btrim(host_team_name)) between 2 and 60`. Rejected with error. |
| E07 | Rotation Rule Bounds | `rotation_rule = ""` or whitespace-only when `bench_count > 0` | In Intent 2, rotation rule is mandatory. In DB, `matches_rotation_rule_len` checks `char_length(btrim(rotation_rule)) between 2 and 120`. Must fallback to `"Rotación activa continua"`. |
| E08 | Padel 2v2 Reto | `sport = 'padel'`, `format = '2v2'`, `match_mode = 'challenge'` | `playersPerSideFromFormat("2v2") = 2`. Generates 2 Side B starter slots with positions `['drive', 'reves']` or `'any'`. |
| E09 | Keyboard Navigation | User on Intent 1 presses `ArrowLeft` | Roving tabindex cycles to Intent 3 (wraps around) or stays at 1 if non-wrapping. WAI-ARIA APG recommends cycling: Intent 1 -> Intent 3 -> Intent 2. |
| E10 | Target Size on Mobile | Touch on formation preview spot (diameter 14px in SVG) | SVG visual circle is r=7 (14px), but interactive hit target must encompass at least 44×44 CSS pixels via transparent `<circle r="22" opacity="0" />` or styled container button. |
| E11 | Color Contrast | Text with class `.filter-chips .is-on` (`--chalk` `#d9f2a5` on `--turf` `#0c6b4c`) | Evaluates to 5.39:1 contrast ratio. Exceeds WCAG AA 4.5:1 requirement. |
| E12 | Color Contrast | Text with class `.badge-warn` (`--flood` `#ffd25a` text on white background) | Fails contrast (1.35:1). Specification requires dark text (`--ink` `#10231c`) when placed on `--flood` background (10.8:1), or `--turf-deep` on white. |
| E13 | Sticky Bar Obstruction | Focus moves to final submit button while virtual keyboard or sticky bottom bar is present | WCAG 2.4.11 (Focus Not Obscured): requires `scroll-margin-bottom: calc(5.5rem + env(safe-area-inset-bottom))` on all focusable controls. |
| E14 | Screen Reader Spam | User rapidly changes bench count from 0 to 4 | Live region announcements debounced by 300ms so screen reader announces final state (`"4 suplentes agregados"`) rather than queued intermediate states. |

---

## 4. R1: Arquitectura Didáctica por Intención (Intent-Driven UI)

The match creation wizard Step 2 ("02 · Convocatoria y Cupos") is refactored into three mutually exclusive, prominent intents:

```
+-----------------------------------------------------------------------------------+
|  02 · ¿Qué necesitas para este partido?                                           |
|                                                                                   |
|  [ (1) Completar mi Equipo Titular ]  [ (2) Solo Banca ]  [ (3) Reto a Rival ]   |
+-----------------------------------------------------------------------------------+
```

### 4.1 Intent 1: "Completar mi Equipo Titular"
- **User Mental Model:** "Tengo algunos amigos listos, pero me faltan titulares en cancha para jugar."
- **Host Team (Side A):** Active.
- **Controls Displayed:**
  1. *Cupos Faltantes en Cancha:*
     - Option A: Interactive tactical pitch picker (`FormationPicker`). Clicking pitch spots toggles open hole (`openSlots`).
     - Option B: Quick numeric selector (`openCount`, default 2, min 1, max `playersPerSideFromFormat(format)` or 12).
     - Default position assignment: suggested role from tactical formation (e.g. GK, DEF, MID, FWD) or "any".
  2. *Suplentes de Banca (Toggle / Counter):*
     - Toggle: "¿Deseas sumar suplentes para rotación?"
     - When toggled ON: Bench count chips `[1] [2] [3] [4]` (default 1).
     - Rotation Pact selector: Active choices from `ROTATION_RULES`:
       - "Rotación activa continua" (default)
       - "Rotación fija cada 15 min"
       - "Arquero rotativo"
       - "Pacto libre acordado"
- **Controls Hidden:** Opponent team fields (`host_team_name`, `challenge_target_level`).
- **Resulting Payload:**
  - `match_mode = 'pickup'`
  - Starter slots: `side = 'a'`, `slot_role = 'starter'`, count = `openCount` (or `pitch_slots.length`).
  - Bench slots: `side = 'a'`, `slot_role = 'bench'`, count = `benchCount` (0 if toggle OFF).
  - Side B slots: 0.

### 4.2 Intent 2: "Solo Banca / Suplentes"
- **User Mental Model:** "Mis titulares ya están 100% listos por fuera de la app (mi grupo de WhatsApp). Solo busco 1 a 4 suplentes para rotar."
- **Host Team (Side A):** Complete on pitch; recruiting bench.
- **Controls Displayed:**
  1. *Callout Banner:* "Tu equipo titular ya está completo. Configura cuántos suplentes necesitas para rotar."
  2. *Cantidad de Suplentes:* Chips `[1] [2] [3] [4]` (strictly between 1 and 4; default 2). Chip 0 is hidden/disabled because this intent exists solely for bench recruiting.
  3. *Pacto de Rotación Activo (Mandatory):*
     - Prominently exposed dropdown with explicit explanation: "Garantiza a los suplentes cuántos minutos jugarán."
     - Selected option saved to `matches.rotation_rule`.
- **Controls Hidden:**
  - Cancha interactiva de selección de huecos titulares (no pitch holes selectable).
  - Selector de cupos titulares (`open_count` is bypassed or set to 0).
  - Opponent team fields.
- **Resulting Payload:**
  - `match_mode = 'pickup'`
  - Starter slots: 0.
  - Bench slots: `side = 'a'`, `slot_role = 'bench'`, count = `benchCount` (1–4).
  - Side B slots: 0.

### 4.3 Intent 3: "Reto a Equipo Rival"
- **User Mental Model:** "Mi equipo está completo y listo. Buscamos un equipo rival para jugar en contra."
- **Confrontation Layout:** `[Mi Equipo (A)] vs [Equipo Rival (B)]`.
- **Controls Displayed:**
  1. *Nombre de tu Equipo:*
     - Input text: `host_team_name` (optional, placeholder "Ej: Los Galácticos", max 60 chars).
  2. *Formato del Rival (Automatic Math):*
     - Clear indicator: "Se convocarán **{playersPerSideFromFormat(activeFormat)}** jugadores rivales ({sportLabel} {activeFormat})."
  3. *Modalidad del Rival:*
     - Radio A: "Reto a Equipo Completo" (Un capitán rival acepta el reto y trae a su escuadra completa vía `accept_challenge_full_team`).
     - Radio B: "Cupos Abiertos para Rivales Libres" (Jugadores individuales de la comunidad pueden sumarse al lado B).
  4. *Nivel Esperado del Rival:*
     - Select: `challenge_target_level` ('any' | 'low' | 'mid' | 'high').
  5. *Suplentes para el Rival (Opcional):*
     - Chips `[0] [1] [2] [3] [4]` (default 0).
- **Resulting Payload:**
  - `match_mode = 'challenge'`
  - Starter slots: `side = 'b'`, `slot_role = 'starter'`, count = `playersPerSideFromFormat(format)`.
  - Bench slots: `side = 'b'`, `slot_role = 'bench'`, count = `benchCount` (if > 0).
  - Side A slots: 0 (Host squad is complete offline).

### 4.4 Intent State Transition Matrix

| Previous Intent | Next Intent | Starter Slots (`pitch_slots` / `open_count`) | `bench_count` | `rotation_rule` | `match_mode` | `host_team_name` |
|---|---|---|---|---|---|---|
| 1 (Completar) | 2 (Solo Banca) | Cleared (`[]` / `0`) | If 0, reset to default 2; if 1–4, retain | Retained or default "Rotación activa continua" | Kept `'pickup'` | Cleared (`""`) |
| 1 (Completar) | 3 (Reto Rival) | Cleared (rival count handled automatically) | Retained or reset to 0 | Preserved | Switched to `'challenge'` | Retained or empty |
| 2 (Solo Banca) | 1 (Completar) | Reset to default (2 cupos) | Retained (1–4) | Retained | Kept `'pickup'` | Cleared (`""`) |
| 2 (Solo Banca) | 3 (Reto Rival) | Cleared (rival count handled automatically) | Reset to 0 (or retained as rival bench) | Preserved | Switched to `'challenge'` | Retained or empty |
| 3 (Reto Rival) | 1 (Completar) | Reset to default (2 cupos) | Reset to 0 | Default "Rotación activa continua" | Switched to `'pickup'` | Hidden |
| 3 (Reto Rival) | 2 (Solo Banca) | Cleared (`0`) | If 0, reset to 2 | Default "Rotación activa continua" | Switched to `'pickup'` | Hidden |

---

## 5. R2: Tablero Visual Táctico Dual ("Live Match Board")

### 5.1 Real-Time Dual Rendering Architecture
The tactical match board (`MatchPitchBoard`) renders an SVG court with standard viewbox `0 0 360 220` with two distinct halves:
- **Left Half (x: 0 to 180):** Side A (Anfitrión / Home).
- **Right Half (x: 180 to 360):** Side B (Rival / Away), mirrored on x-axis (`mirrorX = 360 - x`).
- **Divider Net / Center Line (x: 180):** Court markings tailored to sport (`futbol`, `futbol_sala`, `basquet`, `voleibol`, `padel`).

### 5.2 Board Semantics by Intent

```
INTENT 1: COMPLETAR TITULARES
+-----------------------------------+-----------------------------------+
|               LADO A              |               LADO B              |
| [●] Confirmados   [?] Cupos A     |   (No convocado / Opcional)       |
|                                   |   "Modo equipo único"             |
+-----------------------------------+-----------------------------------+
| [⇄] Suplentes A (si bench > 0)    |                                   |
+-----------------------------------+-----------------------------------+

INTENT 2: SOLO BANCA
+-----------------------------------+-----------------------------------+
|               LADO A              |               LADO B              |
| [●] [●] [●] [●] [●]               |   (No convocado)                  |
| "Titulares completos en cancha"   |                                   |
+-----------------------------------+-----------------------------------+
| [⇄] [⇄] 1 a 4 Suplentes A         |                                   |
| Pacto de Rotación: Activo         |                                   |
+-----------------------------------+-----------------------------------+

INTENT 3: RETO A RIVAL
+-----------------------------------+-----------------------------------+
|               LADO A              |               LADO B              |
| [●] [●] [●] [●] [●]               | [?] [?] [?] [?] [?]               |
| Mi Equipo: "Los Galácticos"       | Reto: {sideBCount} cupos rivales  |
| "Equipo anfitrión listo"          | "Buscando equipo rival"           |
+-----------------------------------+-----------------------------------+
|                                   | [⇄] Suplentes Rival (opcional)    |
+-----------------------------------+-----------------------------------+
```

### 5.3 Spot State Indicators and Non-Color Encodings (WCAG 1.4.1)

| Spot State | SVG Class | Fill Color | Stroke | Inner Symbol / Label | Meaning |
|---|---|---|---|---|---|
| `filled` (Side A) | `.is-filled.is-side-a` | `--chalk` (`#d9f2a5`) | Solid `--turf-deep` (`#073828`) | Solid fill with position abbreviation or player # | Confirmed starter player on Home team |
| `open` (Side A) | `.is-open.is-side-a` | `rgba(217, 242, 165, 0.2)` | Dashed 2px `--chalk` (`#d9f2a5`) | `?` (interrogation mark) | Open starter hole waiting for player |
| `bench` (Side A) | `.is-bench.is-side-a` | `rgba(255, 210, 90, 0.25)` | Dotted 2px `--flood` (`#ffd25a`) | `⇄` (bidirectional rotation arrow) | Active rotation substitute on bench |
| `filled` (Side B) | `.is-filled.is-side-b` | `--bib` (`#c42a16`) | Solid `--bib-ink` (`#fff8f5`) | Solid fill with rival player # | Confirmed rival player |
| `open` (Side B) | `.is-open.is-side-b` | `rgba(196, 42, 22, 0.2)` | Dashed 2px `--bib` (`#c42a16`) | `?` or `⚔️` SVG cross-swords | Open rival slot waiting for player |
| `invite` (Side B) | `.is-invite.is-side-b` | `rgba(255, 255, 255, 0.15)` | Dashed 1.5px `--chalk` | `+` (plus sign) | Challenge invitation slot |
| `ghost` | `.is-ghost` | Transparent | Solid 1px `rgba(217, 242, 165, 0.3)` | None | Tactical reference position (offline player) |

### 5.4 Live Dynamic Figcaption
Every board render updates an accessible `<figcaption>` containing:
1. Formation name: e.g. `"Fútbol 5v5 · Diamante (1-2-1)"`
2. Player count math: e.g. `"10 jugadores en cancha · 5 por lado"`
3. Side A summary: `"Mi Equipo: 3 titulares confirmados, 2 cupos abiertos, 1 suplente"`
4. Side B summary: `"Rival: Esperando equipo completo (5 jugadores)"`

---

## 6. R3: Integridad y Seguridad en el Payload y Base de Datos

### 6.1 Slot Payload Data Contract

```typescript
export type SlotRole = "starter" | "bench";
export type SlotSide = "a" | "b";

export interface SanitizedSlotWrite {
  position: Position;                     // 'any' | 'gk' | 'def' | 'mid' | 'fwd' | ...
  level: Level;                           // 'any' | 'low' | 'mid' | 'high'
  side: SlotSide;                         // 'a' | 'b'
  slot_role: SlotRole;                    // 'starter' | 'bench'
  pitch_index: number | null;             // 0..15 on field, null for bench/generic
  custom_cost_per_person?: number | null; // >= 0
}

export interface CreateMatchPayload {
  city_slug: string;
  venue_id: string;
  starts_at: string;                      // ISO 8601
  duration_min: 30 | 60 | 90;
  sport: Sport;
  format: Format;
  formation_id: string | null;
  cost_per_person: number | null;
  gender_policy: "mixed" | "men" | "women";
  notes: string | null;
  match_mode: "pickup" | "challenge";
  host_team_name: string | null;          // null or 2..60 chars
  challenge_target_level: Level;
  rotation_rule: string | null;           // null or 2..120 chars
  slots: SanitizedSlotWrite[];
}
```

### 6.2 Slot Composition Matrix per Intent

| Intent | `match_mode` | Starters Side A | Bench Side A | Starters Side B | Bench Side B | Total Slots Bound |
|---|---|---|---|---|---|---|
| **1. Completar Titulares** | `'pickup'` | 1 to 12 | 0 to 4 | 0 | 0 | 1 to 16 |
| **2. Solo Banca** | `'pickup'` | **0** | **1 to 4** | 0 | 0 | 1 to 4 |
| **3. Reto Rival** | `'challenge'` | 0 | 0 | `playersPerSideFromFormat` (1..11) | 0 to 4 | 1 to 15 |

### 6.3 Critical Server-Side Fix Identified (Intent 2)
In the existing implementation of `createMatchAction` (`app/actions.ts:271–274`):
```typescript
// CURRENT BEHAVIOR (BUGGY FOR INTENT 2):
const openCountRaw = Number(formData.get("open_count") ?? "");
if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12) {
  return { error: "Los cupos deben ser un número entero entre 1 y 12." };
}
```
**Specification Mandate:**
When the user submits Intent 2 ("Solo Banca"):
- `pitch_slots_json` is null/empty.
- `open_count` is 0 (or absent).
- `bench_count` is an integer between 1 and 4.
The server validation MUST be adjusted as follows:
```typescript
if (benchCount > 0 && (openCountRaw === 0 || formData.get("intent") === "bench_only")) {
  // Valid Intent 2: 0 starters, benchCount substitutes
  slotsPayload = [];
  for (let i = 0; i < benchCount; i++) {
    slotsPayload.push({
      position: "any",
      level,
      side: "a",
      slot_role: "bench",
      pitch_index: null,
    });
  }
}
```

### 6.4 PostgreSQL Triggers and Integrity Guards
1. **Trigger `guard_slot_side_insert` (`20260910180000_fix_challenge_side_b_insert_guard.sql`):**
   - Fires `BEFORE INSERT ON public.match_slots FOR EACH ROW`.
   - If `new.side = 'b'`:
     - Checks `status = 'open'`. If false -> `raise exception 'El partido no está abierto'`.
     - If `match_mode = 'challenge'`:
       - Checks `v_uid` equals `host_id` or `away_opened_by`. If neither -> `raise exception 'No se puede abrir el lado B asi'`.
       - Checks `count(*) < 16`. If count >= 16 -> `raise exception 'El lado B ya tiene el maximo de cupos'`.
     - If `match_mode != 'challenge'`:
       - Requires `v_away = v_uid` and count < 2. Otherwise raises exception.
   - **Conclusion:** Intent 3 strictly requires setting `match_mode = 'challenge'` on the parent match row before inserting side B slots!
2. **PostgreSQL Check Constraints:**
   - `matches_match_mode_check`: `CHECK (match_mode IN ('pickup', 'challenge'))`.
   - `matches_challenge_target_level_check`: `CHECK (challenge_target_level IN ('any', 'low', 'mid', 'high'))`.
   - `matches_host_team_name_len`: `CHECK (host_team_name IS NULL OR char_length(btrim(host_team_name)) BETWEEN 2 AND 60)`.
   - `matches_rotation_rule_len`: `CHECK (rotation_rule IS NULL OR char_length(btrim(rotation_rule)) BETWEEN 2 AND 120)`.
   - `match_slots_slot_role_check`: `CHECK (slot_role IN ('starter', 'bench'))`.
   - `match_slots_custom_cost_check`: `CHECK (custom_cost_per_person IS NULL OR custom_cost_per_person >= 0)`.
3. **Atomic Rollback Guarantee:**
   - If `supabase.from("match_slots").insert(slots)` fails for any reason (trigger violation, constraint mismatch), the server action executes:
     `await supabase.from("matches").delete().eq("id", match.id);`
   - Rollback is non-blocking to other sessions and leaves no dangling matches in PostgreSQL.

---

## 7. R4: Accesibilidad y Ergonomía (WCAG 2.2 AA)

### 7.1 Keyboard Navigation & Roving Tabindex
The Intent Selector implements the WAI-ARIA Radio Group pattern:

```html
<fieldset class="intent-selector-group">
  <legend class="sr-only">¿Qué necesitas para este partido?</legend>
  <div role="radiogroup" aria-labelledby="intent-legend" class="intent-cards-grid">
    <button
      type="button"
      role="radio"
      id="intent-opt-1"
      aria-checked="true"
      tabindex="0"
      class="intent-card is-selected"
    >
      <svg aria-hidden="true" class="intent-icon"><!-- SVG icon --></svg>
      <span class="intent-card-title">Completar Titulares</span>
      <span class="intent-card-desc">Faltan puestos en la cancha para armar el equipo</span>
    </button>
    <button
      type="button"
      role="radio"
      id="intent-opt-2"
      aria-checked="false"
      tabindex="-1"
      class="intent-card"
    >
      <svg aria-hidden="true" class="intent-icon"><!-- SVG icon --></svg>
      <span class="intent-card-title">Solo Banca</span>
      <span class="intent-card-desc">Titulares listos; buscamos suplentes para rotación</span>
    </button>
    <button
      type="button"
      role="radio"
      id="intent-opt-3"
      aria-checked="false"
      tabindex="-1"
      class="intent-card"
    >
      <svg aria-hidden="true" class="intent-icon"><!-- SVG icon --></svg>
      <span class="intent-card-title">Reto a Rival</span>
      <span class="intent-card-desc">Mi equipo está listo; buscamos un rival para jugar</span>
    </button>
  </div>
</fieldset>
```

#### Keyboard Interaction Rules:
- **`Tab` / `Shift+Tab`:** Enters and exits the radiogroup as a single tab stop. Focus lands on the currently selected radio card (`tabindex="0"`).
- **`ArrowRight` / `ArrowDown`:** Moves focus to the next radio card in the group. If on the last card (Option 3), wraps around to the first (Option 1). Updates selection (`aria-checked="true"`) and shifts `tabindex="0"` to the newly focused card.
- **`ArrowLeft` / `ArrowUp`:** Moves focus to the previous radio card in the group. If on the first card (Option 1), wraps around to the last (Option 3). Updates selection and shifts `tabindex="0"`.
- **`Space` / `Enter`:** Explicit activation if focused via assistive technology without triggering immediate arrow change.
- **`Home` / `End`:** Focuses first card (Option 1) / last card (Option 3).

### 7.2 Focus Visible & Non-Obscured (WCAG 2.4.7 & 2.4.11)
```css
/* Visible high-contrast focus indicator (≥3:1 contrast against bg) */
.intent-card:focus-visible,
.filter-chips button:focus-visible,
.btn-primary:focus-visible {
  outline: 2px solid var(--flood);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(12, 107, 76, 0.4);
}

/* WCAG 2.4.11: Ensure focused interactive controls are not covered by sticky headers or bars */
.intent-card,
.match-compose input,
.match-compose select,
.match-compose button {
  scroll-margin-top: 80px;
  scroll-margin-bottom: 90px;
}
```

### 7.3 Target Size (WCAG 2.5.8)
- Minimum target size for all interactive buttons, chips, and cards: **24 × 24 CSS pixels**.
- Recommended touch target on mobile viewports: **44 × 44 CSS pixels** (`min-height: 2.75rem; min-width: 2.75rem;`).
- Pitch formation dots: While SVG visual radius is `r = 7` (14px), the interactive touch surface is expanded to an invisible `<circle r="22" fill="transparent" />` delivering a **44 × 44px** hit target.

### 7.4 Color Contrast Ratios (WCAG 1.4.3 & 1.4.11)

| UI Element | Foreground Color | Background Color | Evaluated Ratio | WCAG 2.2 AA Threshold | Result |
|---|---|---|---|---|---|
| Card / Chip Active Text | `--chalk` (`#d9f2a5`) | `--turf` (`#0c6b4c`) | **5.39:1** | 4.5:1 (normal text) | **PASS** |
| Body Text / Labels | `--ink` (`#10231c`) | `--paper` (`#dff3e6`) | **14.24:1** | 4.5:1 (normal text) | **PASS** |
| Subhead / Muted Text | `--turf-deep` (`#073828`) | `--paper` (`#dff3e6`) | **8.12:1** | 4.5:1 (normal text) | **PASS** |
| Accent Alert Badge | `--bib-ink` (`#fff8f5`) | `--bib` (`#c42a16`) | **5.41:1** | 4.5:1 (normal text) | **PASS** |
| Focus Ring Outline | `--flood` (`#ffd25a`) | `--turf` (`#0c6b4c`) | **4.21:1** | 3.0:1 (UI components) | **PASS** |
| Interactive Border | `--turf` (`#0c6b4c`) | `--paper` (`#dff3e6`) | **3.85:1** | 3.0:1 (UI components) | **PASS** |
| Low-Contrast Guard | `--chalk` (`#d9f2a5`) | White (`#ffffff`) | *1.22:1* | 4.5:1 | **PROHIBITED** |

### 7.5 Vector SVG Icons (No Relying on Emojis)
Emojis (`👤`, `⚔️`, `🛡️`, `🔄`) vary significantly across operating systems, cannot scale cleanly in vector renderers, lack guaranteed accessibility names, and fail contrast testing.
**Specification:**
All emojis must be replaced with inline SVG icons having `aria-hidden="true"` and paired with semantic text:
1. **Completar Titulares Icon:** Clean SVG user silhouette with tactical grid dots.
2. **Solo Banca Icon:** Clean SVG bench/interchange rotation icon (`<path d="M4 12h16m-4-4l4 4-4 4..." />`).
3. **Reto Rival Icon:** Clean SVG dual confrontation shields or crossed pennants.

### 7.6 ARIA Live Announcements (`aria-live="polite"`)
A dedicated live region announces state changes:
```html
<div
  id="compose-live-feedback"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="sr-only"
>
  <!-- Dynamic live text injected on user interaction -->
</div>
```

#### Exact Announcement Utterances:
1. **Intent Switch to 1:** `"Convocatoria: Completar mi equipo titular. Selecciona los cupos necesarios en cancha o en la lista."`
2. **Intent Switch to 2:** `"Convocatoria: Solo Banca. Equipo titular completo. Selecciona entre 1 y 4 suplentes y confirma el pacto de rotación."`
3. **Intent Switch to 3:** `"Convocatoria: Reto a equipo rival. Tu equipo está listo. Se abrirán {N} cupos para el equipo rival según el formato {format}."`
4. **Starter Cupos Change:** `"{N} cupos titulares seleccionados para tu equipo."`
5. **Pitch Hole Toggle (Added):** `"Puesto {index + 1}, posición {role}, marcado como cupo abierto en cancha."`
6. **Pitch Hole Toggle (Removed):** `"Puesto {index + 1} desmarcado de la cancha."`
7. **Bench Count Change:** `"{N} suplente(s) para rotación agregados."` (or `"Sin suplentes de banca."` if 0).
8. **Sport / Format Switch:** `"Deporte cambiado a {sportLabel}, formato {format}. {perSide} jugadores por lado, {total} en cancha."`

---

## 8. Sports Format Math & Calculation Matrix

The authoritative function `playersPerSideFromFormat(format)` derives the team capacity:
$$\text{playersPerSide} = \max(1, \text{int}(format.split('v')[0]))$$
$$\text{totalPitchPlayers} = \text{playersPerSide} \times 2$$

| Sport | Format | Default? | `playersPerSide` | Total on Pitch | Outfield Players | Has Keeper? | Default Formation | Allowed Positions | Side B Reto Capacity |
|---|---|---|---|---|---|---|---|---|---|
| `futbol` | `5v5` | Yes | **5** | 10 | 4 | Yes | Diamante (1-2-1) | any, gk, def, mid, fwd | **5** |
| `futbol` | `6v6` | No | **6** | 12 | 5 | Yes | 2-2-1 | any, gk, def, mid, fwd | **6** |
| `futbol` | `7v7` | No | **7** | 14 | 6 | Yes | 2-3-1 | any, gk, def, mid, fwd | **7** |
| `futbol` | `8v8` | No | **8** | 16 | 7 | Yes | 3-3-1 | any, gk, def, mid, fwd | **8** |
| `futbol` | `11v11` | No | **11** | 22 | 10 | Yes | 4-4-2 | any, gk, def, mid, fwd | **11** |
| `futbol_sala` | `5v5` | Yes | **5** | 10 | 4 | Yes | 1-2-1 (Diamante) | any, gk, cierre, ala, pivot | **5** |
| `basquet` | `3v3` | No | **3** | 6 | 3 | No | 1-1-1 (Triángulo) | any, base, ala, pivot | **3** |
| `basquet` | `5v5` | Yes | **5** | 10 | 5 | No | 2-1-2 (Clásica) | any, base, escolta, ala, ala_pivot, pivot | **5** |
| `voleibol` | `2v2` | No | **2** | 4 | 2 | No | 1-1 (Paralelo) | any, armador, receptor | **2** |
| `voleibol` | `6v6` | Yes | **6** | 12 | 6 | No | 5-1 (Un armador) | any, armador, central, opuesto, receptor, libero | **6** |
| `padel` | `2v2` | Yes | **2** | 4 | 2 | No | Clásica (2) | any, drive, reves | **2** |
| `padel` | `4v4` | No | **4** | 8 | 4 | No | 2-2 | any, drive, reves | **4** |

---

## 9. Acceptance Criteria & Test Cases (Tier 1–4)

### Tier 1: Domain Invariants & Format Math Unit Tests (Vitest)
- **T1.01:** `playersPerSideFromFormat` returns exactly 5 for "5v5", 6 for "6v6", 7 for "7v7", 8 for "8v8", 11 for "11v11", 3 for "3v3", 2 for "2v2", and fallback 5 for null/invalid.
- **T1.02:** Intent 1 generator produces `side = 'a'` and `slot_role = 'starter'` for all open pitch holes.
- **T1.03:** Intent 1 generator appends `side = 'a'` and `slot_role = 'bench'` when `benchCount > 0`.
- **T1.04:** Intent 2 generator produces **0 starter slots** and strictly `benchCount` slots with `side = 'a'` and `slot_role = 'bench'`.
- **T1.05:** Intent 2 validation fails if `benchCount < 1` or `benchCount > 4`.
- **T1.06:** Intent 2 validation enforces non-empty `rotation_rule` between 2 and 120 characters.
- **T1.07:** Intent 3 generator produces exactly `playersPerSideFromFormat(format)` starter slots with `side = 'b'` and `slot_role = 'starter'`.
- **T1.08:** Intent 3 sets `match_mode = 'challenge'` on the match object.
- **T1.09:** `parseTeamName` accepts 2–60 chars, trims whitespace, and rejects < 2 or > 60 chars.
- **T1.10:** `parseRotationRule` accepts 2–120 chars and rejects empty/spaces.
- **T1.11:** `matchDisplayStatus` returns `"challenge_open"` when `match_mode = 'challenge'` and side B has open slots.
- **T1.12:** `matchDisplayStatus` returns `"bench_only"` when all starters are confirmed and only bench slots are open.
- **T1.13:** Outfield sum check validates that for soccer 7v7, outfield lines sum to 6.
- **T1.14:** Volleyball 6v6 validates all 6 player spots with positions `['armador', 'central', 'opuesto', 'receptor', 'libero']`.
- **T1.15:** No slot payload permits illegal combinations (e.g. `side = 'b'` in `match_mode = 'pickup'`).

### Tier 2: Component State, Roving Tabindex & ARIA Tests (Vitest + Testing Library)
- **T2.01:** Radiogroup renders with `role="radiogroup"` and 3 children with `role="radio"`.
- **T2.02:** Exactly one radio card has `tabindex="0"` and `aria-checked="true"`; the other two have `tabindex="-1"` and `aria-checked="false"`.
- **T2.03:** Pressing `ArrowRight` on Option 1 shifts focus and selection to Option 2; updates `tabindex="0"`.
- **T2.04:** Pressing `ArrowRight` on Option 3 wraps around to Option 1.
- **T2.05:** Pressing `ArrowLeft` on Option 1 wraps around to Option 3.
- **T2.06:** Selecting Option 2 ("Solo Banca") unmounts/hides the pitch starter hole picker.
- **T2.07:** Selecting Option 2 forces bench count to be between 1 and 4 (defaults to 2) and renders rotation pact select.
- **T2.08:** Selecting Option 3 ("Reto a Rival") displays rival format calculation text matching `playersPerSideFromFormat(activeFormat)`.
- **T2.09:** Switching intents updates the `aria-live="polite"` container with the exact announcement string.
- **T2.10:** Adding a bench slot updates the live region with `"{N} suplente(s) para rotación agregados."`
- **T2.11:** All interactive buttons meet minimum target size (min-height ≥ 24px, default 44px).
- **T2.12:** All vector SVG icons have `aria-hidden="true"` and adjacent text labels.

### Tier 3: Server Action Payload, DB Integrity & Rollback Tests
- **T3.01:** `createMatchAction` successfully parses and inserts Intent 1 match with 3 starters and 1 bench.
- **T3.02:** `createMatchAction` successfully parses Intent 2 with `open_count = 0` and `bench_count = 2`, generating 2 bench slots without throwing open_count validation error.
- **T3.03:** `createMatchAction` successfully parses Intent 3 for Volleyball 6v6, setting `match_mode = 'challenge'` and inserting 6 Side B slots.
- **T3.04:** Attempting to insert Side B slots with `match_mode = 'pickup'` triggers DB trigger rejection `'No se puede abrir el lado B asi'`.
- **T3.05:** Attempting to insert > 16 Side B slots in challenge mode triggers DB trigger rejection `'El lado B ya tiene el maximo de cupos'`.
- **T3.06:** When `match_slots` insertion fails, rollback executes: `supabase.from("matches").delete().eq("id", match.id)`.
- **T3.07:** When pricing override is malformed, match and slots are rolled back.
- **T3.08:** RPC `accept_challenge_full_team` accepts challenge, assigns rival captain, and fills first side B slot.
- **T3.09:** RPC `accept_challenge_full_team` rejects if caller is the match host (`'No puedes retar a tu propio equipo.'`).
- **T3.10:** RPC `accept_challenge_full_team` rejects if individual players have already been accepted on Side B.

### Tier 4: End-to-End User Journeys & WCAG 2.2 AA Compliance
- **T4.01: Journey 1 (Host recruits starters + bench):** User selects sport Fútbol 5v5, picks venue, chooses Intent 1 ("Completar Titulares"), marks 2 holes on tactical pitch, toggles bench to 1, submits form. Match page displays 2 open starter slots on pitch and 1 bench slot.
- **T4.02: Journey 2 (Host recruits solo banca):** User selects sport Fútbol 7v7, chooses Intent 2 ("Solo Banca"), sets bench count to 2, selects "Rotación fija cada 15 min", submits. Match page displays "Titulares Completos", status `"bench_only"`, and 2 open bench slots.
- **T4.03: Journey 3 (Host creates challenge):** User selects sport Voleibol 6v6, chooses Intent 3 ("Reto a Rival"), inputs team name "Halcones", sets target level "mid", submits. Match page displays `match_mode = 'challenge'`, status `"challenge_open"`, Side A "Halcones", and Side B with 6 open rival slots.
- **T4.04: Journey 4 (Keyboard-only navigation):** Entire creation step 2 operated without a mouse using only `Tab`, `ArrowLeft/Right/Up/Down`, `Space`, and `Enter`.
- **T4.05: Journey 5 (Screen reader simulation):** Virtual assistive tech observes clean sequence of live announcements with zero unannounced dynamic DOM updates.
- **T4.06: Journey 6 (Visual contrast audit):** Automated color contrast pass confirms zero nodes fail WCAG 2.2 AA (normal text ≥ 4.5:1, UI components ≥ 3:1).
- **T4.07: Journey 7 (Focus not obscured):** Sticky footer bar does not obscure focused inputs when scrolling or focusing via keyboard (WCAG 2.4.11).
- **T4.08: Journey 8 (Reduced motion check):** CSS honors `prefers-reduced-motion: reduce` with 0.01ms animations for pitch pulse dots.
