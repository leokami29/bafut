# Creative Assets MCP

**Creative Asset Orchestration Layer** — servidor MCP (stdio) que expone el sistema
creative-assets al agente de IA. NO es un generador de imágenes y NO ejecuta Penpot:
orquesta BUSCAR → SELECCIONAR → DESCARGAR → PROCESAR → ORGANIZAR → COMPONER → EXPORTAR
usando assets reales y editables.

## Arquitectura

```
AI Agent (OpenCode)
   │  MCP (stdio)
   ▼
creative-assets-mcp        ← capa delgada (sin lógica duplicada)
   │  reutiliza: SearchEngine · AssetService · AssetProcessor · Composition
   ▼
genera Penpot script (ScriptedPenpotAdapter)
   │
   ▼
AI Agent ──(penpot_execute_code)──▶ Penpot MCP ──▶ Penpot
   │
   ▼
penpot_export_shape → PNG/JPG/PDF
```

**El MCP NO ejecuta Penpot.** Solo genera el script; la ejecución y export son del
agente mediante el Penpot MCP.

## Instalación y ejecución

```bash
npm install            # incluye @modelcontextprotocol/sdk + zod
npm run mcp            # servidor MCP por stdio (tsx creative-assets/src/mcp/server.ts)
```

Requisitos de entorno:
- `PEXELS_API_KEY` en `.env.local` (si falta, el servidor arranca igual; `search_images`
  devolverá PROVIDER_ERROR con instrucciones).
- (opcional) `REMBG_COMMAND` para remove-background (fase 4).

### Integración con OpenCode

En `opencode.json` (proyecto) o `~/.config/opencode/opencode.json` (global):

```json
{
  "mcp": {
    "creative-assets": {
      "type": "local",
      "command": ["npm", "run", "mcp"],
      "enabled": true
    }
  }
}
```

Reinicia OpenCode tras guardar. El agente verá los tools con el prefijo del servidor:
`creative-assets_search_images`, `creative-assets_download_asset`, etc.
(Nota: `npm run mcp` usa `--env-file-if-exists=.env.local`; OpenCode también puede
necesitar que las variables estén en el entorno del proceso.)

## Tools

| Tool | Propósito | Entrada clave | NO hace |
|---|---|---|---|
| `search_images` | Buscar imágenes (proveedores habilitados) | `query`, `orientation?`, `size?`, `limit?` (≤80), `color?`, `provider?` | descarga |
| `download_asset` | Descargar candidato → asset validado (sha256, dedupe) | `resultId` o `provider+providerAssetId` + `query` (1ª vez) | re-descargar (devuelve `deduplicated: true`) |
| `process_asset` | Pipeline sobre un asset (remove-background, resize, crop, convert, optimize) | `assetId`, `steps[{operation, options}]` | modificar raw |
| `resolve_asset_plan` | Reconciliar CompositionPlan vs inventario | `plan` | search/download automáticos |
| `emit_penpot_script` | Generar script de composición (ScriptedPenpotAdapter) | `compositionPlan`, `assets[{assetId, planRef?}]` | ejecutar el script |
| `create_campaign` | Alto nivel: valida brief+plan, marca, manifiesto, nextActions | `brief`, `plan` | descargas automáticas |

### Ejemplos

```jsonc
// search_images
{ "query": "football player celebrating", "orientation": "landscape", "limit": 10 }
// → { results: [{ candidateId: "pexels-123", providerAssetId: "123", width, height, author, license, ... }] }

// download_asset
{ "provider": "pexels", "providerAssetId": "123", "query": "football player celebrating" }
// → { assetId: "asset_…", status: "ready", path, sha256, hasTransparency, deduplicated }

// process_asset
{ "assetId": "asset_…", "steps": [{ "operation": "remove-background" }, { "operation": "resize", "options": { "width": 1080 } }] }
// → { assetId: "asset_…(derivado)", parentAssetId, cached, hasTransparency: true, ... }

// resolve_asset_plan
{ "plan": { "canvas": {...}, "layers": [...], "assets": [...] } }
// → { assets: [{ planRef, status: "missing|needs_processing|ready", requiredProcessing }], pendingQueries, nextActions }

// emit_penpot_script
{ "compositionPlan": { ... }, "assets": [{ "assetId": "asset_…", "planRef": "hero-player" }] }
// → { script, format: "penpot-plugin-script", layerCount, execution: { executedBy: "ai-agent", steps } }
```

`planRef`: las capas del plan referencian assets por el `id` del AssetPlan (p. ej.
`"hero-player"`). En `assets[]` del emit, `planRef` vincula el assetId del sistema con
esa referencia (si se omite, se deduce de `sourceAssetId` del plan).

## Errores

Estructura uniforme (sin stack traces):

```json
{ "code": "ASSET_NOT_FOUND", "message": "…", "details": {} }
```

Códigos: `VALIDATION_ERROR` · `PROVIDER_ERROR` · `ASSET_NOT_FOUND` · `PROCESSING_ERROR`
· `CAMPAIGN_NOT_FOUND` · `BRAND_NOT_FOUND` · `INVALID_OPERATION` · `INVALID_INPUT`
· `TOOL_UNAVAILABLE` · `RATE_LIMIT` · `TIMEOUT`.

## Seguridad

- Solo operaciones registradas en `ProcessorRegistry`; solo proveedores habilitados.
- Filenames/rutas siempre generados por el sistema (contención anti path-traversal,
  heredada de fases 3-4); el agente no envía paths, solo IDs validados por schema.
- Sin URLs `file://`, sin comandos shell, sin JS arbitrario: el script de Penpot solo
  sale de `ScriptedPenpotAdapter`.
- El protocolo MCP corre por stdio; logs → stderr.

## Limitaciones

- `search_images` depende de API keys configuradas (fase 2); sin key arranca pero falla claro.
- `emit_penpot_script` genera el script; **no** lo ejecuta ni exporta (eso es del agente
  con el Penpot MCP). El export (PNG/JPG/PDF) se hace con `penpot_export_shape`.
- rembg depende de la instalación local (ver docs/image-processing.md).
- Sin generación de imágenes IA, scoring visual ni visión (fases futuras).

## Tests

`npx vitest run creative-assets/src/mcp` — 19 tests (mocks de proveedor, fetch stub,
filesystem temporal; sin Pexels/Internet/Penpot/rembg reales).
