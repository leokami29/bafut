-- Semana 1: Monetización - Canchas Premium
-- Tablas para suscripciones, fotos y verificación de canchas

-- ============================================
-- 1. Tabla de admins (necesaria para las policies)
-- ============================================
create table if not exists public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================
-- 2. Campos nuevos en venues
-- ============================================
alter table public.venues
  add column if not exists is_verified boolean not null default false,
  add column if not exists owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists contact_whatsapp text,
  add column if not exists contact_email text;

create index if not exists venues_owner_idx on public.venues (owner_id);

-- ============================================
-- 3. Tabla de suscripciones de canchas
-- ============================================
create table if not exists public.venue_subscriptions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  plan text not null check (plan in ('basic', 'premium')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  auto_renew boolean not null default false,
  payment_method text check (payment_method in ('nequi', 'bank_transfer', 'manual', null)),
  status text not null check (status in ('active', 'expired', 'cancelled', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists venue_subscriptions_venue_idx on public.venue_subscriptions (venue_id);
create index if not exists venue_subscriptions_status_idx on public.venue_subscriptions (status, expires_at);

-- ============================================
-- 4. Tabla de fotos de canchas
-- ============================================
create table if not exists public.venue_photos (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  url text not null,
  caption text,
  sort_order integer not null default 0,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists venue_photos_venue_idx on public.venue_photos (venue_id, sort_order);

-- ============================================
-- 5. RLS Policies
-- ============================================
alter table public.venue_subscriptions enable row level security;
alter table public.venue_photos enable row level security;

-- venue_subscriptions: todos pueden leer, solo admins pueden modificar
create policy venue_subscriptions_select on public.venue_subscriptions
  for select to authenticated, anon
  using (true);

-- venue_photos: todos pueden leer
create policy venue_photos_select on public.venue_photos
  for select to authenticated, anon
  using (true);

-- venue_photos: dueños pueden insertar
create policy venue_photos_insert on public.venue_photos
  for insert to authenticated
  with check (
    exists (
      select 1 from public.venues v
      where v.id = venue_photos.venue_id
        and (v.owner_id = auth.uid() or auth.uid() in (select user_id from public.admins))
    )
  );

-- venue_photos: dueños pueden actualizar
create policy venue_photos_update on public.venue_photos
  for update to authenticated
  using (
    exists (
      select 1 from public.venues v
      where v.id = venue_photos.venue_id
        and (v.owner_id = auth.uid() or auth.uid() in (select user_id from public.admins))
    )
  );

-- venue_photos: dueños pueden eliminar
create policy venue_photos_delete on public.venue_photos
  for delete to authenticated
  using (
    exists (
      select 1 from public.venues v
      where v.id = venue_photos.venue_id
        and (v.owner_id = auth.uid() or auth.uid() in (select user_id from public.admins))
    )
  );

-- ============================================
-- 6. Funciones RPC
-- ============================================

-- Verificar si una cancha tiene suscripción activa
create or replace function public.has_active_subscription(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.venue_subscriptions
    where venue_id = p_venue_id
      and status = 'active'
      and expires_at > now()
  );
$$;

-- Obtener suscripción activa de una cancha
create or replace function public.get_active_subscription(p_venue_id uuid)
returns table (
  id uuid,
  plan text,
  started_at timestamptz,
  expires_at timestamptz,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select vs.id, vs.plan, vs.started_at, vs.expires_at, vs.status
  from public.venue_subscriptions vs
  where vs.venue_id = p_venue_id
    and vs.status = 'active'
    and vs.expires_at > now()
  order by vs.expires_at desc
  limit 1;
$$;

-- Crear suscripción (solo admins)
create or replace function public.create_venue_subscription(
  p_venue_id uuid,
  p_plan text,
  p_duration_days integer default 30,
  p_payment_method text default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription_id uuid;
begin
  -- Verificar que el usuario sea admin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'Solo administradores pueden crear suscripciones';
  end if;

  -- Verificar que la cancha exista
  if not exists (select 1 from public.venues where id = p_venue_id) then
    raise exception 'Cancha no encontrada';
  end if;

  -- Crear suscripción
  insert into public.venue_subscriptions (
    venue_id,
    plan,
    started_at,
    expires_at,
    payment_method,
    status
  )
  values (
    p_venue_id,
    p_plan,
    now(),
    now() + (p_duration_days || ' days')::interval,
    p_payment_method,
    'active'
  )
  returning id into v_subscription_id;

  -- Marcar cancha como verificada
  update public.venues
  set is_verified = true
  where id = p_venue_id;

  return v_subscription_id;
end;
$$;

-- Reclamar cancha (dueño solicita ownership)
create or replace function public.claim_venue(
  p_venue_id uuid,
  p_whatsapp text default null,
  p_email text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verificar que la cancha exista
  if not exists (select 1 from public.venues where id = p_venue_id) then
    raise exception 'Cancha no encontrada';
  end if;

  -- Actualizar datos del dueño (venues no tiene updated_at)
  update public.venues
  set
    owner_id = auth.uid(),
    contact_whatsapp = nullif(btrim(coalesce(p_whatsapp, '')), ''),
    contact_email = nullif(btrim(lower(coalesce(p_email, ''))), '')
  where id = p_venue_id;

  return true;
end;
$$;

-- Obtener estadísticas de una cancha
create or replace function public.get_venue_stats(
  p_venue_id uuid,
  p_month_start date default null,
  p_month_end date default null
)
returns table (
  total_matches integer,
  total_slots integer,
  filled_slots integer,
  occupancy_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  -- Si no se proporcionan fechas, usar mes actual
  if p_month_start is null then
    v_start := date_trunc('month', now());
  else
    v_start := p_month_start::timestamptz;
  end if;

  if p_month_end is null then
    v_end := v_start + interval '1 month';
  else
    v_end := p_month_end::timestamptz;
  end if;

  return query
  select
    count(distinct m.id)::integer as total_matches,
    count(ms.id)::integer as total_slots,
    count(ms.id) filter (where sc.status = 'accepted')::integer as filled_slots,
    case
      when count(ms.id) = 0 then 0
      else round(
        count(ms.id) filter (where sc.status = 'accepted')::numeric / count(ms.id)::numeric * 100,
        2
      )
    end as occupancy_rate
  from public.matches m
  left join public.match_slots ms on ms.match_id = m.id
  left join public.slot_claims sc on sc.slot_id = ms.id
  where m.venue_id = p_venue_id
    and m.starts_at >= v_start
    and m.starts_at < v_end
    and m.status = 'open';
end;
$$;

-- ============================================
-- 7. Grants
-- ============================================
grant execute on function public.has_active_subscription(uuid) to authenticated, anon;
grant execute on function public.get_active_subscription(uuid) to authenticated, anon;
grant execute on function public.create_venue_subscription(uuid, text, integer, text) to authenticated;
grant execute on function public.claim_venue(uuid, text, text) to authenticated;
grant execute on function public.get_venue_stats(uuid, date, date) to authenticated;
