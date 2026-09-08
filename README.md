# BaFut

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

Partidos abiertos y “falta un jugador” en Barranquilla. El organizador publica un hueco (cancha, hora, posición); alguien pide el cupo; el host confirma. BaFut no reemplaza WhatsApp: concentra la demanda y el link se comparte por donde ya se organizan. Opcionalmente (flag off por defecto), el dueño puede activar **Pedir turno** para alquilar horario con comprobante — BaFut lista el pedido; el dueño confirma el pago.

**Demo:** [bafut.macuttech.com](https://bafut.macuttech.com)

## Qué hace

- Feed de partidos abiertos del día / ciudad
- Publicar un partido (hueco) con cancha, deporte, formato y cupos faltantes — **no requiere tarifas de cancha**; el aporte entre jugadores es opcional y distinto del alquiler
- Pedir cupo y confirmación del host
- Link compartible `/p/{codigo}` (pensado para WhatsApp)
- Directorio de canchas (`/canchas`) con detalle y mapa
- Multideporte: fútbol, fútbol sala, básquet, voleibol y pádel
- Selector de ciudad (cookie `bafut_city`; Barranquilla es la primera)
- Auth por correo + clave (Supabase); email solo para recuperar clave / confirmar cuenta
- Página de apoyo / donaciones opcionales (`/apoyar`)
- **Pedir turno** (piloto, off por defecto): alquiler de horario con comprobante al dueño — **sí exige** precios del deporte, dueño y flags (`/canchas/[slug]/turno`, `/perfil/turnos`, Mesa → Turnos)

**Fuera de alcance (por ahora):** cobro entre jugadores del partido, chat in-app, app nativa, pasarela de pago automatizada.

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
   | `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase (prod o staging según entorno) |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Publishable key del cliente |
   | `NEXT_PUBLIC_SITE_URL` | Sí | Local: `http://localhost:3005` |
   | `STAGING_SUPABASE_*` / `STAGING_SITE_URL` | No | Plantilla del proyecto staging; la app no las lee en runtime (ver [docs/staging.md](./docs/staging.md)) |
   | `NEXT_PUBLIC_DONATE_*` | No | Ko-fi / GitHub Sponsors / Nequi (donaciones) |
   | `NEXT_PUBLIC_PREMIUM_*` | No | Precio, días, Nequi/banco para pago premium dueños |
   | `NEXT_PUBLIC_VENUE_OWNER_*` | No | WhatsApp / email para dueños de cancha |
   | `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | No | Google Analytics 4 |
   | `CRON_SECRET` | Prod (cron) | Bearer para `/api/cron/*` (`openssl rand -hex 32`; distinto staging vs prod) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Prod (cron push/renewals) | Solo server; nunca `NEXT_PUBLIC_` |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | No* | Web Push (fase C); *obligatorias si `push_alerts` está on |
   | `VAPID_SUBJECT` | No | `mailto:` o `https:` del emisor |
   | `FEATURE_*` | No | Pisa DB (`PREMIUM_PAYWALL`, `PUSH_ALERTS`, `DIRECTORY_PREMIUM_BOOST`, `VENUE_BOOKING`) |
   | `RESEND_API_KEY` | No | Email renovaciones; sin esto → cola WhatsApp/admin |

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

**Authentication → Providers → Google**
- Enable: **ON**
- Client ID y Client Secret: obtenerlos de [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Authorized redirect URIs: agregar `https://bafut.macuttech.com/auth/v1/callback` (y `http://localhost:3005/auth/v1/callback` para dev)

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

## Ops: cron, admins y límites

### Cron (`CRON_SECRET`)

Todos los endpoints bajo `/api/cron/*` deben validar:

```http
Authorization: Bearer <CRON_SECRET>
```

Hoy:
- `GET /api/cron/weekly-matches` — templates → partidos del día
- `GET /api/cron/expire-subscriptions` — `venue_subscriptions` `active` → `expired` si `expires_at < now()`
- `GET /api/cron/expire-booking-holds` — `venue_bookings` `pending` con hold vencido → `expired` (no-op si `venue_booking` está off)

Helper: `lib/cron-auth.ts` (`requireCronSecret`). La respuesta solo incluye ids/conteos y mensajes de error de RPC (sin PII).

En Railway/Vercel: variable `CRON_SECRET` + crons diarios (y periódico para holds de turno, p. ej. cada 15–30 min) que peguen ese header.

### Soft-delete de canchas

`delete_venue` pone `venues.deleted_at` (no borra la fila). Claims, suscripciones y fotos se retienen para auditoría/habeas data. El directorio y fichas públicas filtran `deleted_at is null`; admins siguen viendo soft-deleted vía RLS.

### Pago premium (Nequi / banco)

Variables `NEXT_PUBLIC_PREMIUM_NEQUI`, `NEXT_PUBLIC_PREMIUM_BANK_*`, precio y duración: ver `.env.example`. El dueño sube comprobante; un admin con rol `billing` o `super` aprueba.

### Web Push (VAPID)

Cuando esté activa la fase C (`push_alerts`):

| Variable | Dónde |
| --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Cliente (subscribe) |
| `VAPID_PRIVATE_KEY` | Solo servidor (enviar push; nunca `NEXT_PUBLIC_`) |

Generar con `npx web-push generate-vapid-keys`. Safari/iOS: solo con PWA instalada. Detalle de staging: [docs/staging.md](./docs/staging.md).

### Crear un admin

```sql
insert into public.admins (user_id, role)
values ('<uuid-del-perfil>', 'super');
-- roles: moderation (claims) | billing (subs) | super (todo)
```

`role` default `super` — el operador actual no pierde permisos. UI de roles diferida hasta haber >1 editor.

### Web Push y alertas

1. Generá VAPID: `npx web-push generate-vapid-keys` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`.
2. Configurá `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` en Railway.
3. Cron horario: `GET /api/cron/push-alerts` con header `Authorization: Bearer $CRON_SECRET`.
4. Cron diario renovaciones: `GET /api/cron/renewal-reminders` (misma auth) → cola en `/admin/renewals`.
5. UI usuario: `/perfil/alertas` (opt-in Notification + preferencias).
6. Kill-switch: `update feature_flags set enabled=false where key='push_alerts';` (sin redeploy) o `FEATURE_PUSH_ALERTS=0`.
7. iOS / WhatsApp: ver [docs/ios-pwa-push.md](./docs/ios-pwa-push.md).

Flags DB: `premium_paywall`, `push_alerts`, `directory_premium_boost`, `venue_booking` (**default off**).

### Pedir turno (`venue_booking`)

Publicar un hueco (`/partidos/nuevo`) **no** requiere precios de cancha: el partido se publica igual; el snapshot de tarifa es best-effort. **Pedir turno** sí exige tarifas del deporte + dueño + flags.

Kill-switch global + opt-in por cancha. CTA y flujos solo si **ambos** están on, la cancha tiene `owner_id` y pricing usable para el deporte.

| Pieza | Detalle |
| --- | --- |
| Flag DB | `feature_flags.key = 'venue_booking'` (seed `enabled=false`) |
| Env | `FEATURE_VENUE_BOOKING=1` / `0` (pisa DB; requiere restart) |
| Opt-in cancha | `venues.booking_enabled` (toggle en Mesa del dueño) |
| Jugador | `/canchas/[slug]/turno`, `/perfil/turnos` |
| Dueño | Mesa → Turnos (`/canchas/[slug]/admin/turnos`) |
| Cron | `GET /api/cron/expire-booking-holds` (Bearer `CRON_SECRET`) |
| Hold | pedido `pending` bloquea franja **4h**; luego `expired` |

**Activar piloto (ej. Padel Park):**

```sql
-- 1) Kill-switch global (staging primero)
update public.feature_flags set enabled = true where key = 'venue_booking';

-- 2) Opt-in de la cancha piloto
update public.venues
set booking_enabled = true
where slug = 'padel-park' and deleted_at is null;
```

O forzá el flag con `FEATURE_VENUE_BOOKING=1` en el entorno y el mismo `UPDATE` de `booking_enabled`. Dejá prod en off hasta validar staging.

**Smoke rápido:** sin flag o sin `booking_enabled` → sin CTA; con ambos on + precios del deporte → pedir turno con comprobante; pending bloquea partido/otro turno en la misma franja; approve/reject en inbox; cron expira holds vencidos.

### Rate limits / caps (DB)

| Acción | Límite |
| --- | --- |
| Reclamar cancha | 5 / hora / usuario |
| Subir foto | 20 / hora / usuario; máx. 12 fotos por cancha; 5 MB JPG/PNG/WEBP |
| Pedir turno (submit) | 5 / hora / usuario |
| Aprobar/rechazar turno (dueño) | 30 / hora / usuario |
| Crear suscripción (admin) | 30 / hora |
| Subscribe dueño (A2) | usar scope `venue_subscribe` en el RPC de solicitud |

Mutaciones admin clave escriben en `admin_actions` (sin PII en `meta`).

## Estructura

```
app/           # Rutas App Router (/, /canchas, /partidos, /p/[code], auth…)
components/    # UI (feed, mapa, nav, forms…)
docs/          # Ops: staging, cold-start BQ, iOS PWA push + WA
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

## Staging vs producción

Usá un **proyecto Supabase aparte** para staging; las migraciones se prueban ahí antes de prod. La app siempre lee `NEXT_PUBLIC_SUPABASE_*` del entorno activo; `STAGING_*` en `.env.example` es plantilla/referencia (sin secrets reales en el repo).

Detalle: [docs/staging.md](./docs/staging.md).

## Cold-start Barranquilla

Sin partidos del día en el feed, premium no convierte. Runbook corto (N hosts semilla, 3–5 partidos hoy, outreach WhatsApp): [docs/cold-start-barranquilla.md](./docs/cold-start-barranquilla.md).

Segunda ciudad solo cuando BQ tenga liquidez estable.

## Añadir otra ciudad

Inserta una fila en `cities` y sus `venues`. No hace falta ramificar código. El selector guarda la ciudad en la cookie `bafut_city`. Preferí esperar liquidez en Barranquilla (ver cold-start arriba).

## Contribuir

Issues y PRs son bienvenidos. Mantén el alcance acotado: el producto junta huecos y demanda; Pedir turno es opt-in del dueño, no el core.

1. Fork y branch desde `main`
2. `npm install` → `npm run lint` → `npm run build` si tocaste rutas o datos
3. Abre un PR con el *por qué* del cambio

## Licencia

[MIT](./LICENSE) © 2026 BaFut contributors.

## Crédito

Hecho por [Macuttech](https://www.macuttech.com/).
