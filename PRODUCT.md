# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Jugadores y organizadores de pateadas en Barranquilla (y, más adelante, otras ciudades) que arman partidos en canchas sintéticas / multideporte y necesitan completar cupos a corto plazo — a menudo el mismo día.

- **Host / organizador:** publicó o va a publicar un partido y le falta gente (posición, cupo o equipo).
- **Jugador que busca:** quiere entrar a una pateada abierta cerca, sin negociar cancha ni reemplazar el grupo de WhatsApp.

[Confirmado: README, copy SEO, flujos `/partidos`, `/p/{codigo}`, directorio `/canchas`.]

## Product Purpose

BaFut es el radar de huecos y pateadas abiertas: el organizador publica un hueco (cancha, hora, deporte/formato, cupos o posiciones); alguien pide el cupo; el host confirma. El link `/p/{codigo}` se comparte por donde ya se organiza (sobre todo WhatsApp).

Éxito = encontrar o completar gente para jugar, rápido y con poca fricción — no reservar la cancha ni mediar el pago del partido.

[Confirmado: README “Qué hace” / “Fuera de alcance”.]

## Positioning

Junta demanda y oferta de cupos en la ciudad; **no** es booking de canchas, chat in-app ni reemplazo de WhatsApp. Concentra “falta un jugador / hay hueco hoy” y deja la organización social donde ya vive.

[Confirmado: README y claim de producto en `lib/seo.ts`.]

## Operating Context

- Uso típico en el celular, a menudo en movimiento o desde el chat del grupo.
- Ciudad activa vía cookie `bafut_city` (Barranquilla primero; más ciudades = filas en `cities` + `venues`).
- Flujo host → publicar → compartir link → claim → confirmación.
- Directorio de canchas con detalle y mapa (MapLibre).
- Multideporte: fútbol, fútbol sala, básquet, voleibol, pádel.
- Auth correo + clave (Supabase); email para recuperar clave / confirmar cuenta según config.
- Apoyo opcional / donaciones en `/apoyar`.
- PWA instalable (`manifest`, service worker, iconos).

[Confirmado: README, `app/manifest.ts`, `public/sw.js`, rutas App Router.]

## Capabilities and Constraints

**Incluye (hoy):** feed de partidos abiertos; publicar partido; pedir cupo y confirmación del host; link compartible; directorio de canchas; selector de ciudad; auth; página de apoyo.

**Fuera de alcance (por ahora):** pagos del partido, chat in-app, reserva real con la cancha, app nativa.

**Stack (código existente — no greenfield):** Next.js 16 (App Router) + React 19, Supabase (Auth + Postgres), MapLibre GL, Tailwind CSS 4, TypeScript, PWA. Demo: https://bafut.macuttech.com. Dev local: `npm run dev` en puerto **3005**.

**Terminología del producto:** hueco, pateada, cupo, host, cancha, claim/pedido de cupo.

**Abierto / no inventar:** métricas de adopción, pricing comercial, SLA, testimonios formales, roadmap de ciudades más allá del modelo de datos.

## Brand Commitments

- **Nombre:** BaFut.
- **Voz:** español colombiano costero / cotidiano de pateada; directo, sin jerga SaaS.
- **Identidad visual vinculante (voluntaria del brief + tokens en código):** materiales/tokens turf / flood / paper (y sistema relacionado chalk, bib, ink, mist); tipografías **Barlow Condensed** (display), **Outfit** (sans), **IBM Plex Mono** (mono).
- **Anti-patrones de marca:** no purple SaaS; no cream + terracotta genérico AI-default.
- **Hecho por:** Macuttech. Licencia MIT.

[Confirmado: brief de sesión + `app/layout.tsx` + `:root` en `app/globals.css` + README crédito.]

## Evidence on Hand

- Producto runnable y copy real en rutas, SEO (`lib/seo.ts`, `lib/hero-copy.ts`) y README.
- Datos de canchas / scrapes en `data/scrapes/` (investigación; no fabricar reviews de marketing).
- Assets: `/icon.svg`, `/icon-192.png`, `/icon-512.png`, manifest PWA.
- **No hay** testimonios de clientes ni benchmarks publicados para citar en marketing; no inventarlos.

## Product Principles

1. **Junta gente, no la cancha** — el valor es el hueco y la demanda; booking y pagos quedan fuera.
2. **WhatsApp-compatible** — el link compartible es el puente; no pelear con el chat del grupo.
3. **Radar de hoy** — priorizar claridad de “qué hay abierto ahora / cerca” sobre dashboard enterprise.
4. **Ciudad primero** — Barranquilla es la prueba; el modelo admite más ciudades sin ramificar producto.
5. **Identidad de cancha** — preservar turf/flood/paper y la tipografía comprometida; no derivar a plantillas genéricas.

## Accessibility & Inclusion

- Base web con skip-link y focus visible ya presentes en CSS global.
- Meta de uso: móvil, contraste legible en sol / cancha (tokens claros sobre paper/turf).
- Estándar formal (WCAG nivel) **no fijado** aún — tratar como mejora continua, no como claim de compliance.
