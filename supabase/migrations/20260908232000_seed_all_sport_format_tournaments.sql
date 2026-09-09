-- Seed QA: matriz completa deporte × formato (4×4 = 16 torneos).
-- Venue demo: bafut-seed-demo (todos los deportes de torneo + Premium).
-- Prefijo de nombre "Seed ·" para filtrar / re-ejecutar sin duplicar.
-- Status = draft (el trigger limita a 2 registration|active por cancha).
-- No genera brackets bm_*; se generan desde el admin con equipos ya inscritos.
-- Flag venue_tournaments: no se activa aquí (kill-switch global de plataforma).

do $$
declare
  v_city uuid;
  v_venue uuid;
  v_owner uuid;
  v_starts timestamptz;
  r record;
  v_tid uuid;
  v_team_count int;
  v_max_teams int;
  v_sport_label text;
  v_format_label text;
  v_name text;
  team_names text[];
  i int;
begin
  -- Ciudad Barranquilla (seed.sql / scrapes)
  select id into v_city
  from public.cities
  where slug = 'barranquilla'
  limit 1;

  if v_city is null then
    raise notice 'Ciudad barranquilla no encontrada; seed omitido';
    return;
  end if;

  -- Dueño opcional: reutilizar el de padel-park si existe (para admin UI)
  select owner_id into v_owner
  from public.venues
  where slug = 'padel-park' and deleted_at is null
  limit 1;

  -- Venue demo multi-deporte
  select id into v_venue
  from public.venues
  where slug = 'bafut-seed-demo' and deleted_at is null
  limit 1;

  if v_venue is null then
    insert into public.venues (
      city_id, slug, name, neighborhood, address, lat, lng,
      sports, surface, covered, venue_kind, notes, owner_id
    ) values (
      v_city,
      'bafut-seed-demo',
      'BaFut Seed Demo',
      'Alto Prado',
      'Cancha demo multi-deporte (seed QA)',
      11.0042668,
      -74.815665,
      array['futbol', 'voleibol', 'basquet', 'padel']::text[],
      'sintetica',
      true,
      'alquiler',
      'Venue sintético para seed de torneos (todos los deportes/formatos). No es un local real.',
      v_owner
    )
    returning id into v_venue;
  else
    update public.venues
    set
      sports = array['futbol', 'voleibol', 'basquet', 'padel']::text[],
      notes = coalesce(
        notes,
        'Venue sintético para seed de torneos (todos los deportes/formatos).'
      ),
      owner_id = coalesce(owner_id, v_owner),
      deleted_at = null
    where id = v_venue;
  end if;

  -- Premium activo (UI: gate no_premium). Idempotente.
  if not exists (
    select 1
    from public.venue_subscriptions vs
    where vs.venue_id = v_venue
      and vs.plan = 'premium'
      and vs.status = 'active'
      and vs.expires_at > now()
  ) then
    insert into public.venue_subscriptions (
      venue_id, plan, started_at, expires_at, auto_renew, payment_method, status, amount_cop
    ) values (
      v_venue,
      'premium',
      now(),
      now() + interval '365 days',
      false,
      'manual',
      'active',
      0
    );
  else
    update public.venue_subscriptions
    set
      expires_at = greatest(expires_at, now() + interval '365 days'),
      status = 'active',
      updated_at = now()
    where venue_id = v_venue
      and plan = 'premium'
      and status = 'active';
  end if;

  v_starts :=
    (date_trunc('day', timezone('America/Bogota', now())) + interval '21 days' + interval '9 hours')
    at time zone 'America/Bogota';

  -- Limpieza idempotente: borrar torneos Seed · de esta cancha (cascade → teams/members)
  delete from public.tournaments
  where venue_id = v_venue
    and name like 'Seed ·%';

  for r in
    select *
    from (
      values
        ('futbol', 'Fútbol', 'single_elim', 'Eliminación', 8, 8),
        ('futbol', 'Fútbol', 'double_elim', 'Doble elim.', 8, 8),
        ('futbol', 'Fútbol', 'round_robin', 'Liga', 6, 8),
        ('futbol', 'Fútbol', 'groups_knockout', 'Grupos', 8, 8),
        ('voleibol', 'Vóleibol', 'single_elim', 'Eliminación', 8, 8),
        ('voleibol', 'Vóleibol', 'double_elim', 'Doble elim.', 8, 8),
        ('voleibol', 'Vóleibol', 'round_robin', 'Liga', 6, 8),
        ('voleibol', 'Vóleibol', 'groups_knockout', 'Grupos', 8, 8),
        ('basquet', 'Básquet', 'single_elim', 'Eliminación', 8, 8),
        ('basquet', 'Básquet', 'double_elim', 'Doble elim.', 8, 8),
        ('basquet', 'Básquet', 'round_robin', 'Liga', 6, 8),
        ('basquet', 'Básquet', 'groups_knockout', 'Grupos', 8, 8),
        ('padel', 'Pádel', 'single_elim', 'Eliminación', 8, 8),
        ('padel', 'Pádel', 'double_elim', 'Doble elim.', 8, 8),
        ('padel', 'Pádel', 'round_robin', 'Liga', 6, 8),
        ('padel', 'Pádel', 'groups_knockout', 'Grupos', 8, 8)
    ) as t(sport, sport_label, format, format_label, team_count, max_teams)
  loop
    v_sport_label := r.sport_label;
    v_format_label := r.format_label;
    v_team_count := r.team_count;
    v_max_teams := r.max_teams;
    v_name := 'Seed · ' || v_sport_label || ' · ' || v_format_label;

    insert into public.tournaments (
      venue_id, name, sport, format, status, visibility, max_teams, starts_at
    ) values (
      v_venue,
      v_name,
      r.sport,
      r.format,
      'draft',
      'published',
      v_max_teams,
      v_starts
    )
    returning id into v_tid;

    -- Nombres de equipo por deporte (suficientes para bracket / standings)
    case r.sport
      when 'futbol' then
        team_names := array[
          'Atlético Norte', 'River Caribe', 'Junior Seed', 'Costa FC',
          'Riomar United', 'Prado Boys', 'Sur FC', 'Tiburón FC'
        ];
      when 'voleibol' then
        team_names := array[
          'Spike BAQ', 'Bloqueo Norte', 'Ace Caribe', 'Remate Sur',
          'Saque Fuerte', 'Red Alta', 'Dig Masters', 'Set Point'
        ];
      when 'basquet' then
        team_names := array[
          'Dunkers BAQ', 'Triple Norte', 'Paint Crew', 'Alley-Oop',
          'Fast Break', 'Rim Runners', 'Court Kings', 'Hoop Caribe'
        ];
      else -- padel
        team_names := array[
          'Smash Duo', 'Loberos', 'Víbora Norte', 'Bandeja Sur',
          'Chiquita PR', 'Globo Alto', 'Paredón', 'Drive & Drop'
        ];
    end case;

    for i in 1..v_team_count loop
      insert into public.tournament_teams (tournament_id, name, seed)
      values (v_tid, team_names[i], i);

      -- 2 jugadores placeholder (sin user_id) para actas / roster
      insert into public.tournament_team_members (team_id, display_name, jersey_number)
      select tt.id, m.display_name, m.jersey
      from public.tournament_teams tt
      cross join (
        values
          ('Jugador A', 1),
          ('Jugador B', 2)
      ) as m(display_name, jersey)
      where tt.tournament_id = v_tid
        and tt.name = team_names[i];
    end loop;
  end loop;

  raise notice
    'Seed OK: venue bafut-seed-demo (%), 16 torneos Seed · (draft + published). Flag venue_tournaments no modificado.',
    v_venue;
end $$;
