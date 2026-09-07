# Asset Pipeline — Creative Assets

> Fase 2-3: búsqueda (implementada) y descarga/validación/metadata (implementadas).
> El procesamiento visual es fase 4.

## Estados del asset (máquina de estados)

```
discovered ──(download)──→ downloaded ──(validate)──→ validated ──(store+metadata)──→ ready ──(fallo en cualquier paso)──→ failed
```

Estados definidos hoy (`AssetStatus` en `src/assets/types.ts`):

| Estado | Significado |
|---|---|
| `downloaded` | bytes en disco temporal, sin validar |
| `validated` | magic bytes + límites ok, hash calculado |
| `ready` | almacenado en `assets/raw/` + metadata persistida |
| `failed` | cualquier error (no se persiste; el temporal se limpia) |

Estados futuros (se añaden cuando tengan utilidad real, NO antes):
`processed` (fase 4) · `selected` (fase 4) · `used` (fase 5, tras componer en Penpot) · `archived`.

## Pipeline estándar

```
search ─→ download ─→ validate ─→ store ─→ metadata ─→ (fase 4) process ─→ compose ─→ export
```

| Paso | Qué hace | Dónde escribe | Implementado |
|---|---|---|---|
| 1. search | Proveedores (Pexels) o IA | — | ✅ fase 2 |
| 2. download | Streaming HTTP(S) a `temp/`, límites en vivo, Content-Type image/* | `creative-assets/temp/` | ✅ fase 3 |
| 3. validate | Magic bytes (JPEG/PNG/WEBP/GIF), tamaño min/max, dimensiones, sha256 | — | ✅ fase 3 |
| 4. store | Copia determinista `{assetId}.{ext}` a raw | `assets/raw/` | ✅ fase 3 |
| 5. metadata | JSON por asset + dedupe por identidad y hash | `assets/metadata/` | ✅ fase 3 |
| 6. process | rembg/crop/resize/optimize (ImageMagick/Sharp) | `assets/processed/` | ⬜ fase 4 |
| 7. compose | Composición en Penpot (via MCP Penpot) | `campaigns/[camp]/penpot/` | ⬜ fase 5 |
| 8. export | Export del diseño final | `campaigns/[camp]/output/` + `output/[formato]/` | ⬜ fase 5 |

## Asset ID y nombres

- `computeAssetId({provider, providerAssetId, originalUrl})` (src/assets/ids.ts):
  `asset_` + primeros 16 hex de `sha256("provider:providerAssetId")` (fallback: `provider:originalUrl`).
- **Determinista**: la misma imagen del mismo proveedor produce siempre el mismo ID
  → re-descargar devuelve el asset existente (`duplicate: true`) sin crear archivos.
- Nombre de archivo SIEMPRE generado por el sistema: `{assetId}.{extension}`.
  Nunca se usa el filename de la URL (path traversal / nombres maliciosos).
- Dedupe adicional por contenido: `sha256` en streaming; si otro asset ya tiene ese
  hash, se reutiliza y el temporal se borra.

## Estructura física (fase 3)

```
creative-assets/assets/raw/asset_<16hex>.png      ← binarios originales (inmutables)
creative-assets/assets/metadata/asset_<16hex>.json ← metadata (fuente de verdad)
creative-assets/temp/                              ← descargas en curso (se limpia solo)
```

## Metadata por asset

```json
{
  "id": "asset_5566b154374bc0d3",
  "provider": "pexels",
  "providerAssetId": "123456",
  "storedFilename": "asset_5566b154374bc0d3.jpg",
  "path": "assets/raw/asset_5566b154374bc0d3.jpg",
  "mimeType": "image/jpeg",
  "extension": "jpg",
  "sizeBytes": 1874321,
  "width": 1920,
  "height": 1280,
  "aspectRatio": 1.5,
  "sha256": "…64 hex…",
  "sourceUrl": "https://www.pexels.com/photo/123456/",
  "originalUrl": "https://images.pexels.com/photos/123456/…",
  "previewUrl": "https://images.pexels.com/photos/123456/…large…",
  "author": { "name": "John Doe", "url": "https://www.pexels.com/@johndoe" },
  "license": "Pexels License (uso gratuito, sin atribución obligatoria)",
  "tags": ["futbol", "noche"],
  "downloadedAt": "2026-09-06T…",
  "status": "ready",
  "campaignId": "lanzamiento",
  "brandId": "bafut",
  "processing": { "operations": [] }
}
```

## CLI

```bash
npm run search -- "football player" --json            # fase 2: buscar
npm run asset:download -- pexels-123456 --query "football player"   # descargar (la 1ª vez requiere --query para localizar la URL)
npm run asset:download -- pexels-123456               # si ya hay metadata: no-op
npm run asset:info -- asset_5566b154374bc0d3          # metadata JSON
npm run asset:list                                    # listado legible (+ --json)
```

## Extensiones de la arquitectura

- **Otro storage**: implementa `AssetStorage` (`save(tempPath, filename)`, `resolve(rel)`) — p. ej. S3.
- **Otro repositorio de metadata**: implementa `MetadataRepository` (`create/get/update/findByHash/findByIdentity/list`) — p. ej. SQLite.
- **Otro formato de imagen**: `image-format.ts` añade la firma magic-bytes + parser de dimensiones.
- Seguridad: filenames generados internamente, contención de rutas validada,
  solo http/https, límite de tamaño en vivo, Content-Type image/* obligatorio.

## Convención de nombres (propuesta)

La metadata es la fuente de verdad; el archivo es `{assetId}.{ext}`. Para humanos,
usa `tags` y `campaignId` en la metadata, no el nombre del archivo.
