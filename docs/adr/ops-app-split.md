# ADR: BaFut web vs BaFut_Admin (apps separadas)

- Status: accepted (supersede monorepo `apps/ops`)
- Date: 2026-09-15

## Context

El panel dueños/plataforma no debe vivir dentro del mismo deploy ni del mismo árbol de producto que el feed de jugadores. Blast radius y ownership distintos.

## Decision

1. **`D:\EstudioALL\2026\BaFut`** — solo app **web** (jugadores): feed, partidos, ficha, turno, perfil, reclamar.
2. **`D:\EstudioALL\2026\BaFut_Admin`** — app **aparte**: Mesa dueños, `/admin` plataforma, crons.
3. Misma Supabase. Migraciones de schema quedan en **BaFut** (`supabase/migrations`).
4. En web, rutas `/admin`, `/canchas/*/admin` y `/api/cron` hacen **redirect 308** a `NEXT_PUBLIC_OPS_URL` / `NEXT_PUBLIC_ADMIN_URL` (default `http://localhost:3006`).
5. Dominio compartido de ocupación: `@bafut/venue-ops` (paquete en cada repo; web lo usa para turno/ocupación pública).

## Consequences

- Dos repos/carpetas, dos deploys Railway.
- Links “Ir al panel” en web apuntan al host Admin.
- Auth Supabase: redirect URLs para ambos hosts.
