# Workflow del agente — Campañas gráficas

> Cómo debe trabajar el agente de IA dentro de este sistema. Fase 1: manual/semi-automático.

## 1. Antes de diseñar

1. Leer `brands/[marca]/brand.json` + `guidelines.md` (colores, tipografías, tono, reglas).
2. Revisar `brands/[marca]/references/` para extraer reglas visuales — **no copiar**.
3. Revisar assets ya disponibles en `assets/processed/` (reutilizar antes de buscar/generar).

## 2. Crear campaña

1. Crear `campaigns/[nombre]/`.
2. Escribir `brief.json` (objetivo, formato(s), copy, CTA, fecha).
3. Juntar referencias específicas en `campaigns/[nombre]/references/`.
4. Buscar/generar assets → quedan en `campaigns/[nombre]/assets/raw/`.
5. Procesar → `campaigns/[nombre]/assets/processed/`.
6. Elegir los definitivos → `campaigns/[nombre]/assets/selected/`.

## 3. Componer en Penpot

1. Ubicar la ruta absoluta de cada asset seleccionado.
2. Usar el MCP de Penpot (ya conectado en `opencode.json`) para crear/componer el diseño.
3. Registrar el shape/ID resultante en `campaigns/[nombre]/penpot/`.

## 4. Exportar

1. Exportar desde Penpot a `campaigns/[nombre]/output/`.
2. Si es entregable reutilizable, copiar a `output/[formato]/`.

## 5. Aprender (memoria visual)

1. Al terminar una campaña aprobada, extraer qué funcionó (colores, composición, copy)
   y añadirlo como reglas a `brands/[marca]/guidelines.md`.
2. Guardar el diseño final como referencia en `brands/[marca]/references/`.

## Plantilla de brief.json

```json
{
  "campaign": "lanzamiento",
  "brand": "bafut",
  "objective": "Descargas de la PWA en Barranquilla",
  "formats": ["1080x1080", "1080x1920"],
  "copy": { "headline": "...", "sub": "...", "cta": "...", "footer": "..." },
  "cta_url": "https://bafut.macuttech.com",
  "assets_needed": ["jugador nocturno cutout", "textura césped"],
  "penpot_board": null,
  "status": "draft | in_penpot | exported"
}
```
