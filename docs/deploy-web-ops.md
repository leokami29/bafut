# Deploy: BaFut web + BaFut_Admin

Apps **separadas** (no monorepo ops):

| Servicio | Carpeta | Puerto local | Env |
|----------|---------|--------------|-----|
| `bafut-web` | `D:\EstudioALL\2026\BaFut` | 3005 | `NEXT_PUBLIC_OPS_URL=https://ops…` |
| `bafut-admin` | `D:\EstudioALL\2026\BaFut_Admin` | 3006 | `BAFUT_SURFACE=ops` |

Misma Supabase. Crons **solo** en BaFut_Admin.

## Local

```bash
# Terminal 1 — jugadores
cd D:\EstudioALL\2026\BaFut
npm run dev

# Terminal 2 — admin
cd D:\EstudioALL\2026\BaFut_Admin
npm run dev
```

En BaFut web, `NEXT_PUBLIC_OPS_URL=http://localhost:3006`. Visitar `/canchas/.../admin` → redirect 308 a Admin.

## Auth Supabase

Redirect URLs para ambos hosts (web + admin) y locales `:3005` / `:3006`.
