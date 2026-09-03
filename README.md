# BaFut

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

Partidos abiertos y “falta un jugador” en Barranquilla. El organizador publica un hueco (cancha, hora, posición); alguien pide el cupo; el host confirma. BaFut no reserva canchas ni reemplaza WhatsApp: concentra la demanda y el link se comparte por donde ya se organizan.

**Demo:** [bafut.macuttech.com](https://bafut.macuttech.com)

## Qué hace

- Feed de partidos abiertos del día / ciudad
- Publicar un partido con cancha, deporte, formato y cupos faltantes
- Pedir cupo y confirmación del host
- Link compartible `/p/{codigo}` (pensado para WhatsApp)
- Directorio de canchas (`/canchas`) con detalle y mapa
- Multideporte: fútbol, fútbol sala, básquet, voleibol y pádel
- Selector de ciudad (cookie `bafut_city`; Barranquilla es la primera)
- Auth por correo + clave (Supabase); email solo para recuperar clave / confirmar cuenta
- Página de apoyo / donaciones opcionales (`/apoyar`)

**Fuera de alcance (por ahora):** pagos, chat in-app, reserva real con la cancha, app nativa.

## Stack

| Pieza | Uso |
| --- | --- |
| [Next.js](https://nextjs.org/) 16 (App Router) + React 19 | App web |
| [Supabase](https://supabase.com/) (Auth + Postgres) | Datos y sesión |
| [MapLibre GL](https://maplibre.org/) | Mapas de canchas |
| Tailwind CSS 4 + TypeScript | UI y tipado |

## Arranque local

Requisitos: Node.js 20+ y un proyecto Supabase.

1. Clona el repo e instala dependencias:

   ```bash
   npm install
   ```

2. Copia las variables de entorno:

   ```bash
   cp .env.example .env.local
   ```

   Variables relevantes (sin valores secretos):

   | Variable | Obligatoria | Notas |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Publishable key del cliente |
   | `NEXT_PUBLIC_SITE_URL` | Sí | Local: `http://localhost:3005` |
   | `NEXT_PUBLIC_DONATE_*` | No | Ko-fi / GitHub Sponsors / Nequi |
   | `NEXT_PUBLIC_VENUE_OWNER_*` | No | WhatsApp / email para dueños de cancha |
   | `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | No | Google Analytics 4 |

3. Aplica las migraciones en `supabase/migrations/` (orden de nombre de archivo) y, si hace falta datos base, `supabase/seed.sql`.

4. En el dashboard de Supabase Auth (desarrollo):

   - **Site URL:** `http://localhost:3005`
   - **Redirect URLs:** `http://localhost:3005/auth/callback`

5. Arranca el servidor de desarrollo (puerto **3005**):

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3005](http://localhost:3005).

### Auth en producción

BaFut entra con **correo + clave** (sin magic link y sin confirmar el mail). El correo de Supabase se reserva para **recuperar clave**.

En **Authentication → Providers → Email**:
- Confirm email: **OFF**
- Magic link: **OFF** (si aparece)

Los links de recuperación usan el **Site URL** del dashboard. El cliente manda `emailRedirectTo` a `/auth/callback` (el destino va en cookie, p. ej. `/entrar/clave`).

En **Authentication → URL configuration**:

1. **Site URL** = `https://bafut.macuttech.com` (no dejes el default `http://localhost:3000`)
2. **Redirect URLs**, al menos:
   - `https://bafut.macuttech.com/auth/callback`
   - En local: `http://localhost:3005/auth/callback`

En Auth, desactivá **Magic link** y **Confirm email**.

En el hosting (p. ej. Railway): `NEXT_PUBLIC_SITE_URL=https://bafut.macuttech.com` en build-time.

#### Si falla un correo de recuperación / confirmación

Abrí el link **una sola vez** en el mismo navegador. BaFut local es puerto **3005**.

1. Site URL = producción.
2. Allowlist exacta a `/auth/callback`.
3. Pedí un correo nuevo; un solo clic.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Dev server en el puerto 3005 |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build (`next start`) |
| `npm run lint` | ESLint |

## Estructura

```
app/           # Rutas App Router (/, /canchas, /partidos, /p/[code], auth…)
components/    # UI (feed, mapa, nav, forms…)
lib/           # Datos, reglas de deporte, Supabase, SEO
hooks/         # Hooks de cliente
supabase/      # Migraciones SQL y seed
public/        # Estáticos y service worker
types/         # Tipos compartidos
```

## Añadir otra ciudad

Inserta una fila en `cities` y sus `venues`. No hace falta ramificar código. El selector guarda la ciudad en la cookie `bafut_city`.

## Contribuir

Issues y PRs son bienvenidos. Mantén el alcance acotado: el producto junta huecos y demanda; no es un booking engine.

1. Fork y branch desde `main`
2. `npm install` → `npm run lint` → `npm run build` si tocaste rutas o datos
3. Abre un PR con el *por qué* del cambio

## Licencia

[MIT](./LICENSE) © 2026 BaFut contributors.

## Crédito

Hecho por [Macuttech](https://www.macuttech.com/).
