# Decisiones pendientes — antes de programar el Creative Assets MCP

Fase 1 completada (arquitectura). Antes de escribir código (fase 2) hay que decidir:

## 1. Dónde vive el MCP
- [ ] ¿Servidor MCP local separado (Node/Python) o plugin de opencode (`.opencode/plugin/`)?
- Recomendación: servidor MCP propio en TS (Sharp es nativo de Node) en `tools/creative-assets-mcp/`.

## 2. Metadata: index y deduplicación
- [ ] ¿Un JSON por asset en `assets/metadata/` o un índice único (`index.json` / SQLite)?
- Recomendación: JSON por asset + índice generado; SQLite solo si el pool crece a miles.

## 3. Campañas vs pool general
- [ ] ¿Los assets de campaña se duplican del pool o se referencian por ID?
- Recomendación: referenciar; duplicar solo los `selected/` finales.

## 4. Git y assets binarios
- [ ] ¿Qué carpetas van a git y cuáles se ignoran (`assets/raw/`, `output/`, `temp/`)?
- Recomendación: ignorar `temp/` y `raw/` pesado; versionar `brands/`, `config/`, `metadata/` y outputs finales.

## 5. Proveedores a conectar primero
- [ ] Orden de integración: Pexels + rembg + Sharp son el MVP mínimo útil.
- [ ] Necesitamos API keys (variables de entorno, no en config).

## 6. Penpot: subir imágenes
- [ ] El MCP de Penpot expone `uploadMediaData`/`uploadMediaUrl` — decidir si el assets-MCP
      orquesta la subida o si el agente hace el puente manualmente.

## 7. Generación IA: proveedor
- [ ] OpenAI Images u otro; define estilo/prompt por marca en `config/ai.json`.
