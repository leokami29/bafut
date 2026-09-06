# Push iOS / PWA y fallback WhatsApp

## Web Push en iOS / iPadOS

- Safari solo entrega Web Push si la app está **instalada como PWA** (Compartir → Añadir a pantalla de inicio) y se abre desde el ícono.
- Hace falta iOS 16.4+ y permiso de notificaciones concedido dentro de la PWA.
- Chrome/Firefox en iOS usan el motor de Safari: mismas reglas; sin instalación no hay push.
- Android Chrome / Desktop sí soportan push sin instalar, aunque la PWA mejora el opt-in.

Si el usuario no puede o no quiere push: las alertas en `/perfil/alertas` siguen guardadas, pero el cron no tendrá `push_subscriptions` → delivery `skipped`.

## Fallback WhatsApp (hosts / dueños)

No dependemos del **SMTP free de Supabase** (≈2 emails/hora) para retención operativa.

| Caso | Canal |
| --- | --- |
| Host con pedidos de cupo | Deep-link inbox → partido `#cupos` + WhatsApp del seeker al confirmar |
| Renovación Premium T-7 / T-1 | Cola en `/admin/renewals` con botón **Abrir WhatsApp** al `contact_whatsapp` de la cancha o al WA del owner |
| Email renovación | Solo si `RESEND_API_KEY` está configurado; si no, `admin_queue` |

Cron: `GET /api/cron/renewal-reminders` con `Authorization: Bearer $CRON_SECRET` encola filas idempotentes (`subscription_id` + `t7`/`t1`).

## Kill-switch push

Sin redeploy:

```sql
update public.feature_flags set enabled = false, updated_at = now()
where key = 'push_alerts';
```

Con restart (env): `FEATURE_PUSH_ALERTS=0`.
