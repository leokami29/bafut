-- Seed idempotente: torneos demo para Padel Park (UI / QA).
-- No toca brackets bm_*; el stage se genera desde el admin.

do $$
declare
  v_venue uuid;
  v_liga uuid := 'b75e24a4-1a36-47b8-91cc-6abd44473037';
  v_copa uuid;
  v_starts_liga timestamptz;
  v_starts_copa timestamptz;
begin
  select id into v_venue
  from public.venues
  where slug = 'padel-park' and deleted_at is null
  limit 1;

  if v_venue is null then
    raise notice 'padel-park no encontrado; seed omitido';
    return;
  end if;

  v_starts_liga :=
    (date_trunc('day', timezone('America/Bogota', now())) + interval '7 days' + interval '9 hours')
    at time zone 'America/Bogota';
  v_starts_copa :=
    (date_trunc('day', timezone('America/Bogota', now())) + interval '14 days' + interval '10 hours')
    at time zone 'America/Bogota';

  update public.tournaments
  set
    name = 'Liga Amigos Pádel Park',
    sport = 'padel',
    format = 'round_robin',
    status = 'registration',
    visibility = 'published',
    max_teams = 8,
    starts_at = v_starts_liga,
    updated_at = now()
  where id = v_liga
    and venue_id = v_venue;

  if not found then
    insert into public.tournaments (
      id, venue_id, name, sport, format, status, visibility, max_teams, starts_at
    ) values (
      v_liga, v_venue, 'Liga Amigos Pádel Park', 'padel', 'round_robin',
      'registration', 'published', 8, v_starts_liga
    );
  end if;

  update public.tournament_teams
  set name = 'Smash Duo', seed = 1
  where tournament_id = v_liga
    and name = 'equipo 1'
    and not exists (
      select 1 from public.tournament_teams t
      where t.tournament_id = v_liga and t.name = 'Smash Duo'
    );

  insert into public.tournament_teams (tournament_id, name, seed)
  select v_liga, x.name, x.seed
  from (values
    ('Smash Duo', 1),
    ('Loberos BAQ', 2),
    ('Víbora Norte', 3),
    ('Bandeja Riomar', 4),
    ('Chiquita Alto Prado', 5),
    ('Globo Sur', 6),
    ('Paredón FC', 7),
    ('Drive & Drop', 8)
  ) as x(name, seed)
  where not exists (
    select 1 from public.tournament_teams t
    where t.tournament_id = v_liga and t.name = x.name
  );

  select id into v_copa
  from public.tournaments
  where venue_id = v_venue and name = 'Copa Pádel Park Open'
  limit 1;

  if v_copa is null then
    insert into public.tournaments (
      venue_id, name, sport, format, status, visibility, max_teams, starts_at
    ) values (
      v_venue, 'Copa Pádel Park Open', 'padel', 'single_elim',
      'registration', 'published', 8, v_starts_copa
    )
    returning id into v_copa;
  else
    update public.tournaments
    set
      sport = 'padel',
      format = 'single_elim',
      status = 'registration',
      visibility = 'published',
      max_teams = 8,
      starts_at = coalesce(starts_at, v_starts_copa),
      updated_at = now()
    where id = v_copa;
  end if;

  insert into public.tournament_teams (tournament_id, name, seed)
  select v_copa, x.name, x.seed
  from (values
    ('Los Tiburones', 1),
    ('Costa Caribe', 2),
    ('Parque Alto', 3),
    ('Net Crushers', 4),
    ('Golden Spin', 5),
    ('Barras Verdes', 6),
    ('Punto Final', 7),
    ('Ace Machine', 8)
  ) as x(name, seed)
  where not exists (
    select 1 from public.tournament_teams t
    where t.tournament_id = v_copa and t.name = x.name
  );

  if not exists (
    select 1 from public.tournaments
    where venue_id = v_venue and name = 'Borrador — Copa de Prueba'
  ) then
    insert into public.tournaments (
      venue_id, name, sport, format, status, visibility, max_teams
    ) values (
      v_venue, 'Borrador — Copa de Prueba', 'padel', 'groups_knockout',
      'draft', 'private', 16
    );
  end if;
end $$;
