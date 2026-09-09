-- Mesa: flags + Premium con fechas/monto, config de precio y audit.
-- RPCs solo billing|super; sin writes de cliente a feature_flags / grant.

-- ---------------------------------------------------------------------------
-- 1. Config de plan Premium (singleton key=default)
-- ---------------------------------------------------------------------------
create table if not exists public.premium_plan_config (
  key text primary key default 'default'
    check (key = 'default'),
  daily_rate_cop integer not null check (daily_rate_cop >= 0),
  default_duration_days integer not null default 30
    check (default_duration_days between 1 and 366),
  list_price_cop integer check (list_price_cop is null or list_price_cop >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.premium_plan_config is
  'Fuente de verdad del precio Premium BaFut (rate/día + duración default).';

insert into public.premium_plan_config (key, daily_rate_cop, default_duration_days, list_price_cop)
values ('default', 1663, 30, 49900)
on conflict (key) do nothing;

alter table public.premium_plan_config enable row level security;

drop policy if exists premium_plan_config_select on public.premium_plan_config;
create policy premium_plan_config_select on public.premium_plan_config
  for select to anon, authenticated
  using (true);

revoke insert, update, delete on public.premium_plan_config from anon, authenticated;
grant select on public.premium_plan_config to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Audit Premium / flags (además de admin_actions)
-- ---------------------------------------------------------------------------
create table if not exists public.premium_admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (char_length(action) between 1 and 80),
  venue_id uuid references public.venues(id) on delete set null,
  subscription_id uuid references public.venue_subscriptions(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists premium_admin_audit_created_idx
  on public.premium_admin_audit (created_at desc);
create index if not exists premium_admin_audit_venue_idx
  on public.premium_admin_audit (venue_id, created_at desc);
create index if not exists premium_admin_audit_actor_idx
  on public.premium_admin_audit (actor_id, created_at desc);

alter table public.premium_admin_audit enable row level security;

drop policy if exists premium_admin_audit_select on public.premium_admin_audit;
create policy premium_admin_audit_select on public.premium_admin_audit
  for select to authenticated
  using (public.admin_has_role(array['billing']::text[]));

revoke insert, update, delete on public.premium_admin_audit from anon, authenticated;
grant select on public.premium_admin_audit to authenticated;

create or replace function private.log_premium_admin_audit(
  p_action text,
  p_venue_id uuid default null,
  p_subscription_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return;
  end if;
  insert into public.premium_admin_audit (actor_id, action, venue_id, subscription_id, payload)
  values (
    v_uid,
    left(btrim(p_action), 80),
    p_venue_id,
    p_subscription_id,
    coalesce(p_payload, '{}'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. amount_cop en venue_subscriptions (+ índice lista admin)
-- ---------------------------------------------------------------------------
alter table public.venue_subscriptions
  add column if not exists amount_cop integer
  check (amount_cop is null or amount_cop >= 0);

comment on column public.venue_subscriptions.amount_cop is
  'Monto del periodo al otorgar/renovar (COP). Snapshot; no se recalcula.';

create index if not exists venue_subscriptions_admin_list_idx
  on public.venue_subscriptions (status, expires_at desc);

create index if not exists venue_subscriptions_venue_status_idx
  on public.venue_subscriptions (venue_id, status, expires_at desc);

-- ---------------------------------------------------------------------------
-- 4. feature_flags: solo lectura directa; writes vía RPC billing/super
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.feature_flags from anon, authenticated;
grant select on table public.feature_flags to anon, authenticated;

drop policy if exists feature_flags_admin_write on public.feature_flags;

-- ---------------------------------------------------------------------------
-- 5. RPC: admin_set_feature_flag
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_feature_flag(
  p_key text,
  p_enabled boolean
)
returns public.feature_flags
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.feature_flags%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if not public.admin_has_role(array['billing']::text[], v_uid) then
    raise exception 'Solo billing/super pueden cambiar feature flags';
  end if;

  perform private.assert_rate_limit(
    'admin_set_feature_flag',
    v_uid,
    60,
    interval '1 hour',
    'Demasiados cambios de flags. Esperá un rato.'
  );

  if p_key is null or char_length(btrim(p_key)) < 1 or char_length(btrim(p_key)) > 64 then
    raise exception 'Key de flag no válida';
  end if;

  update public.feature_flags
  set
    enabled = p_enabled,
    updated_at = now()
  where key = btrim(p_key)
  returning * into v_row;

  if not found then
    raise exception 'Flag no encontrada: %', p_key;
  end if;

  perform private.log_premium_admin_audit(
    'set_feature_flag',
    null,
    null,
    jsonb_build_object('key', v_row.key, 'enabled', v_row.enabled)
  );
  perform private.log_admin_action(
    'set_feature_flag',
    'feature_flag',
    null,
    jsonb_build_object('key', v_row.key, 'enabled', v_row.enabled)
  );

  return v_row;
end;
$$;

revoke all on function public.admin_set_feature_flag(text, boolean) from public, anon;
grant execute on function public.admin_set_feature_flag(text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. RPC: admin_update_premium_plan_config
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_premium_plan_config(
  p_daily_rate_cop integer,
  p_default_duration_days integer,
  p_list_price_cop integer default null
)
returns public.premium_plan_config
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.premium_plan_config%rowtype;
  v_list integer;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if not public.admin_has_role(array['billing']::text[], v_uid) then
    raise exception 'Solo billing/super pueden editar el precio Premium';
  end if;

  if p_daily_rate_cop is null or p_daily_rate_cop < 0 then
    raise exception 'daily_rate_cop no válido';
  end if;
  if p_default_duration_days is null
     or p_default_duration_days < 1
     or p_default_duration_days > 366 then
    raise exception 'Duración default no válida (1–366)';
  end if;

  v_list := coalesce(
    p_list_price_cop,
    p_daily_rate_cop * p_default_duration_days
  );
  if v_list < 0 then
    raise exception 'list_price_cop no válido';
  end if;

  insert into public.premium_plan_config as c (key, daily_rate_cop, default_duration_days, list_price_cop, updated_at)
  values ('default', p_daily_rate_cop, p_default_duration_days, v_list, now())
  on conflict (key) do update
    set
      daily_rate_cop = excluded.daily_rate_cop,
      default_duration_days = excluded.default_duration_days,
      list_price_cop = excluded.list_price_cop,
      updated_at = now()
  returning * into v_row;

  perform private.log_premium_admin_audit(
    'update_premium_plan_config',
    null,
    null,
    jsonb_build_object(
      'daily_rate_cop', v_row.daily_rate_cop,
      'default_duration_days', v_row.default_duration_days,
      'list_price_cop', v_row.list_price_cop
    )
  );
  perform private.log_admin_action(
    'update_premium_plan_config',
    'premium_plan_config',
    null,
    jsonb_build_object(
      'daily_rate_cop', v_row.daily_rate_cop,
      'default_duration_days', v_row.default_duration_days,
      'list_price_cop', v_row.list_price_cop
    )
  );

  return v_row;
end;
$$;

revoke all on function public.admin_update_premium_plan_config(integer, integer, integer)
  from public, anon;
grant execute on function public.admin_update_premium_plan_config(integer, integer, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Helper: cancelar premium actives de una cancha
-- ---------------------------------------------------------------------------
create or replace function private.cancel_active_premium_for_venue(
  p_venue_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.venue_subscriptions
  set
    status = 'cancelled',
    updated_at = now()
  where venue_id = p_venue_id
    and plan = 'premium'
    and status = 'active'
    and expires_at > now();

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. RPC: admin_grant_venue_premium
-- ---------------------------------------------------------------------------
create or replace function public.admin_grant_venue_premium(
  p_venue_id uuid,
  p_started_at timestamptz,
  p_expires_at timestamptz,
  p_amount_cop integer default 0,
  p_daily_rate_cop integer default null,
  p_note text default null,
  p_payment_method text default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_subscription_id uuid;
  v_days integer;
  v_cancelled integer;
  v_note text;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if not public.admin_has_role(array['billing']::text[], v_uid) then
    raise exception 'Solo billing/super pueden otorgar Premium';
  end if;

  if not exists (select 1 from public.venues where id = p_venue_id) then
    raise exception 'Cancha no encontrada';
  end if;

  if p_started_at is null or p_expires_at is null then
    raise exception 'Fechas requeridas';
  end if;
  if p_expires_at <= p_started_at then
    raise exception 'expires_at debe ser posterior a started_at';
  end if;

  v_days := greatest(1, ceil(extract(epoch from (p_expires_at - p_started_at)) / 86400.0)::integer);
  if v_days > 366 then
    raise exception 'Duración máxima 366 días';
  end if;

  if p_amount_cop is null or p_amount_cop < 0 then
    raise exception 'amount_cop no válido';
  end if;

  if p_payment_method is not null
     and p_payment_method not in ('nequi', 'bank_transfer', 'manual') then
    raise exception 'Método de pago no válido';
  end if;

  v_note := nullif(left(btrim(coalesce(p_note, '')), 300), '');

  perform private.assert_rate_limit(
    'venue_subscribe_admin',
    v_uid,
    30,
    interval '1 hour',
    'Demasiadas suscripciones creadas. Esperá un rato.'
  );

  v_cancelled := private.cancel_active_premium_for_venue(p_venue_id);

  insert into public.venue_subscriptions (
    venue_id,
    plan,
    started_at,
    expires_at,
    payment_method,
    status,
    amount_cop
  )
  values (
    p_venue_id,
    'premium',
    p_started_at,
    p_expires_at,
    coalesce(p_payment_method, 'manual'),
    'active',
    p_amount_cop
  )
  returning id into v_subscription_id;

  update public.venues
  set is_verified = true
  where id = p_venue_id;

  perform private.log_premium_admin_audit(
    'grant_venue_premium',
    p_venue_id,
    v_subscription_id,
    jsonb_build_object(
      'started_at', p_started_at,
      'expires_at', p_expires_at,
      'amount_cop', p_amount_cop,
      'daily_rate_cop', p_daily_rate_cop,
      'days', v_days,
      'cancelled_previous', v_cancelled,
      'has_note', v_note is not null
    )
  );
  perform private.log_admin_action(
    'grant_venue_premium',
    'venue_subscription',
    v_subscription_id,
    jsonb_build_object(
      'venue_id', p_venue_id,
      'amount_cop', p_amount_cop,
      'days', v_days,
      'cancelled_previous', v_cancelled
    )
  );

  return v_subscription_id;
end;
$$;

revoke all on function public.admin_grant_venue_premium(
  uuid, timestamptz, timestamptz, integer, integer, text, text
) from public, anon;
grant execute on function public.admin_grant_venue_premium(
  uuid, timestamptz, timestamptz, integer, integer, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. RPC: admin_extend_venue_premium
-- ---------------------------------------------------------------------------
create or replace function public.admin_extend_venue_premium(
  p_subscription_id uuid,
  p_new_expires_at timestamptz,
  p_amount_cop integer default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_sub public.venue_subscriptions%rowtype;
  v_note text;
  v_old_expires timestamptz;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if not public.admin_has_role(array['billing']::text[], v_uid) then
    raise exception 'Solo billing/super pueden extender Premium';
  end if;

  select * into v_sub
  from public.venue_subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'Suscripción no encontrada';
  end if;
  if v_sub.plan is distinct from 'premium' then
    raise exception 'Solo se extiende plan premium';
  end if;
  if v_sub.status is distinct from 'active' then
    raise exception 'Solo se extiende una suscripción active';
  end if;
  if p_new_expires_at is null or p_new_expires_at <= v_sub.expires_at then
    raise exception 'new_expires_at debe ser posterior al expires_at actual';
  end if;
  if ceil(extract(epoch from (p_new_expires_at - greatest(v_sub.expires_at, now()))) / 86400.0) > 366 then
    raise exception 'Extensión máxima 366 días';
  end if;
  if p_amount_cop is not null and p_amount_cop < 0 then
    raise exception 'amount_cop no válido';
  end if;

  v_note := nullif(left(btrim(coalesce(p_note, '')), 300), '');
  v_old_expires := v_sub.expires_at;

  perform private.assert_rate_limit(
    'venue_subscribe_admin',
    v_uid,
    30,
    interval '1 hour',
    'Demasiadas operaciones de suscripción. Esperá un rato.'
  );

  update public.venue_subscriptions
  set
    expires_at = p_new_expires_at,
    amount_cop = coalesce(p_amount_cop, amount_cop),
    updated_at = now()
  where id = p_subscription_id;

  perform private.log_premium_admin_audit(
    'extend_venue_premium',
    v_sub.venue_id,
    p_subscription_id,
    jsonb_build_object(
      'old_expires_at', v_old_expires,
      'new_expires_at', p_new_expires_at,
      'amount_cop', p_amount_cop,
      'has_note', v_note is not null
    )
  );
  perform private.log_admin_action(
    'extend_venue_premium',
    'venue_subscription',
    p_subscription_id,
    jsonb_build_object(
      'venue_id', v_sub.venue_id,
      'old_expires_at', v_old_expires,
      'new_expires_at', p_new_expires_at
    )
  );

  return p_subscription_id;
end;
$$;

revoke all on function public.admin_extend_venue_premium(uuid, timestamptz, integer, text)
  from public, anon;
grant execute on function public.admin_extend_venue_premium(uuid, timestamptz, integer, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 10. RPC: admin_cancel_venue_premium
-- ---------------------------------------------------------------------------
create or replace function public.admin_cancel_venue_premium(
  p_subscription_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_sub public.venue_subscriptions%rowtype;
  v_note text;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if not public.admin_has_role(array['billing']::text[], v_uid) then
    raise exception 'Solo billing/super pueden cancelar Premium';
  end if;

  select * into v_sub
  from public.venue_subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'Suscripción no encontrada';
  end if;
  if v_sub.status is distinct from 'active' then
    raise exception 'La suscripción no está active';
  end if;

  v_note := nullif(left(btrim(coalesce(p_note, '')), 300), '');

  perform private.assert_rate_limit(
    'venue_subscribe_admin',
    v_uid,
    30,
    interval '1 hour',
    'Demasiadas operaciones de suscripción. Esperá un rato.'
  );

  update public.venue_subscriptions
  set
    status = 'cancelled',
    updated_at = now()
  where id = p_subscription_id;

  perform private.log_premium_admin_audit(
    'cancel_venue_premium',
    v_sub.venue_id,
    p_subscription_id,
    jsonb_build_object(
      'had_expires_at', v_sub.expires_at,
      'has_note', v_note is not null
    )
  );
  perform private.log_admin_action(
    'cancel_venue_premium',
    'venue_subscription',
    p_subscription_id,
    jsonb_build_object('venue_id', v_sub.venue_id)
  );

  return p_subscription_id;
end;
$$;

revoke all on function public.admin_cancel_venue_premium(uuid, text) from public, anon;
grant execute on function public.admin_cancel_venue_premium(uuid, text) to authenticated;
