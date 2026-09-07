# Búsqueda de imágenes (Fase 2)

Sistema de **búsqueda y selección** de imágenes multiproveedor.
SEARCH ≠ DOWNLOAD: esta fase solo busca, normaliza y devuelve candidatos.
No descarga, no procesa, no toca Penpot.

## Arquitectura

```
AGENTE IA / CLI
      │
SearchEngine (src/search-engine.ts)
      │  · orquesta proveedores en paralelo
      │  · un proveedor caído NO aborta la búsqueda
      │  · hook de cache (NoopCache hoy; FileCache en fase 3)
      ▼
ImageProvider (contrato en src/providers/types.ts)
      ├── PexelsProvider   ← implementado (API oficial v1)
      ├── UnsplashProvider ← stub (fase 3)
      └── [futuros]
      ▼
ImageSearchResult (normalizado) → ImageCandidate (para selección/scoring)
```

Los proveedores se declaran en `config/sources.json` (id, enabled, api_env_var)
y se construyen en `src/providers/registry.ts`. Añadir un proveedor nuevo =
1) implementar `ImageProvider`, 2) una entrada en `FACTORIES` del registry,
3) una entrada en `config/sources.json`.

## Configurar PEXELS_API_KEY

1. Crea una API key gratis en https://www.pexels.com/api/
2. Añádela a `.env.local` (que está git-ignored — NUNCA en `.env.example` ni código):

```
PEXELS_API_KEY=tu-key-aqui
```

El CLI la carga automáticamente vía `--env-file-if-exists=.env.local`.
Los tests NO usan la key real (mockean `fetch`).

## Uso

```bash
# búsqueda básica (salida humana)
npm run search -- "football player"

# salida JSON estructurada (para el agente)
npm run search -- "soccer stadium night" --json

# con filtros
npm run search -- "football player celebrating" --orientation landscape --limit 5 --size large

# ver qué proveedores están activos y por qué
npm run search -- --list-providers
```

## Estructura del resultado (ImageSearchResult)

```jsonc
{
  "id": "pexels-123456",
  "provider": "pexels",
  "title": "Football player kicking the ball",
  "thumbnailUrl": "https://images.pexels.com/.../tiny.jpeg",
  "previewUrl": "https://images.pexels.com/.../large.jpeg",
  "originalUrl": "https://images.pexels.com/.../jpeg",
  "width": 1920,
  "height": 1280,
  "aspectRatio": 1.5,
  "author": { "name": "John Doe", "url": "https://www.pexels.com/@johndoe" },
  "sourceUrl": "https://www.pexels.com/photo/123456/",
  "license": "Pexels License (uso gratuito, sin atribución obligatoria)",
  "metadata": { "pexels_id": 123456, "avg_color": "#0C6B4C", "alt": "..." }
}
```

Cada resultado viene envuelto en un `ImageCandidate`:

```jsonc
{
  "result": { /* ImageSearchResult */ },
  "score": null,          // fase 3: scoring del agente
  "status": "pending",    // pending | selected | rejected
  "rejectionReason": null
}
```

## Errores

Todos los errores son `ProviderError` con código explícito y mensaje accionable:
`missing_api_key` · `invalid_api_key` (401) · `rate_limit` (429) · `timeout` ·
`network` · `empty_query` · `invalid_response` · `provider_error` · `not_implemented`.

## Tests

`npx vitest run creative-assets` — 19 tests:
normalización Pexels (incluye descarte de items inválidos), mapeo de parámetros,
límite per_page, query vacía, key ausente, 401/429, red, timeout, JSON inválido,
sin resultados, multi-proveedor, aislamiento de fallos, cache y candidatos.

## Fase 3 (pendiente)

- Selección automática (scoring del agente sobre `ImageCandidate`).
- Descarga (`download → validate`) con metadata en `assets/metadata/`.
- Implementar `UnsplashProvider`.
- FileCache con TTL (la interfaz `SearchCache` ya está lista).
- Búsquedas derivadas de un brief creativo (brief → queries → evaluar).
