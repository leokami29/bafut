# Creative Assets

Sistema de gestión de assets para producción gráfica con agentes de IA (flyers, campañas, composición en Penpot).

## Estado actual

**Fase 1 — Arquitectura**: solo estructura de carpetas, documentación y configuraciones de ejemplo.
No hay dependencias instaladas ni código del futuro MCP.

## Estructura

```
creative-assets/
├── brands/          # Identidad visual por marca (fuente de verdad de estilo)
├── assets/          # Pool general de assets (raw → processed → metadata)
├── campaigns/       # Una carpeta por campaña (brief, assets, penpot, output)
├── temp/            # Trabajo temporal del agente (desechable)
├── output/          # Exportaciones finales por formato
├── config/          # Fuentes de imágenes, procesamiento y generación IA
└── docs/            # Arquitectura, pipeline y workflow
```

## Conceptos clave

### Separación RAW / PROCESSED / BRAND / REFERENCES / CAMPAIGNS / OUTPUT / TEMP

- **RAW** (`assets/raw/`): archivos originales tal como llegan (descarga de banco, generación IA, logo original). Nunca se edita un raw.
- **PROCESSED** (`assets/processed/`): resultados de manipulación (recorte, remove-bg, resize, optimización). Listos para componer.
- **BRAND** (`brands/[marca]/`): identidad visual — logos, tipografías, colores, reglas, memoria visual de referencias.
- **REFERENCES** (`brands/[marca]/references/` + `campaigns/[campaña]/references/`): diseños de referencia para extraer *reglas visuales*, no para copiar.
- **CAMPAIGNS** (`campaigns/[campaña]/`): aislamiento de una campaña concreta: su brief, sus assets seleccionados, sus ficheros Penpot y sus exports.
- **OUTPUT** (`output/`): entregables finales, organizados por formato (png/jpg/pdf).
- **TEMP** (`temp/`): scratch del agente; puede vaciarse en cualquier momento.

### Ciclo de vida de un asset

```
SOURCE → DOWNLOADED → VALIDATED → PROCESSED → SELECTED → USED_IN_DESIGN → EXPORTED
```

Cada estado quedará registrado en `assets/metadata/` (fase 2). La estructura ya está preparada para ello.

## Reglas para el agente

1. Nunca modificar un archivo en `raw/`. Todo procesamiento produce un nuevo archivo en `processed/`.
2. Todo asset de una campaña vive primero en `campaigns/[nombre]/assets/`; el pool general solo recibe los reutilizables.
3. Antes de crear un asset, revisar `brands/[marca]/brand.json` y `guidelines.md`.
4. Los exports finales de Penpot van a `campaigns/[nombre]/output/` y, si son entregables globales, también a `output/[formato]/`.
5. `temp/` es el único directorio "borrable sin preguntar".

## Próxima fase

Ver `docs/next-phase.md` para las decisiones pendientes antes de programar el Creative Assets MCP.
