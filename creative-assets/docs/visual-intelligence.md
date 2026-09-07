# Visual Intelligence (Fase 7) + Local Vision Analyzer (Fase 9)

Evaluación y selección explicables de candidatos + **análisis estadístico local del
render** (fase 9). Determinista, local y barato, basado en METADATA (fase 7) y en
PÍXELES del render (fase 9, vía sharp).

> **Principio fundamental:** el sistema no puede inferir características de píxeles
> que no analiza. Todo lo no determinable es `unknown`/`null`, jamás inventado.

> **Fase 9 — ESTO NO ES UN MODELO DE VISIÓN SEMÁNTICA.** Es un analizador
> estadístico de imágenes (luminancia, contraste, saturación, bordes, balance).
> No detecta personas, objetos, texto real (sin OCR) ni rostros.

> **Principio fundamental:** el sistema no puede inferir características de píxeles
> que no analiza. La posición del sujeto y el espacio negativo se reportan como
> `unknown` (con pesos renormalizados) hasta que exista un analizador de visión.

## Arquitectura

```
ImageCandidate[] (SearchEngine, fase 2)
        │
HeuristicVisualAnalyzer  ← SOLO metadata: width/height/ratio
        │   (futuros: LocalVisionAnalyzer, VisionModelAnalyzer, CloudVisionAnalyzer)
        ▼
VisualFeatures { width, height, aspectRatio, orientation, megapixels,
                 subjectPosition: "unknown", negativeSpace: "unknown",
                 visualDensity: null, source: "metadata" }
        │
VisualScoringEngine (scoring explicable, pesos por rol)
        │
CandidateRanker (dedupe + orden DESC + desempate determinista)
        ▼
RankedCandidate[] { candidate, features, score: { total, breakdown, reasons, warnings } }
```

Toda feature declara `source`: `metadata` (derivable de dimensiones), `heuristic`
(reglas) o `vision` (futuro). Lo desconocido es `unknown`/`null`, nunca inventado.

## Pesos por rol (configurables en `scoring-rules.ts`)

| Rol | resolution | aspectFit | orientation | composition | subjectPosition | negativeSpace |
|---|---|---|---|---|---|---|
| hero | 20 | 15 | 15 | 15 | 25 | 10 |
| background | 30 | 25 | 20 | 25 | 0 | 0 |
| decorative / texture | 30 | 25 | 15 | 30 | 0 | 0 |
| foreground | 25 | 20 | 15 | 25 | 15 | 0 |
| logo | 40 | 30 | 30 | 0 | 0 | 0 |

Si un criterio es `unknown`, se EXCLUYE y los pesos se renormalizan sobre los criterios
conocidos (los `max` suman ~100). Así el total es honesto: un candidato metadata-only
puede puntuar alto por resolución/aspect-fit, pero siempre avisa
`"subject position unavailable without pixel analysis"`.

## Criterios (todos derivados del scoring real)

- **resolution**: escala necesaria para "cover" del target. `≤0.5×` → 100, `≤0.75` → 95,
  `≤1` → 70, `≤1.5` → 40 (upscale moderado), `>1.5` → 10. `minimumResolution` del
  contexto aplica un cap + warning.
- **aspectFit**: `CropCompatibility` por fracción de píxeles descartados al recortar:
  excellent ≤10% · good ≤25% · acceptable ≤45% · poor >45%.
- **orientation**: coincide con el formato del canvas; roles tolerantes (background,
  texture, decorative) penalizan menos.
- **composition**: proxy metadata-only (cobertura + compatibilidad con full-bleed).
- **subjectPosition / negativeSpace**: SOLO con análisis de píxeles (futuro);
  hoy siempre unknown → renormalización + warning.

## CandidateRanker

- Dedupe por `provider + providerAssetId` (fallback `candidateId`).
- Orden: score DESC → resolución (px) DESC → `candidateId` ASC. Nunca aleatorio.
- Salida: `RankedCandidate { candidate, features, score }`.

## ReferenceProfile

- `StaticReferenceProfileLoader` carga `brands/<id>/references/profile.json` si existe
  (preferredFormats, preferredSubjectPlacement, overlayUsage, dominantColors, notes).
- Si no existe → `null` (no se inventa).
- **Jerarquía de prioridades**: `Brand system (brand.json) > Campaign requirements >
  ReferenceProfile > heurísticas genéricas`. El perfil NUNCA sobrescribe brand.json.
- Futuro: `VisionReferenceAnalyzer` que analice las referencias reales (no en esta fase).

## MCP tool: `rank_image_candidates`

```jsonc
// entrada
{
  "candidates": [
    { "candidateId": "pexels-A", "provider": "pexels", "providerAssetId": "1", "width": 2000, "height": 3000 },
    { "candidateId": "pexels-B", "provider": "pexels", "providerAssetId": "2", "width": 4000, "height": 1000 }
  ],
  "context": { "role": "hero", "targetWidth": 1080, "targetHeight": 1350, "preferredPosition": "right" }
}
// salida (ejemplo real verificado)
{ "ranked": [
    { "candidateId": "pexels-A", "score": 90, "breakdown": {...}, "reasons": [...], "warnings": ["subject position unavailable without pixel analysis"] },
    { "candidateId": "pexels-B", "score": 35, "warnings": ["aspect ratio requires aggressive crop", "resolution may be insufficient…"] }
  ],
  "note": "Scoring basado en metadata…"
}
```

Semántica: `search_images → rank_image_candidates → (agente elige) → download_asset →
process_asset`. El tool NO descarga, NO procesa, NO accede a red/filesystem/shell.

## Limitaciones reales

- Sin análisis de píxeles: sujeto, rostros, espacio negativo, densidad y colores reales
  son `unknown`. Las razones siempre lo indican.
- La "composición" es un proxy determinista (crop + cobertura), no percepción visual.
- No hay generación de imágenes ni modelos externos (deliberado: local/determinista/barato).

## Extensibilidad futura

`HeuristicVisualAnalyzer` implementa `VisualAnalyzer`; luego pueden añadirse
`LocalVisionAnalyzer`, `VisionModelAnalyzer` o `CloudVisionAnalyzer` que completen
`subjectPosition`/`negativeSpace`/`visualDensity` con `source: "vision"` — el scoring
los consumirá sin cambios de contrato.
