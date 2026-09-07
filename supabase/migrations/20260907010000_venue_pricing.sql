-- Sistema de pricing dinámico para canchas.
-- Permite al dueño configurar:
--   - Franjas horarias con precio por (cancha, deporte, día)
--   - Duración mínima por (cancha, deporte)
--   - Precio fallback por día cuando no hay franja
--   - Promociones (override de precio o descuento %)
-- Al crear un partido: se calcula el precio según franjas + promos, se snapshotea en matches_pricing_snapshot

-- ============================================
-- 1. venue_price_slots: franjas horarias
-- ============================================
create table if not exists public.venue_price_slots (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  sport text not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  price_cop int not null check (price_cop > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, sport, day_of_week, start_time)
);

create index if not exists venue_price_slots_venue_sport_idx on public.venue_price_slots (venue_id, sport);
create index if not exists venue_price_slots_day_idx on public.venue_price_slots (venue_id, sport, day_of_week);

comment on table public.venue_price_slots is 'Franjas horarias con precio por (cancha, deporte, día). No debe haber solapamiento.';

-- ============================================
-- 2. venue_pricing_min: duración mínima por (cancha, deporte)
-- ============================================
create table if not exists public.venue_pricing_min (
  venue_id uuid not null,
  sport text not null,
  min_minutes int not null check (min_minutes > 0),
  primary key (venue_id, sport)
);

comment on table public.venue_pricing_min is 'Duración mínima en minutos por (cancha, deporte). Default 60.';

-- ============================================
-- 3. venue_pricing_default: fallback del día
-- ============================================
create table if not exists public.venue_pricing_default (
  venue_id uuid not null,
  sport text not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  default_price_cop int not null check (default_price_cop > 0),
  primary key (venue_id, sport, day_of_week)
);

comment on table public.venue_pricing_default is 'Precio fallback por día cuando no hay franja que cubra la hora.';

-- ============================================
-- 4. venue_promotions: promociones
-- ============================================
create table if not exists public.venue_promotions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  sport text not null,
  name text not null,
  kind text not null check (kind in ('override_slot', 'discount_pct')),
  override_price_cop int check (override_price_cop is null or override_price_cop > 0),
  discount_pct int check (discount_pct is null or (discount_pct > 0 and discount_pct <= 100)),
  start_time time,
  end_time time check (end_time is null or end_time > start_time),
  days_of_week int[],
  date_start date,
  date_end date check (date_end is null or date_end >= date_start),
  lead_time_minutes int not null default 120 check (lead_time_minutes >= 0),
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists venue_promotions_venue_sport_idx on public.venue_promotions (venue_id, sport);
create index if not exists venue_promotions_active_idx on public.venue_promotions (venue_id, sport, active) where active = true;

comment on table public.venue_promotions is 'Promociones: override_slot (precio fijo en ventana) o discount_pct (% descuento). Se aplican automáticamente al crear partido si están activas.';

-- ============================================
-- 5. matches_pricing_snapshot: precio congelado al crear
-- ============================================
create table if not exists public.matches_pricing_snapshot (
  match_id uuid primary key references public.matches(id) on delete cascade,
  base_cop int not null,
  discount_cop int not null default 0,
  final_cop int not null,
  promo_id uuid references public.venue_promotions(id) on delete set null,
  overridden_by_owner boolean not null default false,
  snapshotted_at timestamptz not null default now()
);

comment on table public.matches_pricing_snapshot is 'Precio congelado al crear el partido. No se actualiza después.';

-- ============================================
-- 6. Trigger: no solapamiento de franjas
-- ============================================
create or replace function private.check_price_slot_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.venue_price_slots
    where venue_id = new.venue_id
      and sport = new.sport
      and day_of_week = new.day_of_week
      and id <> new.id
      and start_time < new.end_time
      and end_time > new.start_time
  ) then
    raise exception 'La franja se solapa con otra existente en el mismo día.';
  end if;
  return new;
end;
$$;

drop trigger if exists venue_price_slots_overlap on public.venue_price_slots;
create trigger venue_price_slots_overlap
  before insert or update on public.venue_price_slots
  for each row execute function private.check_price_slot_overlap();

-- ============================================
-- 7. RLS
-- ============================================
alter table public.venue_price_slots enable row level security;
alter table public.venue_pricing_min enable row level security;
alter table public.venue_pricing_default enable row level security;
alter table public.venue_promotions enable row level security;
alter table public.matches_pricing_snapshot enable row level security;

-- venue_price_slots: todos leen; dueño/admin escriben
create policy venue_price_slots_select on public.venue_price_slots
  for select to authenticated, anon
  using (true);

create policy venue_price_slots_insert on public.venue_price_slots
  for insert to authenticated
  with check (
    exists (
      select 1 from public.venues v
      where v.id = venue_price_slots.venue_id
        and (v.owner_id = (select auth.uid()) or (select auth.uid()) in (select user_id from public.admins))
    )
  );

create policy venue_price_slots_update on public.venue_price_slots
  for update to authenticated
  using (
    exists (
      select 1 from public.venues v
      where v.id = venue_price_slots.venue_id
        and (v.owner_id = (select auth.uid()) or (select auth.uid()) in (select user_id from public.admins))
    )
  );

create policy venue_price_slots_delete on public.venue_price_slots
  for delete to authenticated
  using (
    exists (
      select 1 from public.venues v
      where v.id = venue_price_slots.venue_id
        and (v.owner_id = (select auth.uid()) or (select auth.uid()) in (select user_id from public.admins))
    )
  );

-- venue_pricing_min: mismo patrón
create policy venue_pricing_min_select on public.venue_pricing_min
  for select to authenticated, anon
  using (true);

create policy venue_pricing_min_insert on public.venue_pricing_min
  for insert to authenticated
  with check (
    exists (
      select 1 from public.venues v
      where v.id = venue_pricing_min.venue_id
        and (v.owner_id = (select auth.uid()) or (select auth.uid()) in (select user_id from public.admins))
    )
  );

create policy venue_pricing_min_update on public.venue_pricing_min
  for update to authenticated
  using (
    exists (
      select 1 from public.venues v
      where v.id = venue_pricing_min.venue_id
        and (v.owner_id = (select auth.uid()) or (select auth.uid()) in (select user_id from public.admins))
    )
  );

create policy venue_pricing_min_delete on public.venue_pricing_min
  for delete to authenticated
  using (
    exists (
      select 1 from public.venues v
      where v.id = venue_pricing_min.venue_id
        and (v.owner_id = (select auth.uid()) or (select auth.uid()) in (select user_id from public.admins))
    )
  );

-- venue_pricing_default: mismo patrón
create policy venue_pricing_default_select on public.venue_pricing_default
  for select to authenticated, anon
  using (true);

create policy venue_pricing_default_insert on public.venue_pricing_default
  for insert to authenticated
  with check (
    exists (
      select 1 from public.venues v
      where v.id = venue_pricing_default.venue_id
        and (v.owner_id = (select auth.uid()) or (select auth.uid()) in (select user_id from public.admins))
    )
  );

create policy venue_pricing_default_update on public.venue_pricing_default
  for update to authenticated
  using (
    exists (
      select 1 from public.venues v
      where v.id = venue_pricing_default.venue_id
        and (v.owner_id = (select auth.uid()) or (select auth.uid()) in (select user_id from public.admins))
    )
  );

create policy venue_pricing_default_delete on public.venue_pricing_default
  for delete to authenticated
  using (
    exists (
      select 1 from public.venues v
      where v.id = venue_pricing_default.venue_id
        and (v.owner_id = (select auth.uid()) or (select auth.uid()) in (select user_id from public.admins))
    )
  );

-- venue_promotions: mismo patrón
create policy venue_promotions_select on public.venue_promotions
  for select to authenticated, anon
  using (true);

create policy venue_promotions_insert on public.venue_promotions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.venues v
      where v.id = venue_promotions.venue_id
        and (v.owner_id = (select auth.uid()) or (select auth.uid()) in (select user_id from public.admins))
    )
  );

create policy venue_promotions_update on public.venue_promotions
  for update to authenticated
  using (
    exists (
      select 1 from public.venues v
      where v.id = venue_promotions.venue_id
        and (v.owner_id = (select auth.uid()) or (select auth.uid()) in (select user_id from public.admins))
    )
  );

create policy venue_promotions_delete on public.venue_promotions
  for delete to authenticated
  using (
    exists (
      select 1 from public.venues v
      where v.id = venue_promotions.venue_id
        and (v.owner_id = (select auth.uid()) or (select auth.uid()) in (select user_id from public.admins))
    )
  );

-- matches_pricing_snapshot: todos leen; nadie escribe directo (solo vía RPC)
create policy matches_pricing_snapshot_select on public.matches_pricing_snapshot
  for select to authenticated, anon
  using (true);

revoke insert, update, delete on public.matches_pricing_snapshot from anon, authenticated;

-- ============================================
-- 8. RPCs
-- ============================================

-- create_price_slot
create or replace function public.create_price_slot(
  p_venue_id uuid,
  p_sport text,
  p_day_of_week int,
  p_start_time time,
  p_end_time time,
  p_price_cop int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if not exists (
    select 1 from public.venues v
    where v.id = p_venue_id
      and (v.owner_id = v_uid or v_uid in (select user_id from public.admins))
  ) then
    raise exception 'Solo el dueño o un admin pueden crear franjas.';
  end if;

  if p_start_time >= p_end_time then
    raise exception 'La hora de inicio debe ser anterior a la de fin.';
  end if;

  if p_price_cop <= 0 then
    raise exception 'El precio debe ser mayor a cero.';
  end if;

  insert into public.venue_price_slots (venue_id, sport, day_of_week, start_time, end_time, price_cop)
  values (p_venue_id, p_sport, p_day_of_week, p_start_time, p_end_time, p_price_cop)
  returning id into v_id;

  return v_id;
end;
$$;

-- delete_price_slot
create or replace function public.delete_price_slot(p_slot_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if not exists (
    select 1 from public.venue_price_slots s
    join public.venues v on v.id = s.venue_id
    where s.id = p_slot_id
      and (v.owner_id = v_uid or v_uid in (select user_id from public.admins))
  ) then
    raise exception 'Solo el dueño o un admin pueden eliminar franjas.';
  end if;

  delete from public.venue_price_slots where id = p_slot_id;
end;
$$;

-- update_price_slot
create or replace function public.update_price_slot(
  p_slot_id uuid,
  p_start_time time,
  p_end_time time,
  p_price_cop int
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
    raise exception 'No autenticado';
  end if;

  if not exists (
    select 1 from public.venue_price_slots s
    join public.venues v on v.id = s.venue_id
    where s.id = p_slot_id
      and (v.owner_id = v_uid or v_uid in (select user_id from public.admins))
  ) then
    raise exception 'Solo el dueño o un admin pueden actualizar franjas.';
  end if;

  if p_start_time >= p_end_time then
    raise exception 'La hora de inicio debe ser anterior a la de fin.';
  end if;

  if p_price_cop <= 0 then
    raise exception 'El precio debe ser mayor a cero.';
  end if;

  update public.venue_price_slots
  set start_time = p_start_time, end_time = p_end_time, price_cop = p_price_cop, updated_at = now()
  where id = p_slot_id;
end;
$$;

-- set_price_min
create or replace function public.set_price_min(
  p_venue_id uuid,
  p_sport text,
  p_min_minutes int
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
    raise exception 'No autenticado';
  end if;

  if not exists (
    select 1 from public.venues v
    where v.id = p_venue_id
      and (v.owner_id = v_uid or v_uid in (select user_id from public.admins))
  ) then
    raise exception 'Solo el dueño o un admin pueden configurar la duración mínima.';
  end if;

  if p_min_minutes <= 0 then
    raise exception 'La duración mínima debe ser mayor a cero.';
  end if;

  insert into public.venue_pricing_min (venue_id, sport, min_minutes)
  values (p_venue_id, p_sport, p_min_minutes)
  on conflict (venue_id, sport) do update
  set min_minutes = excluded.min_minutes;
end;
$$;

-- delete_price_min
create or replace function public.delete_price_min(p_venue_id uuid, p_sport text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if not exists (
    select 1 from public.venues v
    where v.id = p_venue_id
      and (v.owner_id = v_uid or v_uid in (select user_id from public.admins))
  ) then
    raise exception 'Solo el dueño o un admin pueden eliminar la duración mínima.';
  end if;

  delete from public.venue_pricing_min where venue_id = p_venue_id and sport = p_sport;
end;
$$;

-- set_price_default
create or replace function public.set_price_default(
  p_venue_id uuid,
  p_sport text,
  p_day_of_week int,
  p_default_price_cop int
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
    raise exception 'No autenticado';
  end if;

  if not exists (
    select 1 from public.venues v
    where v.id = p_venue_id
      and (v.owner_id = v_uid or v_uid in (select user_id from public.admins))
  ) then
    raise exception 'Solo el dueño o un admin pueden configurar el precio fallback.';
  end if;

  if p_default_price_cop <= 0 then
    raise exception 'El precio fallback debe ser mayor a cero.';
  end if;

  insert into public.venue_pricing_default (venue_id, sport, day_of_week, default_price_cop)
  values (p_venue_id, p_sport, p_day_of_week, p_default_price_cop)
  on conflict (venue_id, sport, day_of_week) do update
  set default_price_cop = excluded.default_price_cop;
end;
$$;

-- delete_price_default
create or replace function public.delete_price_default(p_venue_id uuid, p_sport text, p_day_of_week int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if not exists (
    select 1 from public.venues v
    where v.id = p_venue_id
      and (v.owner_id = v_uid or v_uid in (select user_id from public.admins))
  ) then
    raise exception 'Solo el dueño o un admin pueden eliminar el precio fallback.';
  end if;

  delete from public.venue_pricing_default where venue_id = p_venue_id and sport = p_sport and day_of_week = p_day_of_week;
end;
$$;

-- create_promotion
create or replace function public.create_promotion(
  p_venue_id uuid,
  p_sport text,
  p_name text,
  p_kind text,
  p_override_price_cop int default null,
  p_discount_pct int default null,
  p_start_time time default null,
  p_end_time time default null,
  p_days_of_week int[] default null,
  p_date_start date default null,
  p_date_end date default null,
  p_lead_time_minutes int default 120
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if not exists (
    select 1 from public.venues v
    where v.id = p_venue_id
      and (v.owner_id = v_uid or v_uid in (select user_id from public.admins))
  ) then
    raise exception 'Solo el dueño o un admin pueden crear promociones.';
  end if;

  if p_kind not in ('override_slot', 'discount_pct') then
    raise exception 'Tipo de promoción no válido.';
  end if;

  if p_kind = 'override_slot' and p_override_price_cop is null then
    raise exception 'Las promociones de override requieren override_price_cop.';
  end if;

  if p_kind = 'discount_pct' and p_discount_pct is null then
    raise exception 'Las promociones de descuento requieren discount_pct.';
  end if;

  if p_start_time is not null and p_end_time is not null and p_start_time >= p_end_time then
    raise exception 'La hora de inicio debe ser anterior a la de fin.';
  end if;

  if p_date_start is not null and p_date_end is not null and p_date_end < p_date_start then
    raise exception 'La fecha de fin debe ser posterior o igual a la de inicio.';
  end if;

  if p_lead_time_minutes < 0 then
    raise exception 'El tiempo de anticipación no puede ser negativo.';
  end if;

  insert into public.venue_promotions (
    venue_id, sport, name, kind, override_price_cop, discount_pct,
    start_time, end_time, days_of_week, date_start, date_end,
    lead_time_minutes, created_by
  )
  values (
    p_venue_id, p_sport, p_name, p_kind, p_override_price_cop, p_discount_pct,
    p_start_time, p_end_time, p_days_of_week, p_date_start, p_date_end,
    p_lead_time_minutes, v_uid
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- deactivate_promotion
create or replace function public.deactivate_promotion(p_promo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if not exists (
    select 1 from public.venue_promotions p
    join public.venues v on v.id = p.venue_id
    where p.id = p_promo_id
      and (v.owner_id = v_uid or v_uid in (select user_id from public.admins))
  ) then
    raise exception 'Solo el dueño o un admin pueden desactivar promociones.';
  end if;

  update public.venue_promotions
  set active = false, updated_at = now()
  where id = p_promo_id;
end;
$$;

-- preview_match_price: calcula sin guardar
create or replace function public.preview_match_price(
  p_venue_id uuid,
  p_sport text,
  p_starts_at timestamptz,
  p_duration_min int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day_of_week int;
  v_start_time time;
  v_end_time time;
  v_min_minutes int;
  v_billed_min int;
  v_base_cop int := 0;
  v_discount_cop int := 0;
  v_final_cop int;
  v_promo_id uuid;
  v_errors text[] := '{}';
  v_slots record;
  v_remaining_min int;
  v_segment_min int;
  v_segment_price_cop int;
  v_promo record;
begin
  v_day_of_week := extract(dow from p_starts_at)::int;
  v_start_time := p_starts_at::time;
  v_end_time := (p_starts_at + (p_duration_min || ' minutes')::interval)::time;

  -- Duración mínima
  select min_minutes into v_min_minutes
  from public.venue_pricing_min
  where venue_id = p_venue_id and sport = p_sport;

  if v_min_minutes is null then
    v_min_minutes := 60;
  end if;

  v_billed_min := floor(p_duration_min / v_min_minutes) * v_min_minutes;

  if v_billed_min = 0 then
    v_errors := v_errors || format('La duración (%s min) es menor que la mínima (%s min).', p_duration_min, v_min_minutes);
  end if;

  -- Calcular precio base por franjas
  v_remaining_min := v_billed_min;
  while v_remaining_min > 0 loop
    select id, start_time, end_time, price_cop into v_slots
    from public.venue_price_slots
    where venue_id = p_venue_id
      and sport = p_sport
      and day_of_week = v_day_of_week
      and start_time <= v_start_time
      and end_time > v_start_time
    order by start_time
    limit 1;

    if v_slots is null then
      -- Fallback del día
      select default_price_cop into v_segment_price_cop
      from public.venue_pricing_default
      where venue_id = p_venue_id and sport = p_sport and day_of_week = v_day_of_week;

      if v_segment_price_cop is null then
        v_errors := v_errors || format('No hay franja ni fallback para %s a las %s.', v_day_of_week, v_start_time);
        exit;
      end if;

      -- Precio por minuto del fallback
      v_segment_price_cop := v_segment_price_cop / 60;
    else
      -- Precio por minuto de la franja
      v_segment_price_cop := v_slots.price_cop / extract(epoch from (v_slots.end_time - v_slots.start_time))::int / 60;
      v_segment_min := least(v_remaining_min, extract(epoch from (v_slots.end_time - v_start_time))::int / 60);
      v_base_cop := v_base_cop + (v_segment_min * v_segment_price_cop);
      v_start_time := v_start_time + (v_segment_min || ' minutes')::interval;
      v_remaining_min := v_remaining_min - v_segment_min;
      continue;
    end if;

    -- Fallback: cobrar todo el remaining
    v_base_cop := v_base_cop + (v_remaining_min * v_segment_price_cop);
    v_remaining_min := 0;
  end loop;

  -- Buscar promos aplicables
  select id, kind, override_price_cop, discount_pct into v_promo
  from public.venue_promotions
  where venue_id = p_venue_id
    and sport = p_sport
    and active = true
    and (start_time is null or start_time <= v_start_time)
    and (end_time is null or end_time > v_start_time)
    and (days_of_week is null or v_day_of_week = any(days_of_week))
    and (date_start is null or p_starts_at::date >= date_start)
    and (date_end is null or p_starts_at::date <= date_end)
  order by kind desc
  limit 1;

  if v_promo is not null then
    v_promo_id := v_promo.id;
    if v_promo.kind = 'override_slot' then
      v_base_cop := v_promo.override_price_cop;
      v_discount_cop := 0;
    elsif v_promo.kind = 'discount_pct' then
      v_discount_cop := (v_base_cop * v_promo.discount_pct) / 100;
    end if;
  end if;

  v_final_cop := v_base_cop - v_discount_cop;

  return jsonb_build_object(
    'base_cop', v_base_cop,
    'discount_cop', v_discount_cop,
    'final_cop', v_final_cop,
    'promo_id', v_promo_id,
    'duration_min', p_duration_min,
    'billed_min', v_billed_min,
    'min_minutes', v_min_minutes,
    'errors', v_errors
  );
end;
$$;

-- apply_match_pricing: invocado al crear partido
create or replace function public.apply_match_pricing(
  p_match_id uuid,
  p_overridden_price_cop int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_venue_id uuid;
  v_sport text;
  v_starts_at timestamptz;
  v_duration_min int;
  v_result jsonb;
  v_errors text[];
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select venue_id, sport, starts_at, duration_min into v_venue_id, v_sport, v_starts_at, v_duration_min
  from public.matches
  where id = p_match_id;

  if not found then
    raise exception 'Partido no encontrado.';
  end if;

  -- Verificar que el usuario sea el dueño o admin
  if not exists (
    select 1 from public.venues v
    where v.id = v_venue_id
      and (v.owner_id = v_uid or v_uid in (select user_id from public.admins))
  ) then
    raise exception 'Solo el dueño o un admin pueden aplicar pricing.';
  end if;

  -- Si hay override, usar ese precio
  if p_overridden_price_cop is not null then
    insert into public.matches_pricing_snapshot (match_id, base_cop, discount_cop, final_cop, overridden_by_owner)
    values (p_match_id, p_overridden_price_cop, 0, p_overridden_price_cop, true);
    return;
  end if;

  -- Calcular precio
  v_result := public.preview_match_price(v_venue_id, v_sport, v_starts_at, v_duration_min);
  v_errors := (v_result->>'errors')::text[];

  if array_length(v_errors, 1) > 0 then
    raise exception 'Errores de pricing: %', array_to_string(v_errors, '; ');
  end if;

  insert into public.matches_pricing_snapshot (match_id, base_cop, discount_cop, final_cop, promo_id)
  values (
    p_match_id,
    (v_result->>'base_cop')::int,
    (v_result->>'discount_cop')::int,
    (v_result->>'final_cop')::int,
    (v_result->>'promo_id')::uuid
  );
end;
$$;

-- ============================================
-- 9. Grants
-- ============================================
revoke all on function public.create_price_slot from public, anon;
revoke all on function public.delete_price_slot from public, anon;
revoke all on function public.set_price_min from public, anon;
revoke all on function public.delete_price_min from public, anon;
revoke all on function public.set_price_default from public, anon;
revoke all on function public.delete_price_default from public, anon;
revoke all on function public.create_promotion from public, anon;
revoke all on function public.deactivate_promotion from public, anon;
revoke all on function public.preview_match_price from public, anon;
revoke all on function public.apply_match_pricing from public, anon;

grant execute on function public.create_price_slot to authenticated;
grant execute on function public.delete_price_slot to authenticated;
grant execute on function public.set_price_min to authenticated;
grant execute on function public.delete_price_min to authenticated;
grant execute on function public.set_price_default to authenticated;
grant execute on function public.delete_price_default to authenticated;
grant execute on function public.create_promotion to authenticated;
grant execute on function public.deactivate_promotion to authenticated;
grant execute on function public.preview_match_price to authenticated;
grant execute on function public.apply_match_pricing to authenticated;
