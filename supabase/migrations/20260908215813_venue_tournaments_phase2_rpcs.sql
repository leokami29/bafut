-- FASE 2: RPCs mutadoras create_tournament + register_tournament_team
-- generate_stage vive en Server Action (brackets-manager solo Node).

-- =============================================================================
-- create_tournament
-- =============================================================================
create or replace function public.create_tournament(
  p_venue_id uuid,
  p_name text,
  p_sport text,
  p_format text,
  p_max_teams integer default 16,
  p_visibility text default 'private',
  p_status text default 'registration',
  p_starts_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_max int := coalesce(p_max_teams, 16);
  v_vis text := coalesce(p_visibility, 'private');
  v_status text := coalesce(p_status, 'registration');
begin
  if v_uid is null then
    raise exception 'Entrá con tu cuenta.';
  end if;

  if not public.can_manage_venue_tournaments(p_venue_id, v_uid) then
    raise exception 'No tenés permiso para crear torneos en esta cancha (premium + staff).';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'El nombre debe tener entre 2 y 80 caracteres.';
  end if;

  if p_sport is null or p_sport not in ('futbol', 'voleibol', 'basquet', 'padel') then
    raise exception 'Deporte no válido.';
  end if;

  if p_format is null
     or p_format not in ('single_elim', 'double_elim', 'round_robin', 'groups_knockout') then
    raise exception 'Formato no válido.';
  end if;

  if v_max < 2 or v_max > 32 then
    raise exception 'max_teams debe estar entre 2 y 32.';
  end if;

  if v_vis not in ('private', 'published') then
    raise exception 'Visibilidad no válida.';
  end if;

  if v_status not in ('draft', 'registration') then
    raise exception 'Estado inicial no válido (draft o registration).';
  end if;

  insert into public.tournaments (
    venue_id,
    name,
    sport,
    format,
    status,
    visibility,
    max_teams,
    starts_at,
    created_by
  )
  values (
    p_venue_id,
    v_name,
    p_sport,
    p_format,
    v_status,
    v_vis,
    v_max,
    p_starts_at,
    v_uid
  )
  returning id into v_id;

  return v_id;
end;
$fn$;

comment on function public.create_tournament(
  uuid, text, text, text, integer, text, text, timestamptz
) is
  'Crea torneo premium. Requiere can_manage_venue_tournaments (flag + premium + owner/manager).';

revoke all on function public.create_tournament(
  uuid, text, text, text, integer, text, text, timestamptz
) from public, anon;
grant execute on function public.create_tournament(
  uuid, text, text, text, integer, text, text, timestamptz
) to authenticated;

-- =============================================================================
-- register_tournament_team (register_participant)
-- =============================================================================
create or replace function public.register_tournament_team(
  p_tournament_id uuid,
  p_name text,
  p_captain_user_id uuid default null,
  p_seed integer default null,
  p_members jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_t public.tournaments%rowtype;
  v_team_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_member jsonb;
  v_display text;
  v_user uuid;
  v_jersey int;
begin
  if v_uid is null then
    raise exception 'Entrá con tu cuenta.';
  end if;

  select * into v_t
  from public.tournaments
  where id = p_tournament_id;

  if not found then
    raise exception 'Torneo no encontrado.';
  end if;

  if not public.can_manage_venue_tournaments(v_t.venue_id, v_uid) then
    raise exception 'No tenés permiso para inscribir equipos en este torneo.';
  end if;

  if v_t.status not in ('draft', 'registration') then
    raise exception 'Solo se pueden inscribir equipos en borrador o inscripción.';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 60 then
    raise exception 'El nombre del equipo debe tener entre 1 y 60 caracteres.';
  end if;

  if p_seed is not null and p_seed < 1 then
    raise exception 'Seed inválido.';
  end if;

  if p_members is null or jsonb_typeof(p_members) <> 'array' then
    raise exception 'members debe ser un array JSON.';
  end if;

  if jsonb_array_length(p_members) > 32 then
    raise exception 'Demasiados miembros en el roster.';
  end if;

  insert into public.tournament_teams (
    tournament_id,
    name,
    captain_user_id,
    seed
  )
  values (
    p_tournament_id,
    v_name,
    p_captain_user_id,
    p_seed
  )
  returning id into v_team_id;

  for v_member in
    select value from jsonb_array_elements(p_members)
  loop
    if jsonb_typeof(v_member) <> 'object' then
      raise exception 'Cada miembro debe ser un objeto JSON.';
    end if;

    v_display := btrim(coalesce(v_member->>'display_name', v_member->>'displayName', ''));
    if char_length(v_display) < 1 or char_length(v_display) > 60 then
      raise exception 'display_name de miembro inválido.';
    end if;

    v_user := null;
    if (v_member ? 'user_id') and nullif(v_member->>'user_id', '') is not null then
      v_user := (v_member->>'user_id')::uuid;
    elsif (v_member ? 'userId') and nullif(v_member->>'userId', '') is not null then
      v_user := (v_member->>'userId')::uuid;
    end if;

    v_jersey := null;
    if (v_member ? 'jersey_number') and nullif(v_member->>'jersey_number', '') is not null then
      v_jersey := (v_member->>'jersey_number')::integer;
    elsif (v_member ? 'jerseyNumber') and nullif(v_member->>'jerseyNumber', '') is not null then
      v_jersey := (v_member->>'jerseyNumber')::integer;
    end if;

    if v_jersey is not null and (v_jersey < 0 or v_jersey > 99) then
      raise exception 'jersey_number inválido.';
    end if;

    insert into public.tournament_team_members (
      team_id,
      user_id,
      display_name,
      jersey_number
    )
    values (v_team_id, v_user, v_display, v_jersey);
  end loop;

  return v_team_id;
end;
$fn$;

comment on function public.register_tournament_team(uuid, text, uuid, integer, jsonb) is
  'Inscribe equipo (+ roster opcional). Requiere can_manage. Alias conceptual: register_participant.';

revoke all on function public.register_tournament_team(uuid, text, uuid, integer, jsonb)
  from public, anon;
grant execute on function public.register_tournament_team(uuid, text, uuid, integer, jsonb)
  to authenticated;

-- Alias estable pedido por el plan (register_participant)
create or replace function public.register_participant(
  p_tournament_id uuid,
  p_name text,
  p_captain_user_id uuid default null,
  p_seed integer default null,
  p_members jsonb default '[]'::jsonb
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.register_tournament_team(
    p_tournament_id,
    p_name,
    p_captain_user_id,
    p_seed,
    p_members
  );
$$;

comment on function public.register_participant(uuid, text, uuid, integer, jsonb) is
  'Alias de register_tournament_team.';

revoke all on function public.register_participant(uuid, text, uuid, integer, jsonb)
  from public, anon;
grant execute on function public.register_participant(uuid, text, uuid, integer, jsonb)
  to authenticated;
