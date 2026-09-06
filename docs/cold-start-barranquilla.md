# Cold-start Barranquilla (seeding ops)

Premium y el directorio no convierten si el feed está vacío. Antes de empujar monetización B2B, hace falta **liquidez visible**: hosts reales publicando huecos del día y seekers que pidan cupo.

Segunda ciudad: solo cuando BQ tenga oferta/demanda estable varios días seguidos.

## Meta mínima (por día hábil)

| Pieza | Cantidad | Notas |
| --- | --- | --- |
| Hosts semilla activos | **5–10** | Cuentas propias o amigos que organiceen pateadas reales |
| Partidos abiertos “hoy” | **3–5** | Distintos barrios / franjas (tarde + noche) |
| Outreach WhatsApp | **2–4** grupos BQ / semana | Link `/p/{codigo}` o feed `/partidos`, no spam |

N = 5 hosts es el piso; 8–10 permite rotar si alguien no publica un día.

## Runbook (primera semana)

### 1. Datos base

- Ciudad `barranquilla` + venues vía `supabase/seed.sql` (ya en repo).
- Admin ops: `INSERT INTO public.admins (user_id) VALUES ('<uuid>');` (dashboard Auth → copiar user id).
- Confirmar cookie/ciudad Barranquilla en la app.

### 2. Hosts semilla

1. Crear **N cuentas** (correo+clave) — una por host semilla; perfil con nombre/WhatsApp real.
2. Brief de 2 minutos: publicar hueco → copiar link `/p/…` → pegar en su grupo.
3. Checklist por host: al menos **1 partido abierto** en la semana 1; ideal **≥2**.

No inventar partidos fantasma a largo plazo: la confianza cae si nadie confirma cupos.

### 3. Partidos del día (cada mañana / mediodía)

Objetivo: **3–5** abiertos para “hoy” antes del pico (≈16:00–21:00 COT).

Por partido:

- Cancha real del directorio (norte / sur / centro mezclados).
- Hora concreta; deporte/formato claros; cupos faltantes > 0.
- Host listo para confirmar claims por WhatsApp o inbox.

Si a las 15:00 hay < 3 abiertos: coordinar por chat interno a 1–2 hosts semilla para publicar.

### 4. Outreach

- Grupos de pateada / barrio / universidad en Barranquilla (solo donde haya permiso o seas miembro).
- Mensaje corto: qué hay hoy + link al partido o a `https://bafut.macuttech.com/partidos`.
- Frecuencia: pocos posts útiles > bombardeo diario.
- Medir a ojo: claims / confirms en inbox; no hace falta dashboard el día 1.

### 5. Criterio de “liquidez estable”

Antes de escalar premium / segunda ciudad:

- [ ] ≥3 partidos “hoy” en el feed la mayoría de días laborables (2 semanas)
- [ ] ≥1 claim real confirmado por semana (no solo hosts semilla pidiéndose entre sí)
- [ ] Al menos un dueño de cancha en pipeline de reclamo (opcional pero útil para B2B)

## Anti-patrones

- Seed SQL de partidos falsos como sustituto de hosts humanos.
- Pagar o forzar premium sin demanda en el radar.
- Abrir otra ciudad porque “el schema lo permite”.

## Relacionado

- Staging / migraciones: [`docs/staging.md`](./staging.md)
- Seed de canchas: `supabase/seed.sql`
- Producto: `PRODUCT.md` (junta gente, no la cancha)
