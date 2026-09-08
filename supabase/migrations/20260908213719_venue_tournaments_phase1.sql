-- FASE 1: Torneos premium — venue_staff, feature flag, schema core + bm_*
-- Dominio aislado del pickup `matches`. Escrituras bm_* denegadas al cliente.

-- =============================================================================
-- 0. Constantes de límite (documentadas; enforcement en helpers / RPCs futuras)
-- =============================================================================
-- MAX_ACTIVE_TOURNAMENTS_PER_VENUE = 2  (status in registration|active)
-- MAX_PARTICIPANTS_PER_TOURNAMENT_MVP = 16
-- MAX_PARTICIPANTS_PER_TOURNAMENT_LATER = 32

-- =============================================================================
-- 1. Feature flag (default off)
-- =============================================================================
insert into public.feature_flags (key, enabled, description)
values (
  'venue_tournaments',
  false,
  'Torneos premium por cancha (kill-switch global; además requiere plan premium activo)'
)
on conflict (key) do nothing;

-- =============================================================================
-- 2. venue_staff
-- =============================================================================
create table if not exists public.venue_staff (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('manager', 'scorer')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (venue_id, user_id)
);

create index if not exists venue_staff_venue_idx on public.venue_staff (venue_id);
create index if not exists venue_staff_user_idx on public.venue_staff (user_id);

comment on table public.venue_staff is
  'Staff autorizado por el dueño: manager (admin torneos) o scorer (acta/marcador).';

alter table public.venue_staff enable row level security;

-- Lectura: dueño, el propio staff, o platform admin
drop policy if exists venue_staff_select on public.venue_staff;
create policy venue_staff_select on public.venue_staff
  for select to authenticated
  using (
    public.is_admin()
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.venues v
      where v.id = venue_staff.venue_id
        and v.owner_id = (select auth.uid())
    )
  );

-- Invite/revoke: solo owner o platform admin (no scorer/manager)
drop policy if exists venue_staff_insert on public.venue_staff;
create policy venue_staff_insert on public.venue_staff
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.venues v
      where v.id = venue_staff.venue_id
        and v.owner_id = (select auth.uid())
    )
  );

drop policy if exists venue_staff_update on public.venue_staff;
create policy venue_staff_update on public.venue_staff
  for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.venues v
      where v.id = venue_staff.venue_id
        and v.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.venues v
      where v.id = venue_staff.venue_id
        and v.owner_id = (select auth.uid())
    )
  );

drop policy if exists venue_staff_delete on public.venue_staff;
create policy venue_staff_delete on public.venue_staff
  for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.venues v
      where v.id = venue_staff.venue_id
        and v.owner_id = (select auth.uid())
    )
  );

revoke all on table public.venue_staff from anon;
grant select, insert, update, delete on table public.venue_staff to authenticated;

-- =============================================================================
-- 3. Authz helpers (DB)
-- =============================================================================
create or replace function public.venue_has_active_premium(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.venue_subscriptions vs
    where vs.venue_id = p_venue_id
      and vs.plan = 'premium'
      and vs.status = 'active'
      and vs.expires_at > now()
  );
$$;

comment on function public.venue_has_active_premium(uuid) is
  'True si la cancha tiene suscripción premium activa no vencida.';

create or replace function public.is_venue_staff(
  p_venue_id uuid,
  p_roles text[] default array['manager', 'scorer']::text[],
  p_uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.venue_staff vs
    where vs.venue_id = p_venue_id
      and vs.user_id = p_uid
      and vs.role = any (p_roles)
  );
$$;

create or replace function public.venue_tournaments_flag_on()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select enabled from public.feature_flags where key = 'venue_tournaments'),
    false
  );
$$;

-- Owner | manager | platform admin + premium + flag
create or replace function public.can_manage_venue_tournaments(
  p_venue_id uuid,
  p_uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_uid is not null
    and public.venue_tournaments_flag_on()
    and public.venue_has_active_premium(p_venue_id)
    and (
      public.is_admin(p_uid)
      or exists (
        select 1 from public.venues v
        where v.id = p_venue_id and v.owner_id = p_uid
      )
      or public.is_venue_staff(p_venue_id, array['manager']::text[], p_uid)
    );
$$;

-- Owner | manager | scorer | platform admin + premium + flag
create or replace function public.can_score_tournament(
  p_venue_id uuid,
  p_uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_uid is not null
    and public.venue_tournaments_flag_on()
    and public.venue_has_active_premium(p_venue_id)
    and (
      public.is_admin(p_uid)
      or exists (
        select 1 from public.venues v
        where v.id = p_venue_id and v.owner_id = p_uid
      )
      or public.is_venue_staff(p_venue_id, array['manager', 'scorer']::text[], p_uid)
    );
$$;

revoke all on function public.venue_has_active_premium(uuid) from public, anon;
revoke all on function public.is_venue_staff(uuid, text[], uuid) from public, anon;
revoke all on function public.venue_tournaments_flag_on() from public, anon;
revoke all on function public.can_manage_venue_tournaments(uuid, uuid) from public, anon;
revoke all on function public.can_score_tournament(uuid, uuid) from public, anon;

grant execute on function public.venue_has_active_premium(uuid) to authenticated;
grant execute on function public.is_venue_staff(uuid, text[], uuid) to authenticated;
grant execute on function public.venue_tournaments_flag_on() to authenticated, anon;
grant execute on function public.can_manage_venue_tournaments(uuid, uuid) to authenticated;
grant execute on function public.can_score_tournament(uuid, uuid) to authenticated;

-- =============================================================================
-- 4. tournaments (+ límites)
-- =============================================================================
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  sport text not null check (sport in ('futbol', 'voleibol', 'basquet', 'padel')),
  format text not null check (
    format in ('single_elim', 'double_elim', 'round_robin', 'groups_knockout')
  ),
  status text not null default 'draft' check (
    status in ('draft', 'registration', 'active', 'completed', 'archived')
  ),
  visibility text not null default 'private' check (visibility in ('private', 'published')),
  max_teams integer not null default 16 check (max_teams between 2 and 32),
  starts_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_name_len check (char_length(btrim(name)) between 2 and 80)
);

create index if not exists tournaments_venue_status_idx
  on public.tournaments (venue_id, status);
create index if not exists tournaments_venue_visibility_idx
  on public.tournaments (venue_id, visibility)
  where visibility = 'published';

comment on table public.tournaments is
  'Torneos premium por cancha (aislado del pickup matches).';

-- Límite: máx. 2 torneos concurrentes (registration|active) por cancha
create or replace function public.enforce_tournament_venue_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active int;
begin
  if tg_op = 'INSERT'
     or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    if new.status in ('registration', 'active') then
      select count(*)::int into v_active
      from public.tournaments t
      where t.venue_id = new.venue_id
        and t.status in ('registration', 'active')
        and (tg_op = 'INSERT' or t.id is distinct from new.id);

      if v_active >= 2 then
        raise exception 'Límite: máximo 2 torneos activos/en inscripción por cancha.';
      end if;
    end if;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists tournaments_enforce_limits on public.tournaments;
create trigger tournaments_enforce_limits
  before insert or update on public.tournaments
  for each row
  execute function public.enforce_tournament_venue_limits();

revoke all on function public.enforce_tournament_venue_limits() from public, anon, authenticated;

alter table public.tournaments enable row level security;

-- Lectura pública de publicados; staff/owner/admin ven todos de su cancha
drop policy if exists tournaments_select on public.tournaments;
create policy tournaments_select on public.tournaments
  for select to anon, authenticated
  using (
    visibility = 'published'
    or (
      (select auth.uid()) is not null
      and (
        public.is_admin()
        or exists (
          select 1 from public.venues v
          where v.id = tournaments.venue_id
            and v.owner_id = (select auth.uid())
        )
        or public.is_venue_staff(tournaments.venue_id)
      )
    )
  );

-- Sin write directo de cliente (fase 2: RPCs). Deny insert/update/delete.
revoke all on table public.tournaments from anon;
grant select on table public.tournaments to anon, authenticated;

-- =============================================================================
-- 5. tournament_teams / members
-- =============================================================================
create table if not exists public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  captain_user_id uuid references public.profiles(id) on delete set null,
  bm_participant_id bigint,
  seed integer,
  created_at timestamptz not null default now(),
  constraint tournament_teams_name_len check (char_length(btrim(name)) between 1 and 60),
  unique (tournament_id, name)
);

create index if not exists tournament_teams_tournament_idx
  on public.tournament_teams (tournament_id);

create table if not exists public.tournament_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.tournament_teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  jersey_number integer check (jersey_number is null or jersey_number between 0 and 99),
  created_at timestamptz not null default now(),
  constraint tournament_team_members_name_len check (
    char_length(btrim(display_name)) between 1 and 60
  )
);

create index if not exists tournament_team_members_team_idx
  on public.tournament_team_members (team_id);
create unique index if not exists tournament_team_members_user_uidx
  on public.tournament_team_members (team_id, user_id)
  where user_id is not null;

-- Límite de equipos por torneo (max_teams)
create or replace function public.enforce_tournament_team_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
  v_count int;
begin
  select t.max_teams into v_max
  from public.tournaments t
  where t.id = new.tournament_id;

  if v_max is null then
    raise exception 'Torneo inválido.';
  end if;

  select count(*)::int into v_count
  from public.tournament_teams tt
  where tt.tournament_id = new.tournament_id
    and (tg_op = 'INSERT' or tt.id is distinct from new.id);

  if v_count >= v_max then
    raise exception 'Límite de equipos del torneo alcanzado (%).', v_max;
  end if;

  return new;
end;
$$;

drop trigger if exists tournament_teams_enforce_limit on public.tournament_teams;
create trigger tournament_teams_enforce_limit
  before insert on public.tournament_teams
  for each row
  execute function public.enforce_tournament_team_limit();

revoke all on function public.enforce_tournament_team_limit() from public, anon, authenticated;

alter table public.tournament_teams enable row level security;
alter table public.tournament_team_members enable row level security;

drop policy if exists tournament_teams_select on public.tournament_teams;
create policy tournament_teams_select on public.tournament_teams
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_teams.tournament_id
        and (
          t.visibility = 'published'
          or (
            (select auth.uid()) is not null
            and (
              public.is_admin()
              or exists (
                select 1 from public.venues v
                where v.id = t.venue_id and v.owner_id = (select auth.uid())
              )
              or public.is_venue_staff(t.venue_id)
            )
          )
        )
    )
  );

drop policy if exists tournament_team_members_select on public.tournament_team_members;
create policy tournament_team_members_select on public.tournament_team_members
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.tournament_teams tt
      join public.tournaments t on t.id = tt.tournament_id
      where tt.id = tournament_team_members.team_id
        and (
          t.visibility = 'published'
          or (
            (select auth.uid()) is not null
            and (
              public.is_admin()
              or exists (
                select 1 from public.venues v
                where v.id = t.venue_id and v.owner_id = (select auth.uid())
              )
              or public.is_venue_staff(t.venue_id)
            )
          )
        )
    )
  );

revoke all on table public.tournament_teams from anon;
revoke all on table public.tournament_team_members from anon;
grant select on table public.tournament_teams to anon, authenticated;
grant select on table public.tournament_team_members to anon, authenticated;

-- =============================================================================
-- 6. Tablas bm_* (espejo brackets-manager; sin write de cliente)
-- =============================================================================
create table if not exists public.bm_participant (
  id bigint generated by default as identity primary key,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null
);

create index if not exists bm_participant_tournament_idx
  on public.bm_participant (tournament_id);

create table if not exists public.bm_stage (
  id bigint generated by default as identity primary key,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  type text not null check (
    type in ('single_elimination', 'double_elimination', 'round_robin')
  ),
  settings jsonb not null default '{}'::jsonb,
  number integer not null check (number >= 1),
  unique (tournament_id, number)
);

create index if not exists bm_stage_tournament_idx on public.bm_stage (tournament_id);

create table if not exists public.bm_group (
  id bigint generated by default as identity primary key,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage_id bigint not null references public.bm_stage(id) on delete cascade,
  number integer not null check (number >= 1),
  unique (stage_id, number)
);

create index if not exists bm_group_tournament_idx on public.bm_group (tournament_id);
create index if not exists bm_group_stage_idx on public.bm_group (stage_id);

create table if not exists public.bm_round (
  id bigint generated by default as identity primary key,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage_id bigint not null references public.bm_stage(id) on delete cascade,
  group_id bigint not null references public.bm_group(id) on delete cascade,
  number integer not null check (number >= 1),
  unique (group_id, number)
);

create index if not exists bm_round_tournament_idx on public.bm_round (tournament_id);
create index if not exists bm_round_stage_idx on public.bm_round (stage_id);
create index if not exists bm_round_group_idx on public.bm_round (group_id);

create table if not exists public.bm_match (
  id bigint generated by default as identity primary key,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage_id bigint not null references public.bm_stage(id) on delete cascade,
  group_id bigint not null references public.bm_group(id) on delete cascade,
  round_id bigint not null references public.bm_round(id) on delete cascade,
  number integer not null check (number >= 1),
  child_count integer not null default 0 check (child_count >= 0),
  status smallint not null default 0,
  opponent1 jsonb,
  opponent2 jsonb,
  unique (round_id, number)
);

create index if not exists bm_match_tournament_idx on public.bm_match (tournament_id);
create index if not exists bm_match_stage_idx on public.bm_match (stage_id);
create index if not exists bm_match_round_idx on public.bm_match (round_id);

create table if not exists public.bm_match_game (
  id bigint generated by default as identity primary key,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage_id bigint not null references public.bm_stage(id) on delete cascade,
  parent_id bigint not null references public.bm_match(id) on delete cascade,
  number integer not null check (number >= 1),
  status smallint not null default 0,
  opponent1 jsonb,
  opponent2 jsonb,
  unique (parent_id, number)
);

create index if not exists bm_match_game_tournament_idx on public.bm_match_game (tournament_id);
create index if not exists bm_match_game_parent_idx on public.bm_match_game (parent_id);

-- FK diferida: team → participant (participant se crea al generar stage)
alter table public.tournament_teams
  drop constraint if exists tournament_teams_bm_participant_fkey;
alter table public.tournament_teams
  add constraint tournament_teams_bm_participant_fkey
  foreign key (bm_participant_id) references public.bm_participant(id) on delete set null;

-- RLS bm_*: lectura si torneo publicado o staff; sin write de cliente
do $$
declare
  t text;
begin
  foreach t in array array[
    'bm_participant', 'bm_stage', 'bm_group', 'bm_round', 'bm_match', 'bm_match_game'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format($p$
      create policy %I on public.%I
        for select to anon, authenticated
        using (
          exists (
            select 1 from public.tournaments tr
            where tr.id = %I.tournament_id
              and (
                tr.visibility = 'published'
                or (
                  (select auth.uid()) is not null
                  and (
                    public.is_admin()
                    or exists (
                      select 1 from public.venues v
                      where v.id = tr.venue_id and v.owner_id = (select auth.uid())
                    )
                    or public.is_venue_staff(tr.venue_id)
                  )
                )
              )
          )
        )
    $p$, t || '_select', t, t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select on table public.%I to anon, authenticated', t);
  end loop;
end;
$$;

comment on table public.bm_participant is 'brackets-manager participant (write solo servidor/RPC).';
comment on table public.bm_stage is 'brackets-manager stage (write solo servidor/RPC).';
comment on table public.bm_group is 'brackets-manager group (write solo servidor/RPC).';
comment on table public.bm_round is 'brackets-manager round (write solo servidor/RPC).';
comment on table public.bm_match is 'brackets-manager match (write solo servidor/RPC).';
comment on table public.bm_match_game is 'brackets-manager match_game (write solo servidor/RPC).';
