# Arquitectura — Creative Assets

## Objetivo

Convertir este sistema en un **Creative Assets MCP**: un servidor MCP que exponga
herramientas para que un agente de IA produzca campañas gráficas profesionales de
punta a punta (búsqueda → descarga → procesamiento → composición en Penpot → export).

## Principios

1. **Desacoplado de fuentes**: proveedores de imágenes (Pexels, Unsplash, IA) son plugins
   declarados en `config/sources.json` y `config/ai.json`. Añadir una fuente = añadir una entrada.
2. **Desacoplado de procesadores**: rembg / ImageMagick / Sharp son tools declaradas en
   `config/processing.json`. El MCP las orquesta, no las conoce en código.
3. **Penpot es solo el compositor final**: consume rutas de archivos procesados; nunca es
   el almacén de la verdad. Lo que vive en Penpot se exporta de vuelta a `output/`.
4. **Los raw son inmutables**: todo procesamiento produce un archivo nuevo + metadata.
5. **Una marca = una carpeta**: la identidad visual vive en `brands/[id]/brand.json` +
   `guidelines.md`. El agente lee esto ANTES de diseñar nada.
6. **Una campaña = un aislamiento**: brief, assets, trabajo Penpot y outputs de una
   campaña no contaminan el pool general.

## Capas del sistema (futuras)

```
┌─────────────────────────────────────────────┐
│ Agente de IA (opencode / cliente MCP)       │
├─────────────────────────────────────────────┤
│ Creative Assets MCP (fase 2)                │
│  tools: search · download · process ·       │
│         register · compose · export         │
├──────────────┬──────────────┬───────────────┤
│ Fuentes      │ Procesadores │ Penpot MCP    │
│ (sources/ai) │ (processing) │ (ya conectado)│
├──────────────┴──────────────┴───────────────┤
│ Sistema de archivos: este directorio        │
│ + metadata (fase 2)                         │
└─────────────────────────────────────────────┘
```

## Ciclo de vida de un asset

```
SOURCE ─→ DOWNLOADED ─→ VALIDATED ─→ PROCESSED ─→ SELECTED ─→ USED_IN_DESIGN ─→ EXPORTED
 (en un     (raw/)        (metadata:   (processed/)   (campaigns/    (en Penpot)       (output/)
 proveedor                licencia,                   [camp]/assets/
 o IA)                    dimensiones)                selected/)
```

Un mismo archivo puede saltar de estado varias veces (p. ej. un cutout reutilizado en
otra campaña pasa de PROCESSED a SELECTED de nuevo). Por eso la metadata es la fuente de
los estados, no la ubicación de la carpeta — la carpeta es solo física, la metadata es lógica.

## Estructura física

Ver `README.md` en la raíz de `creative-assets/`.

## Integration con el proyecto BaFut

- `brands/bafut/brand.json` deriva de `DESIGN.md` y `app/globals.css` (tokens exactos).
- Los logos se copiaron (no movieron) desde `public/`.
- Los diseños ya creados en Penpot están registrados en `brand.json` → `assets_registered.penpot_shapes`
  como memoria visual.
- Las campañas de BaFut vivirán en `campaigns/[nombre]/`.
