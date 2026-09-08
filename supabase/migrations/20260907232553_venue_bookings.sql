-- Pedir turno (alquiler de horario): schema + locks + RPCs + storage + flags + occupancy.
-- Opt-in por cancha (booking_enabled) + kill-switch global feature_flags.venue_booking=false.
-- Ocupación unificada match|booking vía advisory xact lock + private.assert_venue_slot_free.

create extension if not exists btree_gist with schema extensions;

set search_path = public, extensions;

-- =============================================================================
-- 1. venues.booking_enabled
-- =============================================================================
alter table public.venues
  add column if not exists booking_enabled boolean not null default false;

comment on column public.venues.booking_enabled is
  'Opt-in dueño: aceptar pedidos de turno. Requiere también feature_flags.venue_booking.';

-- =============================================================================
-- 2. venue_bookings
-- =============================================================================
create table if not exists public.venue_bookings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  sport text not null,
  starts_at timestamptz not null,
  duration_min integer not null,
  occupy_range tstzrange not null,
  status text not null default 'pending',
  payment_method text not null,
  proof_path text not null,
  base_cop integer not null,
  discount_cop integer not null default 0,
  final_cop integer not null,
  promo_id uuid references public.venue_promotions(id) on delete set null,
  billed_min integer not null,
  currency text not null default 'COP',
  contact_whatsapp text not null,
  legal_accepted_at timestamptz not null,
  note text,
  hold_expires_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_bookings_sport_check
    check (sport in ('futbol', 'futbol_sala', 'basquet', 'voleibol', 'padel')),
  constraint venue_bookings_duration_check
    check (duration_min in (30, 60, 90)),
  constraint venue_bookings_status_check
    check (status in ('pending', 'confirmed', 'rejected', 'cancelled', 'expired')),
  constraint venue_bookings_payment_method_check
    check (payment_method in ('nequi', 'bank_transfer')),
  constraint venue_bookings_whatsapp_check
    check (contact_whatsapp ~ '^573[0-9]{9}$'),
  constraint venue_bookings_note_len_check
    check (note is null or char_length(note) <= 300),
  constraint venue_bookings_reject_reason_len_check
    check (reject_reason is null or char_length(reject_reason) <= 300),
  constraint venue_bookings_proof_path_len_check
    check (char_length(proof_path) between 8 and 400),
  constraint venue_bookings_money_check
    check (
      base_cop >= 0
      and discount_cop >= 0
      and final_cop >= 0
      and billed_min > 0
    ),
  constraint venue_bookings_hold_pending_check
    check (
      (status = 'pending' and hold_expires_at is not null)
      or (status <> 'pending')
    )
);

create unique index if not exists venue_bookings_one_pending_per_player_venue_idx
  on public.venue_bookings (player_id, venue_id)
  where status = 'pending';

create index if not exists venue_bookings_venue_status_starts_idx
  on public.venue_bookings (venue_id, status, starts_at);

create index if not exists venue_bookings_player_idx
  on public.venue_bookings (player_id, created_at desc);

create index if not exists venue_bookings_hold_expires_idx
  on public.venue_bookings (hold_expires_at)
  where status = 'pending';

alter table public.venue_bookings drop constraint if exists venue_bookings_venue_occupy_excl;
alter table public.venue_bookings
  add constraint venue_bookings_venue_occupy_excl
  exclude using gist (
    venue_id with =,
    occupy_range with &&
  )
  where (status in ('pending', 'confirmed'));

create or replace function private.sync_venue_booking_occupy_range()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.occupy_range := tstzrange(
    new.starts_at,
    new.starts_at + make_interval(mins => new.duration_min),
    '[)'
  );
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists venue_bookings_sync_occupy_range on public.venue_bookings;
create trigger venue_bookings_sync_occupy_range
  before insert or update of starts_at, duration_min, occupy_range
  on public.venue_bookings
  for each row execute function private.sync_venue_booking_occupy_range();

-- =============================================================================
-- 3. venue_booking_events (append-only vía RPC)
-- =============================================================================
create table if not exists public.venue_booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.venue_bookings(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint venue_booking_events_to_status_check
    check (to_status in ('pending', 'confirmed', 'rejected', 'cancelled', 'expired'))
);

create index if not exists venue_booking_events_booking_idx
  on public.venue_booking_events (booking_id, created_at);

create or replace function private.log_venue_booking_event(
  p_booking_id uuid,
  p_from_status text,
  p_to_status text,
  p_actor_id uuid,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.venue_booking_events (booking_id, from_status, to_status, actor_id, meta)
  values (
    p_booking_id,
    p_from_status,
    p_to_status,
    p_actor_id,
    coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

-- =============================================================================
-- 4. RLS bookings / events
-- =============================================================================
alter table public.venue_bookings enable row level security;
alter table public.venue_booking_events enable row level security;

drop policy if exists venue_bookings_select on public.venue_bookings;
create policy venue_bookings_select on public.venue_bookings
  for select to authenticated
  using (
    player_id = (select auth.uid())
    or public.is_admin()
    or exists (
      select 1 from public.venues v
      where v.id = venue_bookings.venue_id
        and v.owner_id = (select auth.uid())
    )
  );

drop policy if exists venue_booking_events_select on public.venue_booking_events;
create policy venue_booking_events_select on public.venue_booking_events
  for select to authenticated
  using (
    exists (
      select 1 from public.venue_bookings b
      where b.id = venue_booking_events.booking_id
        and (
          b.player_id = (select auth.uid())
          or public.is_admin()
          or exists (
            select 1 from public.venues v
            where v.id = b.venue_id
              and v.owner_id = (select auth.uid())
          )
        )
    )
  );

revoke insert, update, delete on public.venue_bookings from anon, authenticated;
revoke insert, update, delete on public.venue_booking_events from anon, authenticated;
grant select on public.venue_bookings to authenticated;
grant select on public.venue_booking_events to authenticated;

-- =============================================================================
-- 5. Storage: venue-booking-proofs
--    Ruta: {venue_id}/{user_id}/{uuid}.ext
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'venue-booking-proofs',
  'venue-booking-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists venue_booking_proofs_select on storage.objects;
create policy venue_booking_proofs_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'venue-booking-proofs'
    and (
      public.is_admin()
      or (storage.foldername(name))[2] = (select auth.uid())::text
      or exists (
        select 1 from public.venues v
        where v.id::text = (storage.foldername(name))[1]
          and v.owner_id = (select auth.uid())
      )
    )
  );

drop policy if exists venue_booking_proofs_insert on storage.objects;
create policy venue_booking_proofs_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'venue-booking-proofs'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1 from public.venues v
      where v.id::text = (storage.foldername(name))[1]
        and v.deleted_at is null
    )
  );

drop policy if exists venue_booking_proofs_update on storage.objects;
create policy venue_booking_proofs_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'venue-booking-proofs'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'venue-booking-proofs'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists venue_booking_proofs_delete on storage.objects;
create policy venue_booking_proofs_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'venue-booking-proofs'
    and (
      public.is_admin()
      or (storage.foldername(name))[2] = (select auth.uid())::text
    )
  );

-- =============================================================================
-- 6. Feature flag (default off)
-- =============================================================================
insert into public.feature_flags (key, enabled, description)
values (
  'venue_booking',
  false,
  'Pedir turno / alquilar horario (kill-switch global; también requiere venues.booking_enabled)'
)
on conflict (key) do nothing;

-- =============================================================================
-- 7. assert + lock helpers
-- =============================================================================
create or replace function private.lock_venue_slot(p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_venue_id is null then
    raise exception 'Cancha inválida.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_venue_id::text, 0));
end;
$$;

create or replace function private.assert_venue_slot_free(
  p_venue_id uuid,
  p_range tstzrange,
  p_ignore_booking_id uuid default null,
  p_ignore_match_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share text;
begin
  if p_venue_id is null or p_range is null or isempty(p_range) then
    raise exception 'Franja inválida.';
  end if;

  select m.share_code into v_share
  from public.matches m
  where m.venue_id = p_venue_id
    and m.status = 'open'
    and (p_ignore_match_id is null or m.id is distinct from p_ignore_match_id)
    and m.occupy_range && p_range
  order by m.starts_at, m.id
  limit 1;

  if v_share is not null then
    raise exception 'OCCUPANCY:%', v_share;
  end if;

  if exists (
    select 1
    from public.venue_bookings b
    where b.venue_id = p_venue_id
      and b.status in ('pending', 'confirmed')
      and (p_ignore_booking_id is null or b.id is distinct from p_ignore_booking_id)
      and b.occupy_range && p_range
  ) then
    raise exception 'Esa franja ya tiene un turno pedido o confirmado. Elegí otra hora.';
  end if;
end;
$$;

comment on function private.assert_venue_slot_free(uuid, tstzrange, uuid, uuid) is
  'Falla si hay match open o booking pending|confirmed solapado. Usar tras private.lock_venue_slot.';

-- Trigger: create/update match open → lock + assert (después de sync occupy_range)
create or replace function private.guard_match_venue_slot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_range tstzrange;
begin
  if new.status is distinct from 'open' then
    return new;
  end if;
  if new.venue_id is null or new.starts_at is null or new.duration_min is null then
    return new;
  end if;

  v_range := coalesce(
    new.occupy_range,
    tstzrange(
      new.starts_at,
      new.starts_at + make_interval(mins => new.duration_min),
      '[)'
    )
  );

  perform private.lock_venue_slot(new.venue_id);
  perform private.assert_venue_slot_free(new.venue_id, v_range, null, new.id);
  return new;
end;
$$;

drop trigger if exists matches_z_assert_venue_slot on public.matches;
create trigger matches_z_assert_venue_slot
  before insert or update of venue_id, starts_at, duration_min, status, occupy_range
  on public.matches
  for each row execute function private.guard_match_venue_slot();

-- =============================================================================
-- 8. Occupancy RPCs: kind match|booking (sin PII de booking)
-- =============================================================================
drop function if exists public.lookup_venue_occupancy(uuid, timestamptz, integer, uuid);
drop function if exists public.list_venue_day_occupancy(uuid, timestamptz, timestamptz, uuid);

create function public.lookup_venue_occupancy(
  p_venue_id uuid,
  p_starts_at timestamptz,
  p_duration_min integer,
  p_exclude_match_id uuid default null,
  p_exclude_booking_id uuid default null
)
returns table (
  kind text,
  match_id uuid,
  share_code text,
  host_id uuid,
  starts_at timestamptz,
  duration_min integer,
  venue_id uuid,
  venue_name text,
  away_opened_by uuid,
  open_slot_count integer,
  has_side_b boolean,
  sport text,
  format text
)
language sql
stable
security invoker
set search_path = public
as $$
  (
    select
      'match'::text as kind,
      m.id as match_id,
      m.share_code,
      m.host_id,
      m.starts_at,
      m.duration_min,
      m.venue_id,
      v.name as venue_name,
      m.away_opened_by,
      (
        select count(*)::int
        from public.match_slots s
        where s.match_id = m.id
          and not exists (
            select 1 from public.slot_claims c
            where c.slot_id = s.id and c.status = 'accepted'
          )
      ) as open_slot_count,
      (m.away_opened_by is not null) as has_side_b,
      m.sport,
      m.format
    from public.matches m
    join public.venues v on v.id = m.venue_id
    where m.venue_id = p_venue_id
      and m.status = 'open'
      and (p_exclude_match_id is null or m.id <> p_exclude_match_id)
      and p_starts_at is not null
      and p_duration_min in (30, 60, 90)
      and m.occupy_range && tstzrange(
        p_starts_at,
        p_starts_at + make_interval(mins => p_duration_min),
        '[)'
      )
    order by m.starts_at, m.id
    limit 1
  )
  union all
  (
    select
      'booking'::text as kind,
      b.id as match_id,
      null::text as share_code,
      null::uuid as host_id,
      b.starts_at,
      b.duration_min,
      b.venue_id,
      v.name as venue_name,
      null::uuid as away_opened_by,
      0 as open_slot_count,
      true as has_side_b,
      b.sport,
      null::text as format
    from public.venue_bookings b
    join public.venues v on v.id = b.venue_id
    where b.venue_id = p_venue_id
      and b.status in ('pending', 'confirmed')
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
      and p_starts_at is not null
      and p_duration_min in (30, 60, 90)
      and b.occupy_range && tstzrange(
        p_starts_at,
        p_starts_at + make_interval(mins => p_duration_min),
        '[)'
      )
      and not exists (
        select 1
        from public.matches m
        where m.venue_id = p_venue_id
          and m.status = 'open'
          and (p_exclude_match_id is null or m.id <> p_exclude_match_id)
          and m.occupy_range && tstzrange(
            p_starts_at,
            p_starts_at + make_interval(mins => p_duration_min),
            '[)'
          )
      )
    order by b.starts_at, b.id
    limit 1
  )
  limit 1;
$$;

comment on function public.lookup_venue_occupancy(uuid, timestamptz, integer, uuid, uuid) is
  'Primer bloqueo match|booking en la franja. Booking sin PII (sin player_id / proof).';

revoke all on function public.lookup_venue_occupancy(uuid, timestamptz, integer, uuid, uuid) from public;
grant execute on function public.lookup_venue_occupancy(uuid, timestamptz, integer, uuid, uuid) to anon, authenticated;

create function public.list_venue_day_occupancy(
  p_venue_id uuid,
  p_day_start timestamptz,
  p_day_end timestamptz,
  p_exclude_match_id uuid default null,
  p_exclude_booking_id uuid default null
)
returns table (
  kind text,
  match_id uuid,
  share_code text,
  starts_at timestamptz,
  duration_min integer,
  sport text,
  format text,
  open_slot_count integer,
  has_side_b boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select * from (
    select
      'match'::text as kind,
      m.id as match_id,
      m.share_code,
      m.starts_at,
      m.duration_min,
      m.sport,
      m.format,
      (
        select count(*)::int
        from public.match_slots s
        where s.match_id = m.id
          and not exists (
            select 1 from public.slot_claims c
            where c.slot_id = s.id and c.status = 'accepted'
          )
      ) as open_slot_count,
      (m.away_opened_by is not null) as has_side_b
    from public.matches m
    where m.venue_id = p_venue_id
      and m.status = 'open'
      and (p_exclude_match_id is null or m.id <> p_exclude_match_id)
      and p_day_start is not null
      and p_day_end is not null
      and p_day_end > p_day_start
      and m.starts_at >= p_day_start
      and m.starts_at < p_day_end

    union all

    select
      'booking'::text as kind,
      b.id as match_id,
      null::text as share_code,
      b.starts_at,
      b.duration_min,
      b.sport,
      null::text as format,
      0 as open_slot_count,
      true as has_side_b
    from public.venue_bookings b
    where b.venue_id = p_venue_id
      and b.status in ('pending', 'confirmed')
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
      and p_day_start is not null
      and p_day_end is not null
      and p_day_end > p_day_start
      and b.starts_at >= p_day_start
      and b.starts_at < p_day_end
  ) u
  order by u.starts_at, u.kind, u.match_id;
$$;

comment on function public.list_venue_day_occupancy(uuid, timestamptz, timestamptz, uuid, uuid) is
  'Bloques open (match) y pending|confirmed (booking) del día. Booking sin PII.';

revoke all on function public.list_venue_day_occupancy(uuid, timestamptz, timestamptz, uuid, uuid) from public;
grant execute on function public.list_venue_day_occupancy(uuid, timestamptz, timestamptz, uuid, uuid) to anon, authenticated;

-- =============================================================================
-- 9. update_match + create_match_from_template: lock + assert
-- =============================================================================
create or replace function public.update_match(
  p_match_id uuid,
  p_venue_id uuid,
  p_starts_at timestamptz,
  p_duration_min integer,
  p_sport text,
  p_format text,
  p_gender_policy text,
  p_cost_per_person integer,
  p_notes text,
  p_slots jsonb,
  p_formation_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_host uuid;
  v_status text;
  v_starts timestamptz;
  v_city uuid;
  v_sport text;
  v_venue_city uuid;
  v_venue_sports text[];
  v_n int;
  v_accepted int;
  v_i int;
  v_elem jsonb;
  v_slot_id uuid;
  v_pos text;
  v_level text;
  v_pitch int;
  v_keep uuid[] := '{}';
  v_id_text text;
  v_has_accepted boolean;
  v_range tstzrange;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if p_match_id is null or p_venue_id is null then
    raise exception 'Datos incompletos';
  end if;

  select host_id, status, starts_at, city_id, sport
    into v_host, v_status, v_starts, v_city, v_sport
  from public.matches
  where id = p_match_id
  for update;

  if v_host is null then
    raise exception 'El partido no existe';
  end if;
  if v_host is distinct from v_uid then
    raise exception 'Solo quien armó el partido puede editarlo';
  end if;
  if v_status is distinct from 'open' then
    raise exception 'Ese partido ya no se puede editar';
  end if;
  if v_starts <= now() then
    raise exception 'Ese partido ya empezó';
  end if;

  if p_starts_at is null or p_starts_at <= now() then
    raise exception 'Elige una hora que todavía no haya pasado.';
  end if;
  if p_duration_min not in (30, 60, 90) then
    raise exception 'La duración debe ser 30, 60 o 90 minutos.';
  end if;
  if p_sport is null or p_sport not in ('futbol', 'futbol_sala', 'basquet', 'voleibol', 'padel') then
    raise exception 'Elige un deporte válido.';
  end if;
  if not private.sport_allows_format(p_sport, p_format) then
    raise exception 'Ese formato no aplica para el deporte.';
  end if;
  if p_gender_policy is null or p_gender_policy not in ('mixed', 'men', 'women') then
    raise exception 'Elige quién juega.';
  end if;
  if p_cost_per_person is not null and p_cost_per_person < 0 then
    raise exception 'El precio no puede ser negativo.';
  end if;
  if p_notes is not null and char_length(p_notes) > 500 then
    raise exception 'La nota es demasiado larga (máx. 500 caracteres).';
  end if;
  if p_formation_id is not null and char_length(p_formation_id) > 80 then
    raise exception 'Formación no válida.';
  end if;

  select city_id, sports into v_venue_city, v_venue_sports
  from public.venues
  where id = p_venue_id;

  if v_venue_city is null or v_venue_city is distinct from v_city then
    raise exception 'Esa cancha no está en la ciudad del partido.';
  end if;
  if v_venue_sports is null or not (p_sport = any (v_venue_sports)) then
    raise exception 'Esa cancha no ofrece ese deporte.';
  end if;

  v_range := tstzrange(
    p_starts_at,
    p_starts_at + make_interval(mins => p_duration_min),
    '[)'
  );
  perform private.lock_venue_slot(p_venue_id);
  perform private.assert_venue_slot_free(p_venue_id, v_range, null, p_match_id);

  select count(*) into v_accepted
  from public.slot_claims c
  join public.match_slots s on s.id = c.slot_id
  where c.match_id = p_match_id and c.status = 'accepted' and s.side = 'a';

  if v_accepted > 0 and p_sport is distinct from v_sport then
    raise exception 'No se puede cambiar el deporte: ya hay cupos confirmados.';
  end if;

  if jsonb_typeof(p_slots) is distinct from 'array' then
    raise exception 'Los cupos deben ser un número entero entre 1 y 12.';
  end if;
  v_n := jsonb_array_length(p_slots);
  if v_n is null or v_n < 1 or v_n > 12 then
    raise exception 'Los cupos deben ser un número entero entre 1 y 12.';
  end if;
  if v_n < v_accepted then
    raise exception 'No podés bajar los cupos por debajo de los confirmados.';
  end if;

  perform 1 from public.match_slots where match_id = p_match_id for update;
  perform 1 from public.slot_claims where match_id = p_match_id for update;

  for v_i in 0 .. v_n - 1 loop
    v_elem := p_slots -> v_i;
    if jsonb_typeof(v_elem) is distinct from 'object' then
      raise exception 'Cupo inválido';
    end if;

    v_id_text := nullif(btrim(coalesce(v_elem->>'id', '')), '');
    v_slot_id := null;
    if v_id_text is not null then
      begin
        v_slot_id := v_id_text::uuid;
      exception when invalid_text_representation then
        raise exception 'Cupo inválido';
      end;
    end if;

    v_pos := coalesce(v_elem->>'position', 'any');
    v_level := coalesce(v_elem->>'level', 'any');
    if v_level not in ('any', 'low', 'mid', 'high') then
      raise exception 'Nivel no válido.';
    end if;
    if not private.sport_allows_position(p_sport, v_pos) then
      raise exception 'Esa posición no aplica para el deporte.';
    end if;

    if v_elem ? 'pitch_index' and v_elem->>'pitch_index' is not null and btrim(v_elem->>'pitch_index') <> '' then
      begin
        v_pitch := (v_elem->>'pitch_index')::integer;
      exception when others then
        raise exception 'Índice de cancha inválido';
      end;
      if v_pitch < 0 or v_pitch > 15 then
        raise exception 'Índice de cancha inválido';
      end if;
    end if;

    if v_slot_id is not null then
      if v_slot_id = any (v_keep) then
        raise exception 'Cupos duplicados';
      end if;
      if exists (
        select 1 from public.match_slots s
        where s.id = v_slot_id and s.match_id = p_match_id and s.side = 'b'
      ) then
        raise exception 'Los cupos del lado B no se editan acá.';
      end if;
      if not exists (
        select 1 from public.match_slots s
        where s.id = v_slot_id and s.match_id = p_match_id and s.side = 'a'
      ) then
        raise exception 'Cupo inválido';
      end if;
      v_keep := array_append(v_keep, v_slot_id);
    end if;
  end loop;

  if exists (
    select 1
    from public.match_slots s
    where s.match_id = p_match_id
      and s.side = 'a'
      and exists (
        select 1 from public.slot_claims c
        where c.slot_id = s.id and c.status = 'accepted'
      )
      and not (s.id = any (coalesce(v_keep, '{}'::uuid[])))
  ) then
    raise exception 'No se puede quitar un cupo con jugador confirmado.';
  end if;

  if exists (
    select 1
    from public.match_slots s
    where s.match_id = p_match_id
      and s.side = 'a'
      and exists (
        select 1 from public.slot_claims c
        where c.slot_id = s.id and c.status = 'pending'
      )
      and not (s.id = any (coalesce(v_keep, '{}'::uuid[])))
  ) then
    raise exception 'Hay pedidos pendientes en un cupo. Confirmalos o rechazalos antes de quitarlo.';
  end if;

  delete from public.match_slots s
  where s.match_id = p_match_id
    and s.side = 'a'
    and not (s.id = any (coalesce(v_keep, '{}'::uuid[])));

  for v_i in 0 .. v_n - 1 loop
    v_elem := p_slots -> v_i;
    v_id_text := nullif(btrim(coalesce(v_elem->>'id', '')), '');
    v_slot_id := case when v_id_text is null then null else v_id_text::uuid end;
    v_pos := coalesce(v_elem->>'position', 'any');
    v_level := coalesce(v_elem->>'level', 'any');
    v_pitch := null;
    if v_elem ? 'pitch_index' and v_elem->>'pitch_index' is not null and btrim(v_elem->>'pitch_index') <> '' then
      v_pitch := (v_elem->>'pitch_index')::integer;
    end if;

    if v_slot_id is null then
      insert into public.match_slots (match_id, position, level, side, pitch_index)
      values (p_match_id, v_pos, v_level, 'a', v_pitch);
    else
      select exists (
        select 1 from public.slot_claims c
        where c.slot_id = v_slot_id and c.status = 'accepted'
      ) into v_has_accepted;

      if not v_has_accepted then
        update public.match_slots
        set position = v_pos, level = v_level, pitch_index = v_pitch
        where id = v_slot_id and side = 'a';
      end if;
    end if;
  end loop;

  begin
    update public.matches
    set
      venue_id = p_venue_id,
      starts_at = p_starts_at,
      duration_min = p_duration_min,
      sport = p_sport,
      format = p_format,
      gender_policy = p_gender_policy,
      cost_per_person = p_cost_per_person,
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      formation_id = nullif(btrim(coalesce(p_formation_id, '')), '')
    where id = p_match_id;
  exception
    when exclusion_violation then
      raise exception 'OCCUPANCY';
  end;
end;
$$;

revoke all on function public.update_match(
  uuid, uuid, timestamptz, integer, text, text, text, integer, text, jsonb, text
) from public, anon;
grant execute on function public.update_match(
  uuid, uuid, timestamptz, integer, text, text, text, integer, text, jsonb, text
) to authenticated;

create or replace function public.create_match_from_template(
  p_template_id uuid,
  p_run_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template record;
  v_city_id uuid;
  v_city_tz text;
  v_starts_at timestamptz;
  v_match_id uuid;
  v_slot_count int;
  v_i int;
  v_range tstzrange;
begin
  select t.*
    into v_template
  from public.match_templates t
  where t.id = p_template_id
    and t.active = true;

  if not found then
    raise exception 'Template no encontrado o inactivo';
  end if;

  select v.city_id, c.timezone
    into v_city_id, v_city_tz
  from public.venues v
  join public.cities c on c.id = v.city_id
  where v.id = v_template.venue_id;

  if v_city_id is null then
    raise exception 'Cancha o ciudad no encontrada';
  end if;

  if exists (
    select 1
    from public.match_template_runs
    where template_id = p_template_id and run_date = p_run_date
  ) then
    raise exception 'Ya se creó partido para esta fecha';
  end if;

  v_starts_at := (p_run_date + v_template.starts_at_time) at time zone v_city_tz;
  v_range := tstzrange(
    v_starts_at,
    v_starts_at + make_interval(mins => v_template.duration_min),
    '[)'
  );

  perform private.lock_venue_slot(v_template.venue_id);
  perform private.assert_venue_slot_free(v_template.venue_id, v_range, null, null);

  insert into public.matches (
    city_id,
    venue_id,
    host_id,
    starts_at,
    duration_min,
    sport,
    format,
    cost_per_person,
    gender_policy,
    notes,
    status
  )
  values (
    v_city_id,
    v_template.venue_id,
    v_template.host_id,
    v_starts_at,
    v_template.duration_min,
    v_template.sport,
    v_template.format,
    v_template.cost_per_person,
    v_template.gender_policy,
    v_template.notes,
    'open'
  )
  returning id into v_match_id;

  v_slot_count := v_template.open_count;
  for v_i in 1..v_slot_count loop
    insert into public.match_slots (match_id, position, level, side)
    values (v_match_id, 'any', 'any', 'a');
  end loop;

  insert into public.match_template_runs (template_id, match_id, run_date)
  values (p_template_id, v_match_id, p_run_date);

  return v_match_id;
end;
$$;

revoke all on function public.create_match_from_template(uuid, date) from public;
grant execute on function public.create_match_from_template(uuid, date) to authenticated;

-- =============================================================================
-- 10. Booking RPCs
-- =============================================================================
create or replace function public.set_venue_booking_enabled(
  p_venue_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_venue_id is null or p_enabled is null then
    raise exception 'Datos incompletos';
  end if;

  select owner_id into v_owner
  from public.venues
  where id = p_venue_id
    and deleted_at is null;

  if not found then
    raise exception 'Cancha no encontrada.';
  end if;

  if v_owner is distinct from v_uid and not public.is_admin(v_uid) then
    raise exception 'Solo el dueño o un admin pueden cambiar este ajuste.';
  end if;

  update public.venues
  set booking_enabled = p_enabled
  where id = p_venue_id;
end;
$$;

revoke all on function public.set_venue_booking_enabled(uuid, boolean) from public, anon;
grant execute on function public.set_venue_booking_enabled(uuid, boolean) to authenticated;

create or replace function public.submit_venue_booking(
  p_venue_id uuid,
  p_sport text,
  p_starts_at timestamptz,
  p_duration_min integer,
  p_payment_method text,
  p_proof_path text,
  p_contact_whatsapp text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_venue record;
  v_tz text;
  v_flag boolean;
  v_method text;
  v_wa text;
  v_path text;
  v_note text;
  v_price jsonb;
  v_errors text[];
  v_final int;
  v_range tstzrange;
  v_id uuid;
  v_prefix text;
begin
  if v_uid is null then
    raise exception 'Entrá con tu cuenta para pedir un turno.';
  end if;

  select enabled into v_flag
  from public.feature_flags
  where key = 'venue_booking';

  if coalesce(v_flag, false) is not true then
    raise exception 'Los pedidos de turno no están disponibles ahora.';
  end if;

  if p_venue_id is null or p_starts_at is null then
    raise exception 'Datos incompletos';
  end if;

  select
    v.id,
    v.owner_id,
    v.booking_enabled,
    v.sports,
    v.deleted_at,
    c.timezone
  into v_venue
  from public.venues v
  join public.cities c on c.id = v.city_id
  where v.id = p_venue_id;

  if not found or v_venue.deleted_at is not null then
    raise exception 'Cancha no encontrada.';
  end if;
  if v_venue.owner_id is null then
    raise exception 'Esta cancha todavía no acepta pedidos de turno.';
  end if;
  if not v_venue.booking_enabled then
    raise exception 'Esta cancha no acepta pedidos de turno.';
  end if;

  if p_sport is null or p_sport not in ('futbol', 'futbol_sala', 'basquet', 'voleibol', 'padel') then
    raise exception 'Elige un deporte válido.';
  end if;
  if v_venue.sports is null or not (p_sport = any (v_venue.sports)) then
    raise exception 'Esa cancha no ofrece ese deporte.';
  end if;

  if p_duration_min not in (30, 60, 90) then
    raise exception 'La duración debe ser 30, 60 o 90 minutos.';
  end if;

  if p_starts_at < now() + interval '2 hours' then
    raise exception 'Pedí el turno con al menos 2 horas de anticipación.';
  end if;
  if p_starts_at > now() + interval '14 days' then
    raise exception 'Solo se pueden pedir turnos hasta 14 días adelante.';
  end if;

  v_tz := v_venue.timezone;
  -- Validación de ventana civil en TZ de la ciudad (mismo horizonte absoluto).
  if (p_starts_at at time zone v_tz) < ((now() at time zone v_tz) + interval '2 hours') then
    raise exception 'Pedí el turno con al menos 2 horas de anticipación.';
  end if;

  v_method := lower(btrim(coalesce(p_payment_method, '')));
  if v_method not in ('nequi', 'bank_transfer') then
    raise exception 'Método de pago no válido.';
  end if;

  v_wa := btrim(coalesce(p_contact_whatsapp, ''));
  if v_wa !~ '^573[0-9]{9}$' then
    raise exception 'WhatsApp inválido. Usá formato 573XXXXXXXXX.';
  end if;

  v_path := btrim(coalesce(p_proof_path, ''));
  if v_path = '' or position('..' in v_path) > 0 then
    raise exception 'Comprobante no válido.';
  end if;
  v_prefix := p_venue_id::text || '/' || v_uid::text || '/';
  if left(v_path, length(v_prefix)) is distinct from v_prefix then
    raise exception 'La ruta del comprobante no corresponde a esta cancha y usuario.';
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');
  if v_note is not null and char_length(v_note) > 300 then
    raise exception 'La nota es demasiado larga (máx. 300).';
  end if;

  perform private.assert_rate_limit(
    'venue_booking_submit',
    v_uid,
    5,
    interval '1 hour',
    'Demasiados pedidos de turno. Esperá un rato.'
  );

  v_price := public.preview_match_price(p_venue_id, p_sport, p_starts_at, p_duration_min);
  v_errors := coalesce(
    (
      select array_agg(x)
      from jsonb_array_elements_text(coalesce(v_price->'errors', '[]'::jsonb)) as t(x)
    ),
    '{}'::text[]
  );
  if coalesce(jsonb_array_length(v_price->'errors'), 0) > 0 then
    raise exception 'No hay tarifa usable para ese deporte/horario: %',
      array_to_string(v_errors, '; ');
  end if;

  v_final := nullif(v_price->>'final_cop', '')::int;
  if v_final is null then
    raise exception 'No hay tarifa usable para ese deporte/horario.';
  end if;

  v_range := tstzrange(
    p_starts_at,
    p_starts_at + make_interval(mins => p_duration_min),
    '[)'
  );

  perform private.lock_venue_slot(p_venue_id);
  perform private.assert_venue_slot_free(p_venue_id, v_range, null, null);

  begin
    insert into public.venue_bookings (
      venue_id,
      player_id,
      sport,
      starts_at,
      duration_min,
      occupy_range,
      status,
      payment_method,
      proof_path,
      base_cop,
      discount_cop,
      final_cop,
      promo_id,
      billed_min,
      currency,
      contact_whatsapp,
      legal_accepted_at,
      note,
      hold_expires_at
    )
    values (
      p_venue_id,
      v_uid,
      p_sport,
      p_starts_at,
      p_duration_min,
      v_range,
      'pending',
      v_method,
      v_path,
      coalesce((v_price->>'base_cop')::int, 0),
      coalesce((v_price->>'discount_cop')::int, 0),
      v_final,
      nullif(v_price->>'promo_id', '')::uuid,
      coalesce((v_price->>'billed_min')::int, p_duration_min),
      'COP',
      v_wa,
      now(),
      v_note,
      now() + interval '4 hours'
    )
    returning id into v_id;
  exception
    when unique_violation then
      raise exception 'Ya tenés un turno pendiente en esta cancha.';
    when exclusion_violation then
      raise exception 'Esa franja ya tiene un turno pedido o confirmado. Elegí otra hora.';
  end;

  perform private.log_venue_booking_event(
    v_id,
    null,
    'pending',
    v_uid,
    jsonb_build_object('payment_method', v_method, 'final_cop', v_final)
  );

  return v_id;
end;
$$;

revoke all on function public.submit_venue_booking(
  uuid, text, timestamptz, integer, text, text, text, text
) from public, anon;
grant execute on function public.submit_venue_booking(
  uuid, text, timestamptz, integer, text, text, text, text
) to authenticated;

create or replace function public.cancel_venue_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.venue_bookings%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_booking_id is null then
    raise exception 'Datos incompletos';
  end if;

  select * into v_row
  from public.venue_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Turno no encontrado.';
  end if;
  if v_row.player_id is distinct from v_uid then
    raise exception 'Solo quien pidió el turno puede cancelarlo.';
  end if;

  if v_row.status = 'pending' then
    null;
  elsif v_row.status = 'confirmed' then
    if v_row.starts_at - now() < interval '12 hours' then
      raise exception 'Solo podés cancelar un turno confirmado con al menos 12 horas de anticipación.';
    end if;
  else
    raise exception 'Ese turno ya no se puede cancelar.';
  end if;

  update public.venue_bookings
  set
    status = 'cancelled',
    hold_expires_at = null,
    updated_at = now()
  where id = p_booking_id;

  perform private.log_venue_booking_event(
    p_booking_id,
    v_row.status,
    'cancelled',
    v_uid,
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.cancel_venue_booking(uuid) from public, anon;
grant execute on function public.cancel_venue_booking(uuid) to authenticated;

create or replace function public.approve_venue_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.venue_bookings%rowtype;
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_booking_id is null then
    raise exception 'Datos incompletos';
  end if;

  select * into v_row
  from public.venue_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Turno no encontrado.';
  end if;
  if v_row.status is distinct from 'pending' then
    raise exception 'Solo se pueden aprobar turnos pendientes.';
  end if;
  if v_row.hold_expires_at is not null and v_row.hold_expires_at < now() then
    raise exception 'Ese hold ya venció.';
  end if;

  select owner_id into v_owner
  from public.venues
  where id = v_row.venue_id;

  if v_owner is distinct from v_uid and not public.is_admin(v_uid) then
    raise exception 'Solo el dueño de la cancha puede aprobar turnos.';
  end if;

  perform private.assert_rate_limit(
    'venue_booking_decide',
    v_uid,
    30,
    interval '1 hour',
    'Demasiadas decisiones. Esperá un rato.'
  );

  perform private.lock_venue_slot(v_row.venue_id);
  perform private.assert_venue_slot_free(
    v_row.venue_id,
    v_row.occupy_range,
    v_row.id,
    null
  );

  update public.venue_bookings
  set
    status = 'confirmed',
    hold_expires_at = null,
    decided_at = now(),
    decided_by = v_uid,
    reject_reason = null,
    updated_at = now()
  where id = p_booking_id;

  perform private.log_venue_booking_event(
    p_booking_id,
    'pending',
    'confirmed',
    v_uid,
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.approve_venue_booking(uuid) from public, anon;
grant execute on function public.approve_venue_booking(uuid) to authenticated;

create or replace function public.reject_venue_booking(
  p_booking_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.venue_bookings%rowtype;
  v_owner uuid;
  v_reason text;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_booking_id is null then
    raise exception 'Datos incompletos';
  end if;

  select * into v_row
  from public.venue_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Turno no encontrado.';
  end if;
  if v_row.status is distinct from 'pending' then
    raise exception 'Solo se pueden rechazar turnos pendientes.';
  end if;

  select owner_id into v_owner
  from public.venues
  where id = v_row.venue_id;

  if v_owner is distinct from v_uid and not public.is_admin(v_uid) then
    raise exception 'Solo el dueño de la cancha puede rechazar turnos.';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is not null and char_length(v_reason) > 300 then
    raise exception 'El motivo es demasiado largo (máx. 300).';
  end if;

  perform private.assert_rate_limit(
    'venue_booking_decide',
    v_uid,
    30,
    interval '1 hour',
    'Demasiadas decisiones. Esperá un rato.'
  );

  update public.venue_bookings
  set
    status = 'rejected',
    hold_expires_at = null,
    decided_at = now(),
    decided_by = v_uid,
    reject_reason = v_reason,
    updated_at = now()
  where id = p_booking_id;

  perform private.log_venue_booking_event(
    p_booking_id,
    'pending',
    'rejected',
    v_uid,
    case when v_reason is null then '{}'::jsonb else jsonb_build_object('reason_len', char_length(v_reason)) end
  );
end;
$$;

revoke all on function public.reject_venue_booking(uuid, text) from public, anon;
grant execute on function public.reject_venue_booking(uuid, text) to authenticated;

create or replace function public.expire_venue_booking_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select id, status
    from public.venue_bookings
    where status = 'pending'
      and hold_expires_at is not null
      and hold_expires_at < now()
    for update skip locked
  loop
    update public.venue_bookings
    set
      status = 'expired',
      hold_expires_at = null,
      updated_at = now()
    where id = r.id;

    perform private.log_venue_booking_event(
      r.id,
      'pending',
      'expired',
      null,
      jsonb_build_object('source', 'cron')
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.expire_venue_booking_holds() is
  'Cron: pending con hold_expires_at < now() → expired. Gate HTTP: CRON_SECRET.';

revoke all on function public.expire_venue_booking_holds() from public;
grant execute on function public.expire_venue_booking_holds() to anon, authenticated, service_role;

comment on table public.venue_bookings is
  'Pedidos de turno (alquiler de horario). Hold 4h en pending; EXCLUDE + assert cruzado con matches.';
comment on table public.venue_booking_events is
  'Auditoría append-only de cambios de estado de venue_bookings. Sin PII de proof.';
