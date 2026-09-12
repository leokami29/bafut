# Project: BaFut Match Creation & Slots Redesign

## Architecture
The BaFut match creation and slot ("hueco") configuration flow is refactored from a fragmented two-step wizard into an integrated, intent-driven architecture backed by atomic validation, database integrity enforcement, and WCAG 2.2 AA compliance.

### Data Flow & Module Boundaries
1. **Presentation Layer (`components/`)**:
   - `CreateMatchForm.tsx`: Unified creation orchestrator connecting venue, sport/format selection, Intent Selector, and the Live Match Board.
   - `MatchIntentSelector.tsx`: Accessible 3-intent switcher (`role="radiogroup"`, roving tabindex with `ArrowKeys`, vector SVG icons, `aria-live="polite"` status announcements).
   - `LiveMatchBoard.tsx`: Dual tactical court board rendering Side A (Host) and Side B (Rival) with court lines for all 5 sports, starter spots, bench rotation area, and format indicators.
2. **Domain & Validation Layer (`lib/`)**:
   - `lib/match-intent-payload.ts`: Pure, atomic payload builder & validator. Validates `startersCount <= playersPerSideFromFormat(format)`, verifies rotation pact rules, prevents illegal side/role combinations, and constructs typed `match_slots` arrays.
   - `lib/formations-catalog.ts` & `lib/sport-rules.ts`: Definitive catalog of sport rules, pitch dimensions, player counts, and formations.
3. **Data Access & Server Layer (`app/actions.ts` & PostgreSQL)**:
   - `createMatchAction`: Server action receiving sanitized intent parameters. Supports `open_count = 0` when `bench_count >= 1` (Intent 2). Enforces `match_mode = 'challenge'` when creating Side B slots (trigger `guard_slot_side_insert` compliance). Atomic rollback on failure.
4. **Testing Track (`test/e2e-match-creation/` & `lib/*.test.ts`)**:
   - Automated testing harness executing Tier 1–4 test cases and publishing `TEST_READY.md`.

---

## Feature Inventory
Every feature identified during the Survey phase is mapped to an assigned milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1: Intención "Completar mi Equipo Titular" | Selección en cancha de titulares faltantes, roles sugeridos, opción toggle de suplentes (1-4) con pacto de rotación | M3 | ORIGINAL_REQUEST § R1, Survey |
| 2 | F2: Intención "Solo Banca / Suplentes" | Titulares ya completos externamente; 0 titulares abiertos en app, 1 a 4 suplentes obligatorios con pacto de rotación activo; cancha muestra titulares completos | M3 | ORIGINAL_REQUEST § R1, Survey |
| 3 | F3: Intención "Reto a Equipo Rival" | Vista de enfrentamiento [Mi Equipo (A)] vs [Equipo Rival (B)], cálculo exacto de rivales según format (`playersPerSideFromFormat`), `match_mode = 'challenge'`, nombre de equipo anfitrión | M3 | ORIGINAL_REQUEST § R1, Survey |
| 4 | F4: Tablero Visual Táctico Dual ("Live Match Board") | Componente interactivo y accesible que renderiza Lado A (confirmados vs abiertos vs banca) y Lado B (rival completo o libres) con líneas para 5 deportes y touch targets >= 44x44px | M2 | ORIGINAL_REQUEST § R2, Survey |
| 5 | F5: Constructor y Validador Atómico de Payload | Función pura `buildMatchSlotsPayload` que valida límites de formato (`playersPerSideFromFormat`), sanitiza roles/lados y previene combinaciones inválidas | M1 | ORIGINAL_REQUEST § R3, Survey |
| 6 | F6: Remediación de `createMatchAction` y Seguridad DB | Soporte para `open_count = 0` en Solo Banca, inserción en `match_slots`, cumplimiento de trigger `guard_slot_side_insert`, políticas RLS y rollback transaccional | M1 | ORIGINAL_REQUEST § R3, Survey |
| 7 | F7: Accesibilidad WCAG 2.2 AA y Ergonomía | Roving tabindex con flechas (`ArrowLeft/Right/Up/Down`), `role="radiogroup"` / `role="radio"`, contraste de texto >= 4.5:1, iconos SVG vectoriales (sin emojis solos), `aria-live="polite"` | M3 | ORIGINAL_REQUEST § R4, Survey |
| 8 | F8: Suite de Pruebas E2E y Validación de Integridad | Harness de pruebas Tiers 1–4 (45+ casos) cubriendo todas las intenciones, límites de formato y combinaciones ilegales, más auditoría forense | M4 / E2E Track | ORIGINAL_REQUEST § Criteria, Survey |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | E2E Testing Suite (Dual Track) | Diseño e implementación de la suite de pruebas automatizadas Tiers 1–4, runners y publicación de `TEST_READY.md` | none | DONE |
| M1 | Domain Logic & Server Action Remediation | `lib/match-intent-payload.ts`, unit tests en Vitest, corrección de `app/actions.ts` (`createMatchAction`) para soportar `open_count = 0` y validación atómica | none | DONE |
| M2 | Live Tactical Dual Board Component | Creación de `components/LiveMatchBoard.tsx` multi-deporte (Lado A vs Lado B, banca, rotación, táctica, touch targets 44x44px) | M1 | DONE |
| M3 | Intent-Driven UI Architecture & WCAG 2.2 AA | `components/MatchIntentSelector.tsx`, refactorización de `CreateMatchForm.tsx`, navegación por teclado, anuncios `aria-live="polite"`, eliminación de emojis | M2 | DONE |
| M4 | Final Milestone: 100% E2E Pass & Integrity Audit | Ejecución del 100% de la suite E2E (Tiers 1–4), endurecimiento adversarial (Tier 5), verificación WCAG 2.2 AA y Forensic Audit | M0, M3 | DONE |

---

## Interface Contracts

### `lib/match-intent-payload.ts` ↔ `app/actions.ts`
```typescript
export type MatchCreationIntent = 'starter_slots' | 'bench_only' | 'challenge';

export interface IntentPayloadInput {
  intent: MatchCreationIntent;
  sport: SportType;
  format: string; // e.g. '5v5', '6v6'
  formationId?: string | null;
  pitchSlots?: Array<{
    pitchIndex: number;
    position?: string;
    level?: string;
  }>;
  starterCount?: number; // for non-pitch starter picks
  benchCount?: number;   // 0 to 4
  rotationRule?: string | null;
  hostTeamName?: string | null;
  challengeModeType?: 'full_team' | 'open_slots';
}

export interface ValidatedMatchPayload {
  matchMode: 'pickup' | 'challenge';
  hostTeamName: string | null;
  rotationRule: string | null;
  slots: Array<{
    side: 'a' | 'b';
    slot_role: 'starter' | 'bench';
    position: string;
    level: string;
    pitch_index: number | null;
  }>;
  totalStartersA: number;
  totalBenchA: number;
  totalRivalB: number;
}

export function buildMatchSlotsPayload(
  input: IntentPayloadInput
): { ok: true; data: ValidatedMatchPayload } | { ok: false; error: string };
```

### `components/MatchIntentSelector.tsx` ↔ `components/CreateMatchForm.tsx`
```typescript
export interface MatchIntentSelectorProps {
  sport: SportType;
  format: string;
  selectedIntent: MatchCreationIntent;
  onIntentChange: (intent: MatchCreationIntent) => void;
  benchCount: number;
  onBenchCountChange: (count: number) => void;
  rotationRule: string;
  onRotationRuleChange: (rule: string) => void;
  hostTeamName: string;
  onHostTeamNameChange: (name: string) => void;
  challengeModeType: 'full_team' | 'open_slots';
  onChallengeModeTypeChange: (mode: 'full_team' | 'open_slots') => void;
}
```

### `components/LiveMatchBoard.tsx` ↔ `components/CreateMatchForm.tsx`
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

---

## Code Layout
- `lib/match-intent-payload.ts`: Ownership M1 (Worker M1)
- `lib/match-intent-payload.test.ts`: Ownership M1 (Worker M1)
- `app/actions.ts`: Ownership M1 (Worker M1)
- `components/LiveMatchBoard.tsx`: Ownership M2 (Worker M2)
- `components/LiveMatchBoard.test.tsx`: Ownership M2 (Worker M2)
- `components/MatchIntentSelector.tsx`: Ownership M3 (Worker M3)
- `components/CreateMatchForm.tsx`: Ownership M3 (Worker M3)
- `tests/e2e-match-creation/`: Ownership M0 (E2E Test Writer / Orchestrator)
- `.agents/`: Agent metadata only
