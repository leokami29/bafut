-- Host edit of an open future match via SECURITY DEFINER RPC.
-- Client UPDATE on matches is limited to status (cancel). Slot position/level
-- UPDATE is granted to the host, but the app writes through update_match.

alter table public.matches
  add column if not exists updated_at timestamptz not null default now();

create or replace function private.sport_allows_format(p_sport text, p_format text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case p_sport
    when 'futbol' then p_format in ('5v5', '6v6', '7v7', '8v8', '11v11')
    when 'futbol_sala' then p_format in ('5v5')
    when 'basquet' then p_format in ('3v3', '5v5')
    when 'voleibol' then p_format in ('2v2', '6v6')
    when 'padel' then p_format in ('2v2', '4v4')
    else false
  end;
$$;

create or replace function private.sport_allows_position(p_sport text, p_position text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case p_sport
    when 'futbol' then p_position in ('any', 'gk', 'def', 'mid', 'fwd')
    when 'futbol_sala' then p_position in ('any', 'gk', 'cierre', 'ala', 'pivot')
    when 'basquet' then p_position in ('any', 'base', 'escolta', 'ala', 'ala_pivot', 'pivot')
    when 'voleibol' then p_position in ('any', 'armador', 'central', 'opuesto', 'receptor', 'libero')
    when 'padel' then p_position in ('any', 'drive', 'reves')
    else false
  end;
$$;

create or replace function private.guard_match_immutable_cols()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.host_id is distinct from old.host_id then
    raise exception 'No se puede cambiar el host';
  end if;
  if new.share_code is distinct from old.share_code then
    raise exception 'No se puede cambiar el código';
  end if;
  if new.city_id is distinct from old.city_id then
    raise exception 'No se puede cambiar la ciudad';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists matches_guard_immutable on public.matches;
create trigger matches_guard_immutable
  before update on public.matches
  for each row execute function private.guard_match_immutable_cols();

create or replace function private.guard_slot_match_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.match_id is distinct from old.match_id then
    raise exception 'No se puede mover un cupo a otro partido';
  end if;
  return new;
end;
$$;

drop trigger if exists match_slots_guard_match_id on public.match_slots;
create trigger match_slots_guard_match_id
  before update on public.match_slots
  for each row execute function private.guard_slot_match_id();

drop policy if exists match_slots_update on public.match_slots;
create policy match_slots_update on public.match_slots
  for update to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.host_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.host_id = (select auth.uid())
    )
  );

revoke update on public.matches from authenticated;
grant update (status) on public.matches to authenticated;

grant update (position, level) on public.match_slots to authenticated;

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
  p_slots jsonb
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
  v_keep uuid[] := '{}';
  v_id_text text;
  v_has_accepted boolean;
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

  select city_id, sports into v_venue_city, v_venue_sports
  from public.venues
  where id = p_venue_id;

  if v_venue_city is null or v_venue_city is distinct from v_city then
    raise exception 'Esa cancha no está en la ciudad del partido.';
  end if;
  if v_venue_sports is null or not (p_sport = any (v_venue_sports)) then
    raise exception 'Esa cancha no ofrece ese deporte.';
  end if;

  select count(*) into v_accepted
  from public.slot_claims
  where match_id = p_match_id and status = 'accepted';

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

    if v_slot_id is not null then
      if v_slot_id = any (v_keep) then
        raise exception 'Cupos duplicados';
      end if;
      if not exists (
        select 1 from public.match_slots s
        where s.id = v_slot_id and s.match_id = p_match_id
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
    and not (s.id = any (coalesce(v_keep, '{}'::uuid[])));

  for v_i in 0 .. v_n - 1 loop
    v_elem := p_slots -> v_i;
    v_id_text := nullif(btrim(coalesce(v_elem->>'id', '')), '');
    v_slot_id := case when v_id_text is null then null else v_id_text::uuid end;
    v_pos := coalesce(v_elem->>'position', 'any');
    v_level := coalesce(v_elem->>'level', 'any');

    if v_slot_id is null then
      insert into public.match_slots (match_id, position, level)
      values (p_match_id, v_pos, v_level);
    else
      select exists (
        select 1 from public.slot_claims c
        where c.slot_id = v_slot_id and c.status = 'accepted'
      ) into v_has_accepted;

      if not v_has_accepted then
        update public.match_slots
        set position = v_pos, level = v_level
        where id = v_slot_id;
      end if;
    end if;
  end loop;

  update public.matches
  set
    venue_id = p_venue_id,
    starts_at = p_starts_at,
    duration_min = p_duration_min,
    sport = p_sport,
    format = p_format,
    gender_policy = p_gender_policy,
    cost_per_person = p_cost_per_person,
    notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_match_id;
end;
$$;

comment on function public.update_match(
  uuid, uuid, timestamptz, integer, text, text, text, integer, text, jsonb
) is
  'SECURITY DEFINER: host-only edit of open future matches. Do not broaden; keep in sync with CreateMatchForm validations.';

revoke all on function public.update_match(
  uuid, uuid, timestamptz, integer, text, text, text, integer, text, jsonb
) from public, anon;

grant execute on function public.update_match(
  uuid, uuid, timestamptz, integer, text, text, text, integer, text, jsonb
) to authenticated;
