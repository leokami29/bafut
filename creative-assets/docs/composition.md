# Motor de composición creativa (Fase 5)

BRIEF → CompositionPlan → AssetPlan → Search → Download → Process → **PenpotAdapter** → Composición → Export

## CreativeBrief

Objetivo de campaña en lenguaje de marketing. Vive en `campaigns/<id>/campaign-source.json`
junto a la `composition`.

```json
{
  "brief": {
    "campaignId": "football-tournament-2026",
    "brandId": "bafut",
    "objective": "Promocionar torneo de fútbol 5",
    "format": { "preset": "ig-portrait", "width": 1080, "height": 1350 },
    "headline": "TORNEO 2026",
    "subheadline": "FÚTBOL 5",
    "callToAction": "INSCRIPCIONES ABIERTAS",
    "ctaUrl": "https://bafut.macuttech.com",
    "visualStyle": "deportivo, energético, nocturno",
    "requirements": ["Espacio negativo superior izquierdo"]
  }
}
```

Presets de formato: `ig-portrait` (1080×1350), `ig-square` (1080×1080), `story` (1080×1920), `landscape` (1920×1080).

## CompositionPlan

Descripción **semántica** de la pieza. Sin coordenadas rígidas: `position` + `sizeHint`
(+ `offset`) y un motor de layout que convierte intención → píxeles.

### Capas (el orden del array = z-order)

| type | Uso | Campos clave |
|---|---|---|
| `image` | foto, cutout, textura, logo | `asset` (id del AssetPlan o `asset_<hash>` real), `fit`, `radius`, `shadow` |
| `overlay` | gradiente/plano sobre foto (legibilidad) | `color`, `gradient: {direction: up/down/left/right, opacity}` |
| `text` | headline, subheadline, cta, logo, body | `content`, `colorFromBrand`, `fontSize?`, `align` |
| `shape` | rectángulo/ellipse/línea decorativa | `shape`, `fill`, `stroke`, `radius` |

Roles canónicos con z-index por defecto: `background(0) → overlay(1) → texture(2) →
decorative(3) → hero(4) → foreground(5) → headline(6) → subheadline(7) → cta(8) → logo(9)`.
Las capas repetidas con el mismo rol: la última queda encima.

### Posicionamiento semántico

`position`: `full | top-left | top | top-right | left | center | right | bottom-left | bottom | bottom-right`
(rejilla de tercios dentro del área segura). `sizeHint: {width?, height?}` en fracciones
del canvas; `offset: {x?, y?}` en px; `rect: {x,y,width,height}` como escape hatch absoluto.
`bleed: true` ignora la safe area (fondos, texturas, overlays).

### Safe areas

Default: `6%` del lado menor, mínimo 48px. El layout NUNCA coloca contenido semántico
fuera de la safe area (evita cortes en stories y bordes de feed).

## AssetPlan

```json
"assets": [
  { "id": "stadium", "role": "background", "query": "football stadium night floodlights" },
  { "id": "hero-player", "role": "hero", "query": "football player action kick",
    "requiresBackgroundRemoval": true },
  { "id": "football", "role": "decorative", "query": "soccer ball close up",
    "requiresBackgroundRemoval": true }
]
```

- `query` → SearchEngine (fase 2). El agente ejecuta `npm run search -- "<query>" --json`,
  elige candidato, y descarga (`npm run asset:download -- pexels-XXXX --query "<query>"`).
- `sourceAssetId` → asset ya existente (salta search/download).
- `requiresBackgroundRemoval` → el plan marca el paso `remove-background` (fase 4).
- `processing` → pasos adicionales del pipeline JSON (fase 4).

## Integración con la marca

`brandId` carga `brands/<id>/brand.json` (Fase 1). La marca tiene PRIORIDAD:
- `colorFromBrand: "flood"` → `#FFD25A` (tokens reales del design system).
- Fuentes: display/headline → `Barlow Condensed 800`; body → `Outfit`; meta → `IBM Plex Mono`.
- `backgroundColor` por defecto → `turf-deep`.
- El plan solo sobreescribe con overrides explícitos (fontFamily, color hex).

## PenpotAdapter

El MCP de Penpot **no es invocable desde Node/CLI** (el agente lo usa vía
`penpot_execute_code` / `penpot_export_shape`). Por eso:

- `ScriptedPenpotAdapter.emit(plan, brand, images)` genera un **script JS determinista**
  usando SOLO capacidades verificadas del plugin API:
  - `penpot.createBoard/createRectangle/createText`
  - `penpot.uploadMediaData(name, Uint8Array)` → imágenes inline (base64) con
    `fills: [{ fillImage }]` — **el caso prioritario son PNG transparentes (cutouts)**
  - gradientes reales (`fillColorGradient`, linear + stops)
  - sombras reales (`shadows: [{ style: "drop-shadow", ... }]`)
  - `font.applyToText` con las fuentes de la marca, z-order por orden de appendChild
- El agente ejecuta el script con `penpot_execute_code`, obtiene `boardId`, y exporta
  con `penpot_export_shape` (png, scale 2).
- `MockPenpotAdapter` registra operaciones para tests (no toca Penpot).

Sombras: soportadas vía `shadows` del plugin API (drop-shadow). Efectos complejos no
existentes en el API NO se simulan — se generarían como imágenes procesadas (fase 4).

## CLI

```bash
# 1. validar el plan, ver assets necesarios y guardar manifiesto
npm run campaign:create -- creative-assets/campaigns/<id>/campaign-source.json

# 2. con los assets ya descargados/procesados, generar el script para Penpot
npm run campaign:create -- ... --emit-script
#   → campaigns/<id>/penpot/compose.js  (el agente lo ejecuta con penpot_execute_code)
```

## Flujo completo (rol del agente)

1. `npm run campaign:create ...` → valida y lista: assets FALTA/PROCESAR/LISTO + queries.
2. `npm run search -- "<query>" --json` → elegir candidato (el agente decide).
3. `npm run asset:download -- pexels-XXXX --query "<query>"`.
4. (si aplica) `npm run asset:process -- asset_XXX --remove-background [--resize ...]`.
5. `npm run campaign:create ... --emit-script` → script listo.
6. El agente ejecuta el script con `penpot_execute_code` y exporta con `penpot_export_shape`.
7. Registrar `penpot.boardId` y exports en el manifiesto (`status: composed/exported`).

## Referencias visuales (preparado, sin IA aún)

`brands/<id>/references/` alimenta la "memoria visual". En fases futuras un análisis
(extraído por el agente) puede expresarse como reglas en el CompositionPlan
(gradient strengths, densidad, tratamiento fotográfico) — la estructura de capas ya
admite esas decisiones sin cambiar el motor.

## Limitaciones actuales

- La exportación (PNG/JPG/PDF) se ejecuta vía `penpot_export_shape` del agente; el
  adapter no la automatiza desde CLI (limitación real del MCP).
- El layout engine es determinista por tercios; el ajuste fino va por `sizeHint/offset/rect`.
- `logo` aún es texto; cuando exista un asset de logo registrado, usar capa `image`
  con `sourceAssetId` del logo.
