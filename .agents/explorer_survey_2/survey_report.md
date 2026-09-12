# Informe de Inspección UI/UX y Arquitectura de Componentes: Flujo de Creación y Configuración de Cupos en BaFut

**Fecha:** 2026-09-10  
**Agente:** explorer_survey_2 (UI/UX & Component Architecture Explorer)  
**Proyecto:** BaFut (Next.js 16.3.4, React 19.2.8, Tailwind CSS v4, PostgreSQL/Supabase)

---

## 1. Resumen Ejecutivo

Este informe documenta el estado actual del flujo de creación de partidos, selección de cupos ("huecos"), visualización táctica en cancha, controles de banca/rotación, sistema de diseño y accesibilidad en BaFut, evaluando la brecha técnica y de experiencia de usuario frente a los requerimientos de la refundación didáctica por intención (**R1: 3 Intenciones Mutuamente Excluyentes**, **R2: Tablero Visual Táctico Dual "Live Match Board"**, **R3: Integridad de Payload y Base de Datos**, y **R4: Cumplimiento WCAG 2.2 AA**).

### Hallazgos Principales:
1. **Dispersión Cognitiva en el Wizard**: La creación está dividida en dos pasos ("01 Dónde" y "02 Cuándo y cupos"). En el paso 1 el usuario interactúa con un `FormationPicker` de media cancha (Lado A), pero los cupos faltantes, la banca y el modo reto se eligen en el paso 2, donde la cancha ya no se visualiza.
2. **Ausencia de la Intención "Solo Banca"**: Actualmente, el formulario exige obligatoriamente entre 1 y 12 cupos titulares (`open_count >= 1`). No existe un camino para convocar exclusivamente suplentes bajo el pacto de rotación sin abrir titulares ficticios.
3. **Desconexión del Modo Reto con la Pizarra Táctica**: Al seleccionar "Buscar equipo rival", el formulario solo muestra dos campos de texto/select (`host_team_name` y `challenge_target_level`), sin mostrar el enfrentamiento dual `[Mi Equipo (A)] vs [Equipo Rival (B)]`, ni permitir elegir entre reto a equipo completo o cupos abiertos para agentes libres.
4. **Pizarra Táctica Existente Desaprovechada en Creación**: BaFut ya cuenta con `MatchPitchBoard.tsx` (que renderiza líneas oficiales de cancha para los 5 deportes, ambos lados A y B, y zona de banca), pero actualmente solo se utiliza en la página de detalle `/p/[code]` y en `OccupancyBanner.tsx`. En la creación se usa `FormationPicker.tsx`, un componente limitado a la mitad izquierda con líneas de fútbol genéricas hardcodeadas.
5. **Incumplimientos del Sistema de Diseño y Accesibilidad**: Existen botones con emojis directos como iconos ("👤 Completar mi equipo", "⚔️ Buscar equipo rival", "🔄 Rotación / Banca"), estilos en línea con colores pastel no permitidos (`#a8e6cf`), ausencia de soporte de teclado por flechas en los selectores de modo y áreas de toque táctil en los spots de cancha inferiores al estándar de 44×44px.

---

## 2. Mapa Arquitectónico del Flujo de Partidos

### 2.1 Rutas y Jerarquía de Componentes

```
app/
├── partidos/
│   ├── page.tsx                           # Feed de partidos
│   └── nuevo/
│       └── page.tsx                       # Página Server Component (autenticación, ciudad activa, canchas)
│           └── CreateMatchForm.tsx        # Client Component principal (~1,068 líneas, 42KB)
│               ├── FormationPicker.tsx    # Pizarra táctica Lado A (actualmente en Paso 1)
│               │   └── SVG Cancha (360x220)
│               ├── VenuePicker.tsx        # Selector de canchas filtrado por deporte
│               ├── VenueDayTimeline.tsx   # Timeline de disponibilidad horaria
│               ├── VenueRateHint.tsx      # Estimación de tarifa y split por persona
│               ├── OccupancyBanner.tsx    # Alerta de conflicto de cancha (usa MatchPitchBoard)
│               └── VenueMapLazy.tsx       # Mapa del recinto seleccionado
└── p/[code]/
    ├── page.tsx                           # Detalle de partido publicado
    │   ├── MatchFormationSection.tsx      # Sección de formación (usa MatchPitchBoard)
    │   │   └── MatchPitchBoard.tsx        # Tablero táctico dual completo (Lado A vs Lado B + Banca)
    │   ├── SlotList.tsx                   # Lista de cupos (Starters vs Bench, Side A vs Side B)
    │   ├── AcceptChallengeCard.tsx        # CTA para retar / aceptar reto
    │   └── OpenSideBForm.tsx              # Formulario para abrir lado B en partido existente
    └── editar/
        └── page.tsx                       # Edición de partido (reutiliza CreateMatchForm en modo edit)
```

---

## 3. Análisis en Profundidad de Componentes Existentes

### 3.1 `components/CreateMatchForm.tsx`

- **Modelo de Estado**:
  - Utiliza `useState` puro con más de 25 variables desnormalizadas (`sport`, `format`, `formationId`, `pitchOpenSlots`, `position`, `matchMode`, `hostTeamName`, `benchCount`, `rotationRule`, `challengeTargetLevel`, `step`, `openCount`, `startsAt`, `venueId`, etc.).
  - No usa librerías de formularios pesadas (ni React Hook Form ni Zustand), lo cual mantiene el bundle liviano pero genera acoplamiento manual y riesgo de estados inconsistentes.
  - La sincronización hacia el servidor se efectúa mediante `<form action={action}>` utilizando `useActionState(..., null)` conectado a `createMatchAction` o `updateMatchAction`.
  - La comunicación de valores complejos se hace a través de `<input type="hidden">`:
    - `pitch_slots_json`: Serialización JSON de los cupos marcados en `FormationPicker`.
    - `match_mode`: Valor `"pickup"` o `"challenge"`.
    - `bench_count` y `rotation_rule`.
    - `host_team_name` y `challenge_target_level`.

- **Paso 1 ("01 Dónde") vs Paso 2 ("02 Cuándo y cupos")**:
  - En el **Paso 1**: Se escoge Deporte (chips), Formato (chips), `FormationPicker` (pizarra Lado A) y Cancha (`VenuePicker`).
  - En el **Paso 2**: Se escoge Fecha/Hora, Duración, y luego el grupo "02 · Convocatoria y Cupos" que incluye:
    - Selector de modo: `matchMode === "pickup"` ("👤 Completar mi equipo") vs `matchMode === "challenge"` ("⚔️ Buscar equipo rival").
    - En modo pickup: Input numérico `open_count` (1 a 12) y chips rápidos [2, 4, 6]. Si el usuario marcó huecos en el Paso 1, este input se bloquea con el texto: *"Estás usando N huecos marcados en la cancha interactiva."* pero el usuario ya no puede ver la cancha. Si el usuario toca un chip rápido en el Paso 2, se ejecuta `setPitchOpenSlots([])`, borrando silenciosamente la selección táctica del Paso 1.
    - Controles de suplentes: Chips [0, 1, 2, 3, 4] y selector de regla de rotación (`ROTATION_RULES`).
    - En modo reto: Campos para `host_team_name` y `challenge_target_level`.

### 3.2 `components/FormationPicker.tsx`

- **Visualización Táctica Limitada**:
  - Renderiza un `<svg viewBox="0 0 360 220">`.
  - Fondo fijo verde sintético `<rect fill="#0c6b4c" />` con una geometría fija de fútbol:
    ```svg
    <rect x="40" y="28" width="140" height="164" />
    <line x1="180" y1="28" x2="180" y2="192" />
    ```
  - **Crítico**: Ignora el deporte seleccionado (básquet, vóley, pádel o futsal se muestran con el mismo dibujo de medio campo de fútbol 11).
  - Solo renderiza `board.dots.filter((d) => d.side === "a")`. No contempla Lado B ni banca.
  - La interacción de marcado modifica el estado local `openSlots: PitchOpenSlot[]` (índice táctico y rol sugerido).
  - **Accesibilidad**: Los círculos tienen `role="button"` y `tabIndex={0}`, pero carecen de `aria-label` descriptivo (ej. *"Posición Defensa central, libre. Presione para seleccionar"*). El radio SVG es de 8px (abierto 11px), lo que sin padding adicional incumple el tamaño táctil de 44×44px para dedos en móviles.

### 3.3 `components/MatchPitchBoard.tsx`

- **Potencial Existente**:
  - Cuenta con la función `CourtLines({ sport })` que dibuja las líneas reglamentarias exactas de los 5 deportes soportados:
    - `futbol`: Área grande, área chica, punto penal, círculo central.
    - `futbol_sala`: Áreas curvadas de 6m y línea continua.
    - `basquet`: Llave, semicírculo de triple y zona restringida.
    - `voleibol`: Red central destacada (strokeWidth 2.6) y líneas de ataque a 3m.
    - `padel`: Líneas de saque y red central.
  - Soporta ambos lados de la cancha simultáneamente: Lado A (izquierdo) y Lado B (derecho con `mirrorX`).
  - Renderiza la zona inferior de suplentes (`match-pitch-bench-group` en `y = 192` y `y = 206`) con etiqueta *"BANQUILLO / ROTACIÓN"* y glifos `⇄`.
  - **Limitación Actual**: Actualmente está configurado como componente de lectura o selección de mitad completa (Side Hits para *"Voy con ellos"* vs *"Voy en contra"*). No tiene modo interactivo de selección de puestos individuales para el creador del partido.

### 3.4 Controles de Suplentes y Reglas de Rotación

- **Catálogo de Reglas** (`lib/constants.ts`):
  ```ts
  export const ROTATION_RULES = [
    "Rotación activa continua",
    "Cambios cada 15 min",
    "Por cansancio / lesión",
    "Acordado en cancha",
  ] as const;
  ```
- **Problema de Modelado**:
  - En la UI actual, la banca es un agregado opcional de 0 a 4 cupos.
  - Si el usuario selecciona 0 banca, la regla de rotación no se envía ni se aplica.
  - Si el usuario quisiera convocar *únicamente* suplentes porque ya tiene su 5 titular confirmado en WhatsApp, no puede: el campo `open_count` lo fuerza a publicar al menos 1 titular.
- **Inconsistencia Visual en `SlotList.tsx`**:
  - En `SlotList.tsx`, la banca y la rotación usan estilos en línea:
    ```tsx
    <p style={{ fontSize: "0.9rem", color: "#a8e6cf", marginBottom: "1rem" }}>
      ⏱️ <strong>Pacto de juego:</strong> {rotationRule}
    </p>
    <span style={{ background: "rgba(168, 230, 207, 0.2)", color: "#a8e6cf", ... }}>
      🔄 Rotación / Banca
    </span>
    ```
  - Esto viola la regla de diseño `DESIGN.md` (no usar colores pastel desvinculados de los tokens `--turf`, `--flood`, `--paper`, `--ink`, `--bib`, `--chalk`).

---

## 4. Sistema de Diseño y Estilos en BaFut

### 4.1 Identidad de Marca y Filosofía ("El Reflector en la Cancha")

De acuerdo con `DESIGN.md`, BaFut tiene una identidad tipográfica y cromática muy estricta:

| Token | Hex / Valor | Rol en UI |
|---|---|---|
| `--turf` | `#0c6b4c` | Acento estructural, links, chips activos, bordes |
| `--turf-deep` | `#073828` | Chrome oscuro: headers, nav móvil, anillo externo de focus |
| `--flood` | `#ffd25a` | CTA primaria (`btn-flood`), reflector, foco |
| `--bib` | `#c42a16` | Urgencia: cupos vacíos ("huecos"), alertas, errores |
| `--paper` | `#dff3e6` | Superficie base de operación y formularios |
| `--ink` | `#10231c` | Tipografía principal y líneas divisorias |
| `--chalk` | `#d9f2a5` | Líneas de cancha y texto sobre turf-deep |
| `--mist` | `#c8e6d4` | Verde claro de apoyo atmosférico |

### 4.2 Reglas Clave del Sistema:
1. **The Square Kit Rule**: Esquinas rectas (`border-radius: 0`) en botones, chips, inputs y contenedores. La forma de píldora (`border-radius: 999px`) se reserva **exclusivamente** para badges numéricos y toasts.
2. **The Bib Is Urgency Rule**: El color `--bib` se usa únicamente para indicar cupos faltantes y estados de alerta. Nunca para decoración.
3. **The Flat-By-Default Rule**: No se usan tarjetas redondeadas con sombras suaves tipo SaaS. La jerarquía se establece mediante bordes de 1px, la línea lateral de 3px (`sideline`) y capas tonales con `color-mix(in oklab, ...)`.
4. **The Jersey Type Rule**: Encabezados en **Barlow Condensed** en mayúsculas. Textos y ledes en **Outfit**. Metadatos (hora, cupos, chips, filtros) en **IBM Plex Mono**.

### 4.3 Inventario de Anti-patrones Detectados en el Código Actual:
- **Uso de emojis crudos como iconos**: Botones como `"👤 Completar mi equipo"`, `"⚔️ Buscar equipo rival"`, `"🔄 Rotación / Banca"`, `"⏱️ Pacto de juego"`. Los lectores de pantalla verbalizan estos caracteres de manera dispar y ensucian la identidad visual. Deben sustituirse por SVGs limpios con `aria-hidden="true"` y texto accesible.
- **Estilos en línea (`style={{ ... }}`)**: Presentes en `SlotList.tsx` con colores fuera del catálogo (`#a8e6cf`).
- **Dispersión de controles**: La configuración de los cupos está separada en tres bloques desconectados (Formación en paso 1, cupos en paso 2, banca en paso 2).

---

## 5. Análisis de Brecha (Gap Analysis)

### Brecha 1: Tres Intenciones Mutuamente Excluyentes (R1)

| Aspecto | Estado Actual | Requerimiento R1 | Brecha Técnica |
|---|---|---|---|
| **Intenciones disponibles** | 2 modos en paso 2 (`pickup` vs `challenge`) | 3 intenciones explícitas: 1) Completar Titular, 2) Solo Banca, 3) Reto a Rival | No existe selector unificado de intención en el inicio del flujo de cupos. |
| **Completar Titular** | Input numérico `open_count` desconectado de la cancha del paso 1 | Selección directa sobre la cancha táctica con roles sugeridos + toggle opcional para sumar banca | Pizarra táctica está confinada al paso 1; paso 2 usa input numérico que borra la selección al cambiar. |
| **Solo Banca / Suplentes** | Inexistente. Requiere `open_count >= 1` | 0 titulares en cancha. Selector numérico de suplentes (1 a 4) + Pacto de Rotación activo obligatorio | La base de datos y la acción de servidor no permiten crear partidos sin slots titulares si el modo es `pickup`. |
| **Reto a Equipo Rival** | Formulario simple de 2 inputs de texto/select | Vista de enfrentamiento `[Mi Equipo (A)] vs [Equipo Rival (B)]`, permitiendo elegir equipo completo o cupos libres rivales | Falta la opción de modelado entre reto completo y cupos libres, y la visualización de ambos equipos. |

### Brecha 2: Tablero Visual Táctico Dual "Live Match Board" (R2)

| Aspecto | Estado Actual | Requerimiento R2 | Brecha Técnica |
|---|---|---|---|
| **Componente en Creación** | `FormationPicker.tsx` (medio campo, solo Side A, líneas fijas de fútbol) | `LiveMatchBoard` interactivo y accesible en tiempo real | `MatchPitchBoard.tsx` tiene las capacidades de renderizado dual pero no está conectado a la creación ni permite selección de slots en vivo. |
| **Lado A (Anfitrión)** | Muestra puntos verdes sin distinguir titulares confirmados vs vacíos en el paso 2 | Diferenciación visual: Titulares confirmados por el creador vs cupos abiertos vs banca de rotación | En el paso 2 no hay feedback visual de cómo queda compuesto el equipo. |
| **Lado B (Rival)** | Ausente en el formulario de creación | Representación explícita de los cupos del equipo rival según el formato (ej. 6 en vóley 6v6) | El creador no tiene confirmación visual de cuántos jugadores componen el rival. |
| **Contexto de Formato Deportivo** | No se refleja la cantidad de jugadores en la pizarra de creación | Cálculo automático de `playersPerSideFromFormat` reflejado inmediatamente en ambas mitades | El cálculo está en helpers pero no se proyecta a la UI de creación en tiempo real. |

### Brecha 3: Integridad de Payload y Base de Datos (R3)

| Requisito | Estado Actual | Requerimiento R3 | Validación de Seguridad |
|---|---|---|---|
| **`slotsPayload` tipado** | Se genera en `createMatchAction` combinando ramas condicionales no armonizadas | Generación 100% tipada según intención: `side: 'a' \| 'b'`, `slot_role: 'starter' \| 'bench'`, `pitch_index`, `level` | Debe garantizar que en "Solo Banca" no se envíen `starters`, y que en "Reto" se respete el trigger de base de datos. |
| **Trigger PostgreSQL `guard_slot_side_insert`** | Permite inserción de `side = 'b'` **únicamente** si `match_mode = 'challenge'` | Cualquier intento de insertar `side = 'b'` en modos pickup lanzará excepción `No se puede abrir el lado B asi` | Las intenciones 1 y 2 deben generar estrictamente `side = 'a'`. La intención 3 debe establecer `match_mode = 'challenge'`. |
| **Validación de Límites** | Valida entre 1 y 12 cupos totales sin comprobar contra el límite del formato | Validación atómica contra `playersPerSideFromFormat` y reglas de rotación | No permitir seleccionar más titulares que los permitidos por el formato deportivo (ej. máx 5 en fútbol 5v5). |

### Brecha 4: Accesibilidad WCAG 2.2 AA (R4)

| Criterio WCAG | Estado Actual | Requerimiento R4 | Plan de Acción |
|---|---|---|---|
| **Operación por Teclado** | Chips en `role="group"` sin navegación por flechas | `role="radiogroup"` con soporte nativo de `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`, `Space` y `Enter` | Implementar `onKeyDown` en el grupo de intenciones con gestión de foco accesible. |
| **Iconografía no textual** | Emojis en el texto de los botones (`👤`, `⚔️`, `🔄`) | Iconos vectoriales SVG limpios con texto descriptivo accesible y `aria-hidden="true"` | Crear componentes de icono SVG nativos con diseño BaFut (sin dependencias externas). |
| **Anuncios en Vivo** | Contenedor `aria-live="polite"` solo presente en el botón submit | Anuncios dinámicos en vivo al cambiar de intención o sumar/quitar cupos | Incorporar `aria-live="polite"` que verbalice: *"Intención cambiada a Solo Banca. Selecciona entre 1 y 4 suplentes."* |
| **Áreas de Toque (Target Size)** | Círculos SVG de 8px a 11px en cancha interactiva | Mínimo 44×44px (2.75rem) en controles interactivos | Añadir círculos invisibles transparentes de `r={22}` (`pointer-events: fill`) envolviendo cada spot táctico. |

---

## 6. Propuesta de Arquitectura de Componentes y Estado

Para cerrar la brecha sin romper la estabilidad del repositorio ni vulnerar las restricciones de Next.js (`AGENTS.md`), se define la siguiente arquitectura técnica:

### 6.1 Tipado de Intención y Modelo de Datos

```ts
export type MatchIntent = "fill_starters" | "bench_only" | "rival_challenge";

export type ChallengeRivalType = "full_team" | "open_slots";

export type SlotIntentPayloadItem = {
  side: "a" | "b";
  slot_role: "starter" | "bench";
  pitch_index: number | null;
  position: Position;
  level: Level;
};
```

### 6.2 Jerarquía de Componentes Propuesta

```
components/
├── CreateMatchForm.tsx                  # Orquestador del formulario y envío
│   ├── MatchIntentSelector.tsx          # Selector accesible de 3 intenciones (RadioGroup WCAG 2.2)
│   │   ├── IntentOption: "Completar mi Equipo Titular"
│   │   ├── IntentOption: "Solo Banca / Suplentes"
│   │   └── IntentOption: "Reto a Equipo Rival"
│   ├── LiveMatchBoard.tsx               # Tablero dual en vivo Lado A vs Lado B
│   │   ├── CourtLines (futbol, sala, basquet, voley, padel)
│   │   ├── PitchSpotsSideA (Titulares confirmados vs huecos abiertos)
│   │   ├── PitchSpotsSideB (Equipo rival completo vs cupos libres rivales)
│   │   └── PitchBenchArea (Suplentes y pacto de rotación)
│   ├── IntentControls/
│   │   ├── FillStartersControls.tsx     # Selector de formación, slots en cancha, toggle de banca
│   │   ├── BenchOnlyControls.tsx        # Contador de suplentes (1-4) y Pacto de Rotación obligatorio
│   │   └── RivalChallengeControls.tsx   # Nombre equipo anfitrión, nivel, modo rival (completo vs cupos)
│   └── VenueDayTimeline / VenueRateHint / etc.
```

### 6.3 Especificación de Estados por Intención

#### 1. Intención 1: "Completar mi Equipo Titular"
- **Estado UI**:
  - Pizarra Lado A activa e interactiva con roles sugeridos.
  - El usuario puede tocar las posiciones faltantes (ej. 2 huecos de 5 en fútbol 5v5). Los restantes 3 se marcan visualmente como *"Confirmados con amigos / creador"*.
  - Toggle opcional: `¿Sumar suplentes a la banca?`. Al activarse, permite elegir 1 a 4 suplentes y seleccionar la regla de rotación.
- **Payload a Servidor**:
  - `match_mode`: `'pickup'`
  - Slots generados: `side = 'a'`, `slot_role = 'starter'`, `pitch_index` asignado.
  - Si hay banca: slots adicionales con `side = 'a'`, `slot_role = 'bench'`, `pitch_index = null`.

#### 2. Intención 2: "Solo Banca / Suplentes"
- **Estado UI**:
  - Pizarra Lado A muestra todos los titulares completos (color flood o ink, sin huecos abiertos en cancha).
  - No se pide marcar puestos en cancha.
  - Selector de banca obligatorio (1 a 4 cupos).
  - Selector de **Pacto de Rotación** obligatorio y desplegado de forma prominente.
- **Payload a Servidor**:
  - `match_mode`: `'pickup'`
  - Slots generados: **0 starters**. Únicamente los `bench_count` seleccionados con `side = 'a'`, `slot_role = 'bench'`, `pitch_index = null`.
  - `rotation_rule`: String obligatorio no nulo.

#### 3. Intención 3: "Reto a Equipo Rival"
- **Estado UI**:
  - Pizarra Dual interactiva:
    - **Lado A**: Muestra el equipo anfitrión completo con el nombre opcional del equipo (`host_team_name` o "Mi Equipo").
    - **Lado B**: Muestra el equipo rival con exactamente `playersPerSideFromFormat(format)` cupos.
  - Selector de tipo de reto:
    - *"Esperar equipo rival completo"* (un capitán rival tomará todos los cupos vía `accept_challenge_full_team`).
    - *"Cupos abiertos para agentes libres rivales"* (jugadores individuales pueden ir tomando los cupos del Lado B).
  - Selector de nivel esperado del rival (`challenge_target_level`).
- **Payload a Servidor**:
  - `match_mode`: `'challenge'`
  - `host_team_name`: String sanitizado (2 a 60 chars).
  - Slots generados: `side = 'b'`, `slot_role = 'starter'`, cantidad igual a `playersPerSideFromFormat(format)`.

---

## 7. Estrategia de Verificación y Pruebas

1. **Pruebas Automatizadas en Vitest** (`lib/challenge-match.test.ts` o nuevo `lib/match-intent.test.ts`):
   - Verificar la función de construcción de `slotsPayload` para las 3 intenciones:
     - `buildSlotsPayloadForIntent('fill_starters')`: genera solo slots `side = 'a'`, titulares con `pitch_index` válido y suplentes en `slot_role = 'bench'`.
     - `buildSlotsPayloadForIntent('bench_only')`: genera estrictamente slots con `slot_role = 'bench'`, 0 titulares, y valida que `rotation_rule` esté presente.
     - `buildSlotsPayloadForIntent('rival_challenge')`: genera slots `side = 'b'`, `slot_role = 'starter'`, con cantidad exacta de jugadores según el formato deportivo (ej. 6 para voleibol 6v6, 5 para futsal 5v5).
2. **Prueba de Integridad en PostgreSQL**:
   - Verificar que al invocar la inserción con `side = 'b'`, `match_mode` sea `'challenge'` para no disparar la excepción de `private.guard_slot_side_insert()`.
3. **Auditoría de Accesibilidad (WCAG 2.2 AA)**:
   - Navegación completa por teclado (`Tab`, `ArrowKeys`, `Space`, `Enter`).
   - Contraste de colores verificado >= 4.5:1 en todos los textos sobre `--paper` y `--turf`.
   - Elementos interactivos táctiles con `min-width: 44px` y `min-height: 44px`.

---

*Reporte compilado para su entrega y posterior orquestación de implementación.*
