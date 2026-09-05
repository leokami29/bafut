---
name: BaFut
description: Radar de huecos y pateadas abiertas — identidad de cancha (turf / flood / paper).
colors:
  turf: "#0c6b4c"
  turf-deep: "#073828"
  chalk: "#d9f2a5"
  flood: "#ffd25a"
  bib: "#ff3b1f"
  ink: "#10231c"
  mist: "#c8e6d4"
  paper: "#dff3e6"
  line: "rgba(217, 242, 165, 0.7)"
  bib-ink: "#fff8f5"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(2.1rem, 6vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "0.03em"
  display-hero:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(3.4rem, 14vw, 11rem)"
    fontWeight: 800
    lineHeight: 0.8
    letterSpacing: "0.04em"
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(1.65rem, 4.2vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "0.03em"
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.03em"
  body:
    fontFamily: "Outfit, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.78rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0.08em"
rounded:
  none: "0"
  hair: "2px"
  sheet: "1rem"
  pill: "999px"
spacing:
  xs: "0.35rem"
  sm: "0.65rem"
  md: "1rem"
  lg: "1.25rem"
  xl: "1.5rem"
  2xl: "2.5rem"
  touch: "2.75rem"
components:
  button-flood:
    backgroundColor: "{colors.flood}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.55rem 1.1rem"
    height: "2.8rem"
  button-flood-hover:
    backgroundColor: "{colors.flood}"
    textColor: "{colors.ink}"
  button-bib:
    backgroundColor: "{colors.bib}"
    textColor: "{colors.bib-ink}"
    rounded: "{rounded.none}"
    padding: "0.55rem 1.1rem"
    height: "2.8rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.55rem 1.1rem"
    height: "2.8rem"
  chip-filter-on:
    backgroundColor: "{colors.turf}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.none}"
    padding: "0.45rem 0.85rem"
    height: "2.75rem"
  chip-filter-off:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.45rem 0.85rem"
    height: "2.75rem"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.65rem 0.7rem"
    height: "2.75rem"
  match-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1rem 0.1rem"
  callout-turf:
    backgroundColor: "color-mix(in oklab, #0c6b4c 5%, #dff3e6)"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1rem"
  nav-header:
    backgroundColor: "{colors.turf-deep}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.none}"
    padding: "0.7rem 1rem"
---

# Design System: BaFut

## Overview

**Creative North Star: "El Reflector en la Cancha"**

BaFut se ve y se siente como llegar a una cancha sintética de noche: césped oscuro (`turf` / `turf-deep`), líneas de tiza (`chalk` / `line`), papel de cancha claro (`paper`) para operar, y un reflector amarillo (`flood`) que marca la marca y la acción. No es un dashboard SaaS ni un feed genérico: es un radar móvil de huecos, pensado para pulgar y WhatsApp.

La densidad es operativa y escaneable: tipografía condensada en mayúsculas para jerarquía, mono para metadatos de partido (hora, deporte, chips), sans limpia para cuerpo. Las superficies son planas; la profundidad viene de capas tonales y de la “línea de sideline” (borde izquierdo de 3px en callouts), no de cards con sombra.

Anti-referencias confirmadas: purple SaaS, cream + terracotta genérico AI-default, cards redondeadas con multi-shadow, pills decorativas en el hero.

**Key Characteristics:**
- Paleta cancha: turf / flood / paper + chalk, bib, ink, mist
- Display Barlow Condensed en mayúsculas; Outfit cuerpo; IBM Plex Mono labels
- Radio casi cero; pill solo en badges numéricos y toasts
- Hero full-bleed con cancha SVG; marca flood hero-level
- Listas con reglas horizontales (`match-row`), no cards
- Focus visible: anillo flood + sombra turf-deep

## Colors

Paleta de cancha nocturna: verdes de césped, tiza, reflector flood y bib de urgencia.

### Primary
- **Turf Pitch** (`#0c6b4c`): acento estructural — links, eyebrows, chips activos, bordes de callout, themeColor PWA.
- **Turf Deep** (`#073828`): chrome oscuro — header sticky, mobile nav, footer, anillo de focus.

### Secondary
- **Flood Reflector** (`#ffd25a`): CTA primaria (`btn-flood`), marca hero (`.brand-hero`), hover de nav, donate chip, acentos de sideline.

### Tertiary
- **Bib Urgency** (`#ff3b1f`): huecos abiertos, cupos, `btn-bib`, errores de form, spots abiertos en el pitch. Reserva para “falta gente / alerta”, no decoración.

### Neutral
- **Pitch Paper** (`#dff3e6`): fondo de body y superficies de operate.
- **Ink Lineup** (`#10231c`): texto principal y reglas de lista.
- **Chalk Dust** (`#d9f2a5`): texto sobre turf-deep; líneas de cancha.
- **Mist Sideline** (`#c8e6d4`): verde claro de apoyo (mezclas / atmósfera).
- **Line Marker** (`rgba(217, 242, 165, 0.7)`): subrayados sutiles (city switch, etc.).
- **Bib Ink** (`#fff8f5`): texto sobre botones bib.

### Named Rules
**The Flood Budget Rule.** Flood es el reflector: CTAs primarias, marca BaFut y acentos puntuales. No pintar pantallas enteras de flood.

**The Bib Is Urgency Rule.** Bib solo comunica hueco / alerta / error. Si no hay urgencia, no uses bib.

**The Paper Field Rule.** El operate UI vive en paper + ink. Turf-deep es chrome (header/footer/nav), no fondo de formularios.

## Typography

**Display Font:** Barlow Condensed (pesos 700 / 800; fallback sans-serif)
**Body Font:** Outfit (fallback Segoe UI, sans-serif)
**Label/Mono Font:** IBM Plex Mono (400 / 500; fallback ui-monospace)

**Character:** Condensado de camiseta + sans moderna de producto + mono de pizarra/planilla. La marca y los títulos gritan cancha; el cuerpo y los datos se leen rápido en el celular.

### Hierarchy
- **Display hero** (800, `clamp(3.4rem, 14vw, 11rem)`, lh 0.8): `.brand-hero` — solo el nombre BaFut en el hero.
- **Display / H1** (800, `clamp(2.1rem, 6vw, 3.4rem)`, lh 0.92): títulos de página; siempre uppercase + letter-spacing ~0.03em.
- **Headline** (700, `clamp(1.65rem, 4.2vw, 2.75rem)`, lh 0.95): titular bajo la marca en el hero.
- **Title / H2** (700, ~1.4rem): secciones (`.subhead`, sheet heads).
- **Body** (400, ~1rem–1.05rem, lh 1.45): ledes y copy; max ~32–44ch en ledes estrechos, ~40rem en bloques.
- **Label / Mono** (500, 0.68–0.82rem, tracking 0.06–0.12em, uppercase): eyebrows, chips de deporte, horas, contadores, footers.

### Named Rules
**The Jersey Type Rule.** Display Condensed en mayúsculas para marca y headings. Nunca Outfit en display hero.

**The Mono Meta Rule.** Hora, deporte, filtros y metadatos van en IBM Plex Mono — es la “planilla del partido”.

## Layout

Mobile-first, radar de hoy. Contenedores: `home-inner` 42rem; feed/detalle ancho `72rem`; canchas hasta `87.5rem`. Padding de página ~1.25rem (2.5rem desde 720px). Safe-area en header, hero, sticky CTAs y mobile nav.

Ritmo: listas con `border-top` ink y filas con `padding` ~1rem; callouts con borde izquierdo 3px (turf o flood). Breakpoints observados: 480 / 600 / 720 / 900 / 1100px. Bajo 900px: bottom tab bar + sticky toolbars/CTAs. Targets táctiles ≥2.75rem (44px).

**The One Job Section Rule.** Cada bloque: un propósito, un heading, un lede corto. El hero no mezcla stats ni listados.

## Elevation & Depth

Sistema plano por defecto. Profundidad = capas tonales (`color-mix` turf/flood sobre paper), bordes de 1px, y la sideline de 3px. Sombras escasas y funcionales (hover CTA flood, sticky toolbar móvil, city toast).

### Shadow Vocabulary
- **Focus ring** (`outline: 2px solid flood` + `box-shadow: 0 0 0 4px turf-deep`): único anillo de foco global.
- **CTA lift** (`0 6px 18px` flood ~35%): solo hover de `.btn-flood` en hero.
- **Sticky skim** (`0 4px 12px` ink ~8%): toolbars sticky en móvil.
- **Toast float** (`0 8px 24px` ink ~25%): `.city-toast`.

### Named Rules
**The Flat-By-Default Rule.** Sin cards elevadas. Si hace falta énfasis, usa sideline o tinte tonal — no box-shadow de tarjeta.

## Shapes

Esquinas cuadradas (0) en botones, inputs, chips, filas y callouts. Excepciones: `slot-badge` y `nav-badge` / `city-toast` en pill (`999px`); sheet de filtros móvil con radio superior `1rem`; focus footer a veces `2px`.

Bordes: underline en inputs de form (`border-bottom: 1px ink`); chips con stroke 1px; listas con hairline ink/turf. Sin siluetas flotantes ni media cards redondeadas en el hero.

**The Square Kit Rule.** Radio 0 es la firma. Pill solo para conteos/toasts, nunca para CTAs principales.

## Components

Carácter: táctil, de planilla de cancha — confiado y sin adorno SaaS.

### Buttons
- **Shape:** cuadrados (0); min-height ~2.8rem; padding `0.55rem 1.1rem`.
- **Primary (flood):** fondo flood, texto ink. Hover en hero: lift −1px + sombra flood.
- **Danger / claim (bib):** fondo bib, texto bib-ink.
- **Ghost:** transparente + borde chalk (sobre hero) o ink (sobre paper).
- **Focus:** anillo flood + sombra turf-deep (global).

### Chips / Filters
- Mono uppercase; off = stroke ink; on = turf fill + chalk text.
- Chips de deporte en filas (`match-row-sport`) y status (`status-chip`) con stroke, no fill pesado.

### Cards / Containers
- **No card system.** Contenedores = paper + regla o sideline.
- Callouts (empty, toolbar, host-banner, venue-info): tinte turf/flood ~5–22% + borde izquierdo 3px.
- Padding interno ~0.85–1.15rem.

### Inputs / Fields
- Underline only (`border-bottom: 1px ink`), fondo transparente, radio 0, min-height 2.75rem.
- Focus: anillo flood global.
- Error: texto bib; ok: texto turf.
- Búsqueda de canchas: stroke box (no underline) sobre paper aclarado — variante de directorio, no del form stack.

### Navigation
- Header sticky turf-deep / chalk; transparente sobre hero home.
- Links: hover/active flood; active = underline inset 2px flood.
- Donate: chip flood compacto.
- Móvil (<900px): bottom bar 4 columnas turf-deep; active flood.

### MatchRow (signature)
- Fila de lista, no card: grid when/place/hole/meta; borde inferior hairline.
- Hora y meta en mono; hueco en bib + `slot-badge` pill.
- Entrada con animación `rise` (stagger); en desktop, columnas alineadas.

### Hero (signature)
- Full-bleed `100dvh`, cancha SVG de fondo, copy abajo-izquierda.
- Marca `.brand-hero` en flood a escala hero; un headline Condensed; un lede; CTAs flood + ghost.
- Motion: `rise`, draw de líneas de cancha, pulse en huecos; respeta `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** usar tokens `:root` (`--turf`, `--flood`, `--paper`, etc.) vía Tailwind theme o `var(...)`.
- **Do** poner BaFut en Condensed flood a escala hero en superficies de marca.
- **Do** escoger flood para la acción primaria y bib solo para urgencia de cupo.
- **Do** construir feeds como listas con reglas + MatchRow, no grids de cards.
- **Do** mantener targets ≥2.75rem y el anillo de focus flood + turf-deep.

### Don't:
- **Don't** introducir purple SaaS, cream+terracotta AI-default, ni Inter/Roboto como display.
- **Don't** envolver el hero o el feed en cards redondeadas con sombra.
- **Don't** saturar flood o bib como fondos de sección enteros.
- **Don't** reemplazar Barlow Condensed / Outfit / IBM Plex Mono sin actualizar este sistema.
- **Don't** meter stats, agendas o promos en el primer viewport del hero.
