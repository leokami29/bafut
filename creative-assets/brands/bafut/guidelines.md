# BaFut — Guía de estilo (memoria visual del agente)

> Fuente de verdad canónica: [`DESIGN.md`](../../../DESIGN.md) en la raíz del repo.
> Este documento resume las reglas que el agente debe aplicar al crear campañas.
> La idea es **extraer reglas, no copiar diseños**.

## Concepto

**"El Reflector en la Cancha"** — estética de cancha sintética iluminada de noche.
Todo lo que se diseñe debe sentirse como estar bajo el reflector a las 8pm en Barranquilla.

## Reglas de color

| Uso | Color | Hex |
|---|---|---|
| Fondo oscuro (default para piezas nocturnas) | turf-deep | `#073828` |
| Fondo claro (versión día / impresión) | paper | `#DFF3E6` |
| Primario / bloques de contenido | turf | `#0C6B4C` |
| CTA y acentos "reflector" | flood | `#FFD25A` (nunca texto flood sobre paper: usar `#C9930A`) |
| Urgencia / cupos faltantes | bib | `#C42A16` |
| Texto sobre oscuro | paper / mist | `#DFF3E6` / `#C8E6D4` |
| Texto sobre claro | ink | `#10231C` |
| Líneas de cancha / acento suave | chalk | `#D9F2A5` al 25–70% opacidad |

## Reglas tipográficas

- **Titulares, CTA y wordmark**: Barlow Condensed 800–900, tracking 2–6. MAYÚSCULAS.
- **Cuerpo**: Outfit 500. Jamás condensada.
- **Labels / meta / badges**: IBM Plex Mono 500, tracking 3–6, MAYÚSCULAS.
- Jerarquía: headline domina la pieza; el mono solo para metadata; nunca más de 2 familias + mono.

## Reglas de composición

1. Headline de una o dos líneas máximo, centrado, ~10–12% del alto de la pieza.
2. Motivo de cancha: líneas chalk (línea central, círculo, bordes) como decoración de bajo contraste — nunca compiten con el texto.
3. CTA: botón flood, radio 14, glow drop-shadow #FFD25A 40% blur 32, texto turf-deep, SIEMPRE incluye el dominio `bafut.macuttech.com`.
4. Chips de deportes: píldoras turf con borde chalk tenue; una sola fila.
5. Footer mono en mayúsculas con separadores `·`.
6. Mucho aire: padding ≥ 6% del lado menor. En stories el contenido flota centrado.

## Tono de copy

- Costeño, callejero, urgente, en segunda persona: *"Falta uno a las 8. ¿Qué esperas?"*
- Estructura ganadora: **situación puntual (hora, hueco) + pregunta directa**.
- Beneficios: gratis, sin registro, sin pagos, instalable como app.
- Nunca decir "reserva de canchas" (BaFut NO reserva).

## Referencias ya producidas

Ver `brands/bafut/references/` y los shapes de Penpot registrados en `brand.json`
→ `assets_registered.penpot_shapes` (sirven como memoria visual viva en el canvas de Penpot).
