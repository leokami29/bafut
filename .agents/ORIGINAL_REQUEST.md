# Original User Request

## 2026-09-10T23:06:58Z

Rediseño integral de la UI/UX y modelo de datos del flujo de creación y configuración de cupos ("huecos") en BaFut, implementando una arquitectura didáctica guiada por intención (Titulares Faltantes, Banca/Rotación, Reto a Equipo Rival, y Cupos Abiertos para Rivales Libres), con validación atómica, seguridad en base de datos y estricto cumplimiento WCAG 2.2 AA.

Working directory: c:\EstudioALL\2026\BaFut
Integrity mode: development

## Requirements

### R1. Arquitectura Didáctica por Intención (Intent-Driven UI)
Reemplazar los controles dispersos del formulario por 3 intenciones de convocatoria mutuamente excluyentes y visualmente transparentes:
- **Intención 1: "Completar mi Equipo Titular"**: Permite seleccionar en la formación de la cancha los puestos vacíos que faltan (con su rol/posición táctica sugerida o abierta). Opción toggle para sumar suplentes.
- **Intención 2: "Solo Banca / Suplentes"**: Cuando los titulares ya están completos por fuera del app. Solo solicita cantidad de suplentes (1 a 4) y despliega el Pacto de Rotación activo obligatorio.
- **Intención 3: "Reto a Equipo Rival"**: Cuando el equipo anfitrión ya está completo y busca rival. Muestra claramente la vista de enfrentamiento `[Mi Equipo (A)] vs [Equipo Rival (B)]`, permitiendo elegir si se espera un equipo completo o si se abren cupos para agentes libres en el lado rival.

### R2. Tablero Visual Táctico Dual ("Live Match Board")
Proveer un componente visual interactivo y accesible que renderice en tiempo real la composición del partido:
- **Lado A (Anfitrión):** Diferenciación visual clara entre titulares confirmados por el creador vs cupos titulares abiertos vs suplentes de banca con su regla de rotación.
- **Lado B (Rival):** Representación explícita de los cupos del equipo rival (estado "Buscando equipo rival completo" o "N cupos abiertos para rivales").
- Información contextual inmediata de formato (ej. 6v6 en vóley = 6 titulares por lado).

### R3. Integridad y Seguridad en el Payload y Base de Datos
- Generación de `slotsPayload` 100% tipado y sanitizado que asigne estrictamente `side: 'a' | 'b'`, `slot_role: 'starter' | 'bench'`, `pitch_index` y `level`.
- Validación atómica contra los límites del formato deportivo (`playersPerSideFromFormat`) y validación de reglas de rotación para evitar combinaciones de estado inconsistentes.
- Respetar las políticas RLS y los triggers de integridad en PostgreSQL (`guard_slot_side_insert`).

### R4. Accesibilidad y Ergonomía (WCAG 2.2 AA)
- Todos los selectores de intención deben operar con soporte nativo de teclado (`ArrowKeys`, `Space`, `Enter`), roles semánticos (`role="radiogroup"` / `role="radio"` o `fieldset`), etiquetas con contraste mínimo de 4.5:1.
- Iconos vectoriales SVG limpios con texto descriptivo accesible (sin emojis como únicos indicadores).
- Anuncios dinámicos en vivo (`aria-live="polite"`) al cambiar de intención o sumar/quitar cupos.

## Acceptance Criteria

### Claridad Cognitiva y Didáctica
- [ ] La interfaz expone las 3 intenciones de manera prominente en el paso de cupos sin dispersión en múltiples pantallas o pasos desconectados.
- [ ] Al seleccionar "Solo Banca", la formación titular no pide cupos en cancha y se enfoca exclusivamente en suplentes y rotación.
- [ ] En "Reto a Equipo Rival", la UI muestra explícitamente cuántos jugadores conformarán el equipo rival según el formato del deporte seleccionado (ej. 6 para voleibol 6v6, 5 para fútbol 5v5).

### Seguridad y Consistencia de Datos
- [ ] El payload enviado a la acción de servidor (`createMatchAction`) coincide exactamente con la intención elegida:
  - Solo titulares: `side = 'a'`, `slot_role = 'starter'`, `pitch_index` opcional.
  - Titulares + banca: titulares en `slot_role = 'starter'` + suplentes en `slot_role = 'bench'`.
  - Reto: `match_mode = 'challenge'`, slots de rival en `side = 'b'` y `host_team_name` validado.
- [ ] El guardado en PostgreSQL no produce errores de restricciones (triggers de lado B ni RLS) y maneja rollback limpio en caso de fallo.
- [ ] Los tests automatizados en Vitest cubren las 3 intenciones y verifican que ningún slot se cree con combinación inválida de rol/lado.
