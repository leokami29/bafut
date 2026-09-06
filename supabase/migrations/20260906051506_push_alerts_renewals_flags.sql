-- Fase C: Web Push (match_alerts + push_subscriptions + push_deliveries),
-- feature flags (kill-switch), renovaciones T-7/T-1.

-- ---------------------------------------------------------------------------
-- 1. push_subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_len check (char_length(endpoint) between 10 and 2048),
  constraint push_subscriptions_p256dh_len check (char_length(p256dh) between 1 and 256),
  constraint push_subscriptions_auth_len check (char_length(auth) between 1 and 256)
);

create unique index if not exists push_subscriptions_endpoint_uidx
  on public.push_subscriptions (endpoint);
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on table public.push_subscriptions from anon;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- 2. match_alerts
-- ---------------------------------------------------------------------------
create table if not exists public.match_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  city_id uuid not null references public.cities(id) on delete cascade,
  sport text,
  format text,
  level text,
  neighborhood text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_alerts_sport_check check (
    sport is null or sport in ('futbol', 'futbol_sala', 'basquet', 'voleibol', 'padel')
  ),
  constraint match_alerts_format_check check (
    format is null or format in ('2v2', '3v3', '4v4', '5v5', '6v6', '7v7', '8v8', '11v11')
  ),
  constraint match_alerts_level_check check (
    level is null or level in ('any', 'low', 'mid', 'high')
  ),
  constraint match_alerts_neighborhood_len check (
    neighborhood is null or char_length(btrim(neighborhood)) between 1 and 80
  )
);

create index if not exists match_alerts_enabled_city_idx
  on public.match_alerts (enabled, city_id)
  where enabled = true;
create index if not exists match_alerts_user_idx
  on public.match_alerts (user_id);

alter table public.match_alerts enable row level security;

drop policy if exists match_alerts_select_own on public.match_alerts;
create policy match_alerts_select_own on public.match_alerts
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists match_alerts_insert_own on public.match_alerts;
create policy match_alerts_insert_own on public.match_alerts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists match_alerts_update_own on public.match_alerts;
create policy match_alerts_update_own on public.match_alerts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists match_alerts_delete_own on public.match_alerts;
create policy match_alerts_delete_own on public.match_alerts
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on table public.match_alerts from anon;
grant select, insert, update, delete on table public.match_alerts to authenticated;

-- Máximo 5 alertas por usuario (anti-spam).
create or replace function private.enforce_match_alert_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.match_alerts
  where user_id = new.user_id;

  if tg_op = 'INSERT' and v_count >= 5 then
    raise exception 'Máximo 5 alertas por cuenta.';
  end if;

  return new;
end;
$$;

drop trigger if exists match_alerts_limits on public.match_alerts;
create trigger match_alerts_limits
  before insert on public.match_alerts
  for each row execute function private.enforce_match_alert_limits();

-- ---------------------------------------------------------------------------
-- 3. push_deliveries (idempotencia alert×match)
-- ---------------------------------------------------------------------------
create table if not exists public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.match_alerts(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  status text not null default 'sent'
    check (status in ('sent', 'failed', 'gone', 'skipped')),
  error_code text,
  created_at timestamptz not null default now(),
  constraint push_deliveries_alert_match_unique unique (alert_id, match_id)
);

create index if not exists push_deliveries_match_idx
  on public.push_deliveries (match_id);
create index if not exists push_deliveries_created_idx
  on public.push_deliveries (created_at desc);

alter table public.push_deliveries enable row level security;

-- Solo service_role / cron escribe; usuarios ven las propias vía join alert.
drop policy if exists push_deliveries_select_own on public.push_deliveries;
create policy push_deliveries_select_own on public.push_deliveries
  for select to authenticated
  using (
    exists (
      select 1 from public.match_alerts a
      where a.id = push_deliveries.alert_id
        and a.user_id = auth.uid()
    )
  );

revoke insert, update, delete on table public.push_deliveries from anon, authenticated;
grant select on table public.push_deliveries to authenticated;

-- ---------------------------------------------------------------------------
-- 4. feature_flags (kill-switch sin redeploy)
-- ---------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default true,
  description text,
  updated_at timestamptz not null default now(),
  constraint feature_flags_key_len check (char_length(key) between 1 and 64)
);

alter table public.feature_flags enable row level security;

drop policy if exists feature_flags_select_all on public.feature_flags;
create policy feature_flags_select_all on public.feature_flags
  for select to authenticated, anon
  using (true);

drop policy if exists feature_flags_admin_write on public.feature_flags;
create policy feature_flags_admin_write on public.feature_flags
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on table public.feature_flags to anon, authenticated;
grant insert, update, delete on table public.feature_flags to authenticated;

insert into public.feature_flags (key, enabled, description) values
  ('premium_paywall', true, 'Mostrar paywall / solicitud Premium a dueños'),
  ('push_alerts', true, 'Enviar y permitir opt-in de alertas push'),
  ('directory_premium_boost', true, 'Priorizar canchas premium en el directorio')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 5. subscription_renewal_reminders (T-7 / T-1)
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_renewal_reminders (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.venue_subscriptions(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('t7', 't1')),
  channel text not null default 'admin_queue'
    check (channel in ('whatsapp', 'email', 'admin_queue')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'skipped')),
  due_at timestamptz not null,
  sent_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint subscription_renewal_reminders_unique
    unique (subscription_id, reminder_type)
);

create index if not exists subscription_renewal_reminders_status_idx
  on public.subscription_renewal_reminders (status, due_at);

alter table public.subscription_renewal_reminders enable row level security;

drop policy if exists renewal_reminders_select_admin on public.subscription_renewal_reminders;
create policy renewal_reminders_select_admin on public.subscription_renewal_reminders
  for select to authenticated
  using (public.is_admin() or public.admin_has_role(array['billing']));

drop policy if exists renewal_reminders_update_admin on public.subscription_renewal_reminders;
create policy renewal_reminders_update_admin on public.subscription_renewal_reminders
  for update to authenticated
  using (public.is_admin() or public.admin_has_role(array['billing']))
  with check (public.is_admin() or public.admin_has_role(array['billing']));

revoke insert, delete on table public.subscription_renewal_reminders from anon, authenticated;
grant select, update on table public.subscription_renewal_reminders to authenticated;

comment on table public.push_subscriptions is
  'Endpoints Web Push por usuario. Cron borra filas con 410 Gone.';
comment on table public.match_alerts is
  'Preferencias de alerta de partidos. Índices (enabled, city_id).';
comment on table public.push_deliveries is
  'Idempotencia: unique(alert_id, match_id). Sin PII en error_code.';
comment on table public.feature_flags is
  'Kill-switch DB (sin redeploy). Env FEATURE_* puede forzar off.';
comment on table public.subscription_renewal_reminders is
  'Cola T-7/T-1 renovación Premium. Canal preferido WhatsApp/admin; email solo Resend.';
