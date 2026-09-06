# Staging vs producción (Supabase)

BaFut usa **dos proyectos Supabase** cuando hay staging: uno de producción y uno de pruebas. Las migraciones se aplican primero en staging; solo después en prod.

La app lee siempre `NEXT_PUBLIC_SUPABASE_*` del entorno activo (local, Railway staging o Railway prod). Las vars `STAGING_*` son **referencia / plantilla** para el proyecto de staging — no las consume el código en runtime.

## Proyectos

| Entorno | Proyecto Supabase | App / site URL típica |
| --- | --- | --- |
| **Prod** | Proyecto cloud de producción (ref actual: `pwbyxumeozgzkupppxds`) | `https://bafut.macuttech.com` |
| **Staging** | Proyecto cloud **separado** (crear cuando haya cuenta/credenciales) | Staging host o `http://localhost:3005` apuntando a staging |
| **Local** | Staging preferido, o `supabase start` si usás CLI local | `http://localhost:3005` |

Si aún **no** hay proyecto staging en la nube: dejá los placeholders de `.env.example` y usá solo prod con cuidado, o Supabase local (`npx supabase start`) para probar migraciones.

## Variables (plantilla)

En `.env.example` / secret store del equipo:

```bash
# Activas (las que usa Next en el deploy/local actual)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=

# Referencia del proyecto staging (no las lee la app; documentan el segundo proyecto)
STAGING_SUPABASE_URL=https://YOUR_STAGING_REF.supabase.co
STAGING_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
STAGING_SUPABASE_PROJECT_REF=YOUR_STAGING_REF
STAGING_SITE_URL=https://staging.example.com
```

**No** commits de secretos reales. Copiá valores desde el dashboard de Supabase al secret store (1Password, Railway Variables, etc.).

### Cómo apuntar local a staging

1. Creá el proyecto staging en [supabase.com](https://supabase.com) (cuando haya credenciales).
2. En `.env.local` poné la URL y publishable key de **staging** en `NEXT_PUBLIC_SUPABASE_*`.
3. Auth → Site URL / Redirect URLs: `http://localhost:3005` (+ URL de staging si existe).
4. Opcional: guardá las mismas keys también en `STAGING_*` del secret store del equipo para no confundirlas con prod.

### Cómo apuntar un deploy a staging

Servicio Railway (o similar) **aparte** del de prod:

- `NEXT_PUBLIC_SUPABASE_URL` / `…_PUBLISHABLE_KEY` = staging
- `NEXT_PUBLIC_SITE_URL` = URL pública de ese servicio
- `CRON_SECRET` distinto al de prod

Prod sigue con las keys de `pwbyxumeozgzkupppxds` y `https://bafut.macuttech.com`.

## Flujo de migraciones

1. Escribí SQL en `supabase/migrations/` (orden por timestamp del nombre).
2. Aplicá en **staging** (dashboard SQL, `supabase db push` linkeado a staging, o CLI local).
3. Probá RLS, claims, premium, cron, etc. contra staging.
4. Solo entonces aplicá las mismas migraciones en **prod**.
5. Regenerá tipos si hace falta:

   ```bash
   npx supabase link --project-ref <STAGING_O_PROD_REF>
   npx supabase gen types typescript --linked > lib/database.types.ts
   ```

## Checklist al crear el proyecto staging

- [ ] Proyecto nuevo (no clonar datos PII de prod)
- [ ] Aplicar **todas** las migraciones en orden + `supabase/seed.sql` (ciudades/canchas)
- [ ] Auth Email: confirm OFF / magic link OFF (igual que prod; ver README)
- [ ] Site URL + Redirect URLs del host staging / localhost:3005
- [ ] Fila en `admins` para el operador de prueba (ver migración de claims)
- [ ] Vars documentadas en secret store; placeholders en `.env.example`
- [ ] Nunca mezclar service role de prod en un deploy de staging

## Qué no hacer

- Probar migraciones de RLS / pagos / Storage solo en prod.
- Reusar `CRON_SECRET` entre staging y prod.
- Pegar service role keys en el repo o en issues.
