# Handoff Report: UI/UX & Component Architecture Survey

**Agent:** explorer_survey_2  
**Date:** 2026-09-10  
**Handoff Type:** Hard (Task Complete)

---

## 1. Observation

1. **Rutas y estructura de formulario:**
   - En `app/partidos/nuevo/page.tsx` (líneas 69–76), se monta `CreateMatchForm` con `city`, `venues`, `defaultVenueId`, `currentUserId`, `isPlatformAdmin` y `venueBookingFlagOn`.
   - En `components/CreateMatchForm.tsx` (líneas 123–142, 383–418), el formulario se estructura en 2 pasos secuenciales ("01 Dónde" y "02 Cuándo y cupos") gestionados con `useState<1 | 2>(1)`.
   - La formación táctica se selecciona en el Paso 1 (`FormationPicker`, líneas 498–506), mientras que la cantidad de cupos (`openCount`), el modo de partido (`matchMode`, líneas 693–712) y la banca (`benchCount` y `rotationRule`, líneas 795–831) se configuran en el Paso 2.
   - En el Paso 2, si se seleccionaron cupos interactivos en el Paso 1, el input de cupos se deshabilita (`disabled={pitchOpenSlots.length > 0}`, línea 766), pero la cancha ya no es visible para el usuario. Si el usuario toca un chip de cupo rápido ([2, 4, 6], líneas 770–784), ejecuta `setPitchOpenSlots([])`, borrando silenciosamente la selección táctica anterior.

2. **Carencia de la intención "Solo Banca":**
   - En `CreateMatchForm.tsx` (líneas 693–712), solo existen 2 botones de modo: `"👤 Completar mi equipo"` (`matchMode = "pickup"`) y `"⚔️ Buscar equipo rival"` (`matchMode = "challenge"`).
   - En `app/actions.ts` (`createMatchAction`, líneas 271–274), cuando `matchMode !== "challenge"` y no se usó `pitchParsed`, se lee `open_count`:
     ```ts
     const openCountRaw = Number(formData.get("open_count") ?? "");
     if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12) {
       return { error: "Los cupos deben ser un número entero entre 1 y 12." };
     }
     ```
     Esto obliga a crear como mínimo 1 titular (`slot_role = "starter"`, `side = "a"`). No es posible crear 0 titulares y 1 a 4 suplentes.

3. **Limitación de Pizarras Tácticas:**
   - En `components/FormationPicker.tsx` (líneas 155–165, 166–168), el SVG tiene dimensiones fijas `viewBox="0 0 360 220"` y dibuja líneas fijas de cancha de fútbol (caja `40 28 140 164` y línea `180 28 180 192`), ignorando las dimensiones y líneas reglamentarias de voleibol, básquetbol o pádel. Solo renderiza los dots de `side === 'a'`.
   - En `components/MatchPitchBoard.tsx` (líneas 8–60, 116–183), existe la función `CourtLines({ sport })` con geometrías completas para `futbol`, `futbol_sala`, `basquet`, `voleibol` y `padel`, y renderiza tanto `side A` como `side B` (`mirrorX`) y zona de banca (`match-pitch-bench-group`). Sin embargo, solo se utiliza en `MatchFormationSection.tsx` (detalle de partido `/p/[code]`) y en `OccupancyBanner.tsx`. No se utiliza en la creación de partidos.

4. **Reglas de Base de Datos y Triggers de Lado B:**
   - En `supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql` (líneas 4–58), el trigger `private.guard_slot_side_insert()` establece que si un slot tiene `side = 'b'`, el partido debe tener `match_mode = 'challenge'`; de lo contrario, la inserción aborta con `No se puede abrir el lado B asi`.
   - En `supabase/migrations/20260910000000_bench_and_match_challenges.sql`, se añadieron columnas `match_mode` ('pickup' | 'challenge'), `host_team_name`, `away_team_name`, `challenge_target_level`, `rotation_rule` a `matches`, y `slot_role` ('starter' | 'bench') a `match_slots`.

5. **Anti-patrones de Estilo y Accesibilidad (WCAG 2.2 AA):**
   - Uso de emojis como textos de botón en `CreateMatchForm.tsx`: `"👤 Completar mi equipo"`, `"⚔️ Buscar equipo rival"`.
   - Estilos en línea con colores pastel (`color: "#a8e6cf"`, `background: "rgba(168, 230, 207, 0.2)"`) en `components/SlotList.tsx` (líneas 59, 234–238).
   - Ausencia de soporte de teclado por flechas en el selector de modo (utiliza un simple `role="group"` con etiquetas `<button>`).
   - Círculos interactivos de spot en `FormationPicker.tsx` (líneas 172–176) con radio 8px/11px sin un contenedor táctil de 44×44px.

---

## 2. Logic Chain

1. **Premisa 1 (Desconexión de Flujo):** Dado que la pizarra táctica se ubica en el Paso 1 y la configuración de cupos en el Paso 2 (Obs 1), el usuario no puede correlacionar visualmente los cupos faltantes con la posición táctica en el momento de definir los cupos, y al cambiar números en el Paso 2 se destruye silenciosamente el estado del Paso 1.
2. **Premisa 2 (Imposibilidad de Solo Banca):** Dado que `createMatchAction` valida `openCountRaw >= 1` cuando no es reto (Obs 2), no existe forma de satisfacer la Intención 2 ("Solo Banca / Suplentes") sin modificar tanto la interfaz como la acción de servidor para admitir partidos con 0 titulares abiertos y 1–4 cupos en banca con pacto de rotación obligatorio.
3. **Premisa 3 (Solución de Tablero Dual):** Dado que `MatchPitchBoard.tsx` ya contiene la lógica de dibujo para los 5 deportes y soporte dual de Lado A, Lado B y Banca (Obs 3), la creación del componente interactivo `LiveMatchBoard` debe basarse en la arquitectura geométrica y visual de `MatchPitchBoard`, extendiéndola para responder interactivamente en tiempo real a las 3 intenciones.
4. **Premisa 4 (Consistencia con Triggers):** Dado que el trigger `guard_slot_side_insert()` en PostgreSQL prohíbe `side = 'b'` cuando `match_mode != 'challenge'` (Obs 4), las intenciones 1 ("Completar Titular") y 2 ("Solo Banca") deben generar únicamente slots en `side = 'a'` con `match_mode = 'pickup'`, mientras que la intención 3 ("Reto") debe establecer `match_mode = 'challenge'` e insertar slots en `side = 'b'`.
5. **Premisa 5 (Alineación con DESIGN.md y WCAG 2.2 AA):** La eliminación de emojis, reemplazo por iconos SVG nativos con `aria-hidden`, implementación de `role="radiogroup"` con navegación por flechas, áreas de toque de 44×44px y anuncios dinámicos `aria-live="polite"` (Obs 5) son indispensables para cumplir con `DESIGN.md` y WCAG 2.2 AA.

---

## 3. Caveats

- **No edición de código fuente en esta fase:** De acuerdo con las instrucciones de la misión, esta fase es estrictamente de inspección y análisis de arquitectura. No se han modificado los archivos de producción.
- **Edición de partidos existentes (`/p/[code]/editar`):** El flujo de edición actual filtra únicamente cupos de Lado A (`slots: match.match_slots.filter((slot) => slot.side !== "b")`). La implementación futura de edición deberá definir si un partido en modo reto puede readaptar sus intenciones una vez creado.

---

## 4. Conclusion

La arquitectura actual de BaFut posee sólidos cimientos en el catálogo de deportes (`lib/sport-rules.ts`), catálogo de formaciones (`lib/formations-catalog.ts`), renderizado dual de canchas (`components/MatchPitchBoard.tsx`) y esquema de base de datos (`matches` y `match_slots`).

Sin embargo, el formulario de creación (`CreateMatchForm.tsx`) presenta una dispersión crítica y no soporta la arquitectura guiada por intención requerida. Debe implementarse un componente selector de 3 intenciones accesibles (`role="radiogroup"`), un tablero interactivo dual `LiveMatchBoard` en tiempo real (que reemplace el limitado `FormationPicker`), controles contextuales según intención y una sanitización estricta del payload en `createMatchAction`.

---

## 5. Verification Method

Para verificar independientemente las observaciones y conclusiones:

1. **Ejecutar tests automatizados del dominio:**
   ```powershell
   npx vitest run lib/challenge-match.test.ts
   ```
2. **Inspeccionar el trigger de base de datos:**
   Revisar `supabase/migrations/20260910180000_fix_challenge_side_b_insert_guard.sql` para confirmar la restricción estricta de `match_mode = 'challenge'` para inserciones de `side = 'b'`.
3. **Revisar reporte de inspección completo:**
   Abrir `c:\EstudioALL\2026\BaFut\.agents\explorer_survey_2\survey_report.md`.
