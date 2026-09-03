-- Persist chosen tactical formation + optional pitch slot index for open holes.

alter table public.matches
  add column if not exists formation_id text;

comment on column public.matches.formation_id is
  'Catálogo lib/formations-catalog.ts (ej. futbol-11v11-4-3-3). Nullable = legacy.';

alter table public.match_slots
  add column if not exists pitch_index integer;

comment on column public.match_slots.pitch_index is
  'Índice 0-based en la formación (incluye GK si aplica). Null = orden legacy.';

alter table public.match_slots
  drop constraint if exists match_slots_pitch_index_check;

alter table public.match_slots
  add constraint match_slots_pitch_index_check
  check (pitch_index is null or (pitch_index >= 0 and pitch_index < 16));

-- update_match: aceptar formation_id y pitch_index en cupos
drop function if exists public.update_match(
  uuid, uuid, timestamptz, integer, text, text, text, integer, text, jsonb
);

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
  v_other_code text;
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

  select m.share_code into v_other_code
  from public.matches m
  where m.venue_id = p_venue_id
    and m.status = 'open'
    and m.id is distinct from p_match_id
    and m.occupy_range && tstzrange(
      p_starts_at,
      p_starts_at + make_interval(mins => p_duration_min),
      '[)'
    )
  order by m.starts_at, m.id
  limit 1;

  if v_other_code is not null then
    raise exception 'OCCUPANCY:%', v_other_code;
  end if;

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
) from public;
grant execute on function public.update_match(
  uuid, uuid, timestamptz, integer, text, text, text, integer, text, jsonb, text
) to authenticated;

comment on function public.update_match(
  uuid, uuid, timestamptz, integer, text, text, text, integer, text, jsonb, text
) is 'Host edita partido abierto + cupos A + formation_id.';
