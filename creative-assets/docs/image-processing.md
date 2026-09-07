# Motor de procesamiento visual (Fase 4)

## Arquitectura

```
AssetService (fase 3) ──→ AssetMetadata (raw, inmutable)
                                  │
                    AssetProcessor.processAsset(assetId, steps)
                                  │
                 ┌────────────────┴────────────────┐
                 │ ProcessorRegistry               │
                 │  ├── ResizeProcessor  (sharp)   │
                 │  ├── CropProcessor    (sharp)   │
                 │  ├── ConvertProcessor (sharp)   │
                 │  ├── OptimizeProcessor (sharp)  │
                 │  └── RemoveBackgroundProcessor  │
                 │       (rembg vía execFile)      │
                 └────────────────┬────────────────┘
                                  │  input (copia en temp/) → processor
                                  │  → AssetValidator (magic bytes + hash)
                                  │  → LocalAssetStorage (processed/)
                                  ▼
                    AssetMetadata derivado (parentAssetId + processing.operations)
```

## Operaciones

| Operación | Options | Tool |
|---|---|---|
| `resize` | `width?`, `height?`, `fit?` (cover/contain/inside/outside), `position?`, `background?` | sharp |
| `crop` | `width`, `height` + `x`,`y` (exacto) ó `position` (center/top/bottom/left/right) | sharp |
| `convert` | `format` (jpeg/png/webp), `quality?`, `background?` | sharp |
| `optimize` | `quality?` (jpeg/webp), `palette?` (png) | sharp |
| `remove-background` | — (rembg u2net) | rembg |

Comportamiento documentado:
- `resize` con una sola dimensión preserva el aspect ratio.
- `convert` a JPEG aplana la transparencia sobre `background` (default blanco).
- Todo output pasa por `AssetValidator`: si el resultado es corrupto, NO se marca
  ready, NO se persiste metadata y el temporal se limpia.

## Assets derivados

- Cada operación produce un **asset derivado** con `parentAssetId` → árbol:
  ORIGINAL → remove-background → resize → … (la cadena completa queda en
  `processing.operations[]`, con `inputAssetId`/`outputAssetId`/`tool`/`timestamp`).
- RAW nunca se modifica. Los derivados viven en `assets/processed/{parentAssetId}/`.

## IDs deterministas + idempotencia

```
derivedId = "asset_" + sha256(`${parentAssetId}:${operation}:${canonical(options)}`).slice(0,16)
```
- Las opciones se canonizan (keys ordenadas) → el orden de las opciones no importa.
- Ejecutar dos veces el mismo pipeline reutiliza el derivado (`cached: true`),
  sin re-ejecutar rembg ni sharp.
- El sha256 del contenido añade una segunda capa de dedupe (p. ej. si cambia el
  modelo de rembg, el mismo resultado visual no se duplica).

## Transparencia

`hasTransparency` se detecta con Sharp (`stats.isOpaque === false`) en cada asset
png/webp/gif, antes y después de procesar, y queda en la metadata.

## rembg: instalación y configuración

```bash
pip install rembg onnxruntime     # Python 3.10+
# el modelo u2net (~170MB) se descarga a ~/.u2net/u2net.onnx en el primer uso
```

- Comando por defecto: `python -m rembg i <in> <out>`.
- Personalizable con la variable de entorno `REMBG_COMMAND`
  (p. ej. `REMBG_COMMAND="python -m rembg i"` o un binario `rembg` global).
- Invocación SIEMPRE con `execFile` y argumentos separados (nunca strings
  concatenados con datos variables).

### Troubleshooting (entorno actual)

- `onnxruntime` instalado (1.29.0) y modelo `u2net.onnx` presente (~176MB).
- **Problema detectado**: `import rembg` se cuelga >2min en Python 3.13.3 con
  rembg 2.0.69 (independiente de nuestro código). Posibles soluciones:
  1. `pip install -U rembg onnxruntime`
  2. Probar un venv con Python 3.11: `py -3.11 -m venv .venv-rembg` y apuntar
     `REMBG_COMMAND` a ese interprete.
  3. Verificar que el antivirus no esté bloqueando la carga de onnxruntime.
- La integración está cubierta por tests con runner mockeado; el comando real
  se activa automáticamente cuando rembg funcione en el entorno.

## CLI

```bash
# flags individuales
npm run asset:process -- asset_abc --remove-background --resize 1080 --convert png
npm run asset:process -- asset_abc --crop 1080x1350@center --optimize 80
# pipeline en un string
npm run asset:process -- asset_abc --pipeline "remove-background,resize:1080,convert:png,optimize:80"
# pipeline JSON estructurado (formato que el agente generará en fase 5+)
npm run asset:process -- asset_abc --pipeline-file pipeline.json
```

`pipeline.json`:
```json
{
  "assetId": "asset_abc123",
  "operations": [
    { "type": "remove-background" },
    { "type": "resize", "options": { "width": 1080 } },
    { "type": "convert", "options": { "format": "png" } }
  ]
}
```

## API interna (para el agente / futuro MCP)

```ts
const { processor } = buildAssetProcessor();
const outcome = await processor.processAsset(assetId, [
  { type: "remove-background" },
  { type: "resize", options: { width: 1080 } },
]);
// outcome: { asset, processed, cached, path, chain[] }
```

## Añadir una operación nueva

1. Crear `xxx-processor.ts` implementando `ImageProcessor` (`name`, `tool`, `process`).
2. Registrarla en `defaultRegistry()` (`src/assets/processing/registry.ts`).
3. Añadir parsing en `parsePipelineString`/`parseProcessArgs` si se quiere CLI.
Nada más: el pipeline, validación, storage, metadata, ids e idempotencia son genéricos.

## Seguridad

- Filenames y rutas generados internamente (patrones cerrados); contención
  validada en storage y temp (anti path-traversal).
- `execFile` con array de argumentos; `windowsHide`; timeout configurable.
- Límites de tamaño del validador aplicados también al output procesado.
