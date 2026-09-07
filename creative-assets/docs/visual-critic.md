# Visual Critic (Fase 8) + crítica visual real (Fase 9)

Evalúa un diseño (CompositionPlan + render opcional) y devuelve un **CritiqueReport
explicable** con problemas accionables. El critic SOLO analiza y propone; el AI Agent
decide aceptar / ignorar / modificar. **Nunca modifica Penpot ni archivos.**

> Principio: el critic nunca debe afirmar una propiedad visual que no haya podido
> observar o inferir de manera justificable.

## Fase 9 — crítica con render real

`critique_composition` acepta `renderedImagePath` + `campaignId`: el PNG DEBE vivir
dentro de `campaigns/<campaignId>/` (contención validada, symlinks incluidos vía
realpath; `file://` y UNC rechazados). El `LocalRenderedVisualAnalyzer` (sharp,
downsample determinista a ≤512px de ancho, límites 20MB/8000px) produce:

- `brightness {mean, variance, score}` — luminancia Rec.601 normalizada.
- `contrast {global, score}` — desviación estándar de luminancia (std 0.25 ≈ 1.0).
  **≠ legibilidad del texto**: solo evidencia global.
- `saturation {mean, variance, score}` — (max−min)/max HSL simplificado; estadística pura.
- `edgeDensity` — (|dx|+|dy|)/2 normalizada; complejidad visual aproximada.
- `visualDensity {score, level: low|medium|high, confidence}` — bordes 40% + var.
  luminancia 30% + var. saturación 30%.
- `whitespace {ratio, regions, largestRegion, confidence}` — tiles vacíos (bordes
  bajos + poca saturación + poca varianza local). No asumimos blanco.
- `quadrantAnalysis` — 4 cuadrantes con brightness/contrast/edges/saturation/energy.
- `balance` — centro de masa de energía (edges 50% + |lum−0.5| 30% + sat 20%);
  desviaciones y score. Asimetría ≠ error: solo evidencia.
- `dominantRegions` / `textLikeRegions` — regiones estadísticas (sin OCR ni
  reconocimiento; confianza ≤0.6 en textLike).

Issues visuales (lenguaje probabilístico, thresholds documentados en
`rendered-critic.ts`): `low-global-contrast` (medium, <0.15), `high-visual-density`
(low, >0.8), `low-whitespace` (low, <0.08), `visual-imbalance` (low, desviación >0.12),
`possible-text-crowding` (low, ≥6 regiones), `possible-low-readability` (medium,
regiones tipo texto sobre bajo contraste).

Las categorías visuales (`readability`, `composition`, `spacing`, `alignment`) se
SUMAN a la evidencia estructural (score+max por categoría) y el `overallScore` se
renormaliza solo con categorías con evidencia. Sin render → `unknown` (no penaliza).

Fingerprint v2: plan + marca + perfil + **features visuales del render** (cambia si
cambia el render; estable para el mismo). Iteraciones: `iteration-N.json` + `latest.json`
con `previousFingerprint`, `newIssues`, `resolvedIssuesPrevious`, `visualSummary`.

## Dos tipos de crítica

| | StructuralCritic (implementada) | VisualCritic sobre render (fase 9: local) |
|---|---|---|
| Input | CompositionPlan + brand + reference profile | PNG renderizado (dentro de campaigns/<id>/) |
| Evidencia | structural · brand · reference | pixel (estadística) |
| Ejemplos | headline ausente, fuera de safe area, overlaps, jerarquía, tokens de marca | bajo contraste global, densidad, whitespace, balance |

`RenderedVisualAnalyzer` es la interfaz; `LocalRenderedVisualAnalyzer` es la
implementación local (fase 9). Futuros: `VisionModelAnalyzer`, `CloudVisionAnalyzer`
(sin APIs externas en esta fase).

## Qué analiza el StructuralCritic (y cómo)

Reutiliza `layout.layerRect`, `defaultSafeArea`, `defaultFontSize` — sin duplicar lógica:

- **Contenido requerido**: headline (critical), CTA (high), logo (low), capa de imagen (high).
- **Safe areas**: rect real de cada capa (no-bleed) contra el área segura del canvas.
  CTA/headline fuera → `high`; otros → `medium`.
- **Solapamientos**: pares de capas importantes con bounding boxes. Para texto usa
  **alto efectivo** (`fontSize × 1.15`, no la celda de layout completa). Clasificación
  contextual: logo sobre hero → aceptable; severo (>50% caja menor) → problem;
  CTA+headline → siempre problem; <15% → aceptable.
- **Jerarquía tipográfica**: headline ≥ 1.4× CTA; subheadline ≤ 0.9× headline;
  body < headline; ≤4 tamaños distintos (reglas configurables).
- **Orden**: background primero; ≤2 dominantes (hero/background).
- **Marca**: `colorFromBrand` con token inexistente → medium; fuente fuera de
  brand.json → low. La marca manda, nunca se reemplaza.
- **Referencia**: solo campos presentes en el ReferenceProfile.

## CritiqueReport

```jsonc
{
  "overallScore": 85,          // media de categorías CON evidencia (0–100)
  "status": "ready",           // critical / needs_revision / ready
  "issues": [{
    "id": "low-global-contrast",    // determinista → comparar run #1 vs #2
    "severity": "medium",
    "category": "readability",
    "message": "Possible low readability due to low global contrast (0.12).",
    "suggestion": "Increase separation between foreground and background elements.",
    "affectedLayerIds": []
  }],
  "strengths": ["typography and colors consistent with brand"],
  "nextActions": ["…"],
  "categories": {
    "readability": { "score": 54, "max": 200, "source": "pixel" },   // structural+pixel suman
    "safe_area": { "score": 100, "max": 100, "source": "structural" },
    "asset_quality": { "score": 0, "max": 0, "source": "unknown" }   // sin evidencia
  },
  "applied": ["structural", "brand", "rendered"]
}
```

Categorías: hierarchy · composition · spacing · alignment · safe_area · typography ·
readability · brand_consistency · asset_quality · reference_consistency ·
missing_content · overlap (extensibles).

Jerarquía de decisiones: **Brand > Campaign requirements > CompositionPlan >
ReferenceProfile > heurísticas**.

## Iteraciones (loop)

- `critiqueFingerprint(plan, brandId, profileId, visualFeatures?)` → hash determinista.
- `saveCritiqueIteration(...)` → `campaigns/<id>/critique/iteration-N.json` + `latest.json`
  con diff (`previousFingerprint`, `newIssues`, `resolvedIssuesPrevious`, `visualSummary`).
- El loop `compose → export → critique → agent decides → apply → compose…` queda
  preparado; **NO existe todavía `apply_critique`** (ni auto-edición).

## MCP tool: `critique_composition`

```jsonc
// entrada
{ "compositionPlan": { ... }, "brandId": "bafut", "referenceProfileBrandId": "bafut",
  "campaignId": "torneo-2026", "iteration": 1,
  "renderedImagePath": "…/campaigns/torneo-2026/output/render.png",
  "includeVisualAnalysis": true }
// salida
{ "fingerprint": "…16hex", "report": { CritiqueReport }, "savedIteration": "…",
  "note": "El critic NO modifica Penpot ni archivos: solo analiza y propone." }
```

## Limitaciones

- Contraste global ≠ legibilidad del texto (se necesitarían regiones de texto reales).
- `textLikeRegions` es heurística de textura, NO OCR; confianza ≤0.6.
- Bounding boxes estructurales: un cutout PNG no llena su bbox.
- Performance: análisis ~50–100ms para 1080×1350 (downsample 512px, O(n) por métrica).
- Sin render: `readability/alignment/spacing/composition(pixel)` quedan `unknown`.

## Seguridad

Sin shell, sin ejecución de código, sin red, sin modelos externos. Solo lectura de la
imagen renderizada (contención en campaigns/<id>/) y escritura de iteraciones bajo
`campaigns/<id>/critique/`. Límites anti bombas: 20MB, 8000px, muestra ≤512px.

## Fixtures

`fixtures/visual/*.png` sintéticos deterministas, generados con
`npx tsx creative-assets/scripts/generate-visual-fixtures.mts`
(high-contrast, low-contrast, dense, sparse, balanced, left-heavy, right-heavy).
