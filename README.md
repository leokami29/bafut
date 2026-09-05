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

El cliente manda `redirectTo` = `{NEXT_PUBLIC_SITE_URL}/auth/callback` (prioridad sobre Site URL si está en la allowlist). El destino post-login (`/entrar/clave`) va en cookie, **no** en `?next=` del mail (para no romper el match exacto de la allowlist).

#### Checklist Supabase Dashboard

**Authentication → Providers → Email**
- Confirm email: **OFF**
- Magic link: **OFF**

**Authentication → URL configuration**
1. **Site URL** = `https://bafut.macuttech.com`  
   (nunca `localhost:3000` ni `localhost:8080`; el “Port 8080” de Railway es solo el puerto **interno** del contenedor)
2. **Redirect URLs** (agregá todas):
   - `https://bafut.macuttech.com/auth/callback`
   - `https://bafut.macuttech.com/**` (comodín recomendado)
   - `http://localhost:3005/auth/callback`
   - `http://localhost:3005/**`
3. Sacá de la lista cualquier `localhost:8080` / `localhost:3000` viejo.

**Authentication → Email Templates → Reset password**
- El botón debe usar `{{ .ConfirmationURL }}` (no hardcodear localhost).
- Si personalizaste el template con `{{ .SiteURL }}` + path inventado, preferí `{{ .ConfirmationURL }}` o `{{ .RedirectTo }}` según [docs](https://supabase.com/docs/guides/auth/auth-email-templates).

#### Checklist Railway

- Variable **`NEXT_PUBLIC_SITE_URL=https://bafut.macuttech.com`** (ya en el servicio `bafut-web`).
- Tras cambiarla: **Redeploy** (se inyecta en build; sin redeploy el JS del browser sigue con el valor viejo).
- Custom domain `bafut.macuttech.com` → Port 8080 es normal (interno). La URL pública es `https://…`, sin `:8080`.

#### Prod vs local (recuperar clave)

| Dónde pedís el correo | `redirectTo` en el mail | Qué esperar |
| --- | --- | --- |
| `https://bafut.macuttech.com/entrar` | `https://bafut.macuttech.com/auth/callback` | Abrí **una vez** → `/entrar/clave` |
| `http://localhost:3005/entrar` | `http://localhost:3005/auth/callback` | Solo funciona en esa máquina/puerto; hace falta allowlist local |
| Nunca | `…localhost:8080…` | Config vieja / otra app — BaFut no usa 8080 |

#### Si falla el correo

1. Pedí un correo **nuevo** desde producción (no reuses un mail viejo).
2. Abrí el link **una sola vez** en el mismo navegador (prefetch / doble clic → `otp_expired`).
3. En el mail, inspeccioná el link: debe tener `redirect_to=https%3A%2F%2Fbafut.macuttech.com%2Fauth%2Fcallback`.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Dev server en el puerto 3005 |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build (`next start`) |
| `npm run lint` | ESLint |
| `npm test` | Vitest (unitarios de `lib/`) |
| `npm run test:watch` | Vitest en modo watch |

## Regenerar tipos de Supabase

`lib/database.types.ts` se genera desde el proyecto Supabase (no editar a mano). Tras cambiar migraciones:

```bash
npx supabase login                      # o export SUPABASE_ACCESS_TOKEN=...
npx supabase link --project-ref <ref>   # una vez por proyecto
npx supabase gen types typescript --linked > lib/database.types.ts
```

Sin credenciales de CLI, los tipos se pueden validar contra las migraciones con `npm test`.

## Estructura

```
app/           # Rutas App Router (/, /canchas, /partidos, /p/[code], auth…)
components/    # UI (feed, mapa, nav, forms…)
lib/           # Datos, reglas de deporte, Supabase, SEO
hooks/         # Hooks de cliente
scripts/       # Scripts one-off (scrape de canchas, generación de SQL)
supabase/      # Migraciones SQL y seed
public/        # Estáticos y service worker
types/         # Tipos compartidos
```

### `proxy.ts` (middleware)

En Next.js 16 el middleware se llama `proxy.ts` (antes `middleware.ts`). El suyo hace dos cosas:

1. Redirige `/login` → `/entrar` (compat con links viejos, mapea `?callbackUrl=` a `?next=`).
2. `updateSession()` refresca la sesión de Supabase en cada request (ver `lib/supabase/session.ts`).

El matcher excluye assets estáticos (`_next/*`, imágenes, `sw.js`).

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
