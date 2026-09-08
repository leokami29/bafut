-- FASE 3: match_events + agregados + audit + RPCs append/void
-- confirm_match_result (BM update.match) vive en Server Action; DB guarda resultado/agregados.

-- =============================================================================
-- 1. match_events
-- =============================================================================
create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  bm_match_id bigint not null references public.bm_match(id) on delete cascade,
  sport text not null check (sport in ('futbol', 'voleibol', 'basquet', 'padel')),
  team_side text not null check (team_side in ('a', 'b')),
  player_id uuid references public.tournament_team_members(id) on delete set null,
  type text not null,
  period integer,
  clock integer,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  constraint match_events_type_len check (char_length(btrim(type)) between 1 and 40),
  constraint match_events_period_nonneg check (period is null or period >= 0),
  constraint match_events_clock_nonneg check (clock is null or clock >= 0)
);

create index if not exists match_events_tournament_match_idx
  on public.match_events (tournament_id, bm_match_id, created_at);
create index if not exists match_events_match_active_idx
  on public.match_events (bm_match_id)
  where voided_at is null;
create index if not exists match_events_player_idx
  on public.match_events (player_id)
  where player_id is not null;

comment on table public.match_events is
  'Acta event-sourced por partido BM. Write solo vía RPC; score se deriva al confirmar.';

-- =============================================================================
-- 2. tournament_match_results (confirm lock)
-- =============================================================================
create table if not exists public.tournament_match_results (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  bm_match_id bigint not null references public.bm_match(id) on delete cascade,
  score_a integer not null check (score_a >= 0),
  score_b integer not null check (score_b >= 0),
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz not null default now(),
  primary key (tournament_id, bm_match_id)
);

create index if not exists tournament_match_results_tournament_idx
  on public.tournament_match_results (tournament_id);

comment on table public.tournament_match_results is
  'Resultado confirmado (derive → BM). Bloquea nuevos eventos / voids.';

-- =============================================================================
-- 3. player_tournament_stats
-- =============================================================================
create table if not exists public.player_tournament_stats (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_member_id uuid not null references public.tournament_team_members(id) on delete cascade,
  metrics jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (tournament_id, team_member_id)
);

create index if not exists player_tournament_stats_tournament_idx
  on public.player_tournament_stats (tournament_id);

comment on table public.player_tournament_stats is
  'Agregados por jugador (jsonb metrics) upsert on confirm.';

-- =============================================================================
-- 4. tournament_standings
-- =============================================================================
create table if not exists public.tournament_standings (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.tournament_teams(id) on delete cascade,
  played integer not null default 0 check (played >= 0),
  wins integer not null default 0 check (wins >= 0),
  draws integer not null default 0 check (draws >= 0),
  losses integer not null default 0 check (losses >= 0),
  for_score integer not null default 0 check (for_score >= 0),
  against_score integer not null default 0 check (against_score >= 0),
  points integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (tournament_id, team_id)
);

create index if not exists tournament_standings_tournament_idx
  on public.tournament_standings (tournament_id, points desc, for_score desc);

comment on table public.tournament_standings is
  'Tabla de posiciones / W-L por equipo; upsert on confirm.';

-- =============================================================================
-- 5. tournament_match_audit (voids + confirms)
-- =============================================================================
create table if not exists public.tournament_match_audit (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  bm_match_id bigint not null,
  action text not null check (action in ('confirm', 'void_event')),
  actor_id uuid references public.profiles(id) on delete set null,
  event_id uuid references public.match_events(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tournament_match_audit_tournament_idx
  on public.tournament_match_audit (tournament_id, created_at desc);
create index if not exists tournament_match_audit_match_idx
  on public.tournament_match_audit (bm_match_id, created_at desc);

comment on table public.tournament_match_audit is
  'Audit de voids y confirms de acta de torneo.';

-- =============================================================================
-- 6. RLS — lectura pública razonable; sin write de cliente
-- =============================================================================
alter table public.match_events enable row level security;
alter table public.tournament_match_results enable row level security;
alter table public.player_tournament_stats enable row level security;
alter table public.tournament_standings enable row level security;
alter table public.tournament_match_audit enable row level security;

-- Helper policy pattern: torneo published OR staff/owner/admin
drop policy if exists match_events_select on public.match_events;
create policy match_events_select on public.match_events
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = match_events.tournament_id
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

drop policy if exists tournament_match_results_select on public.tournament_match_results;
create policy tournament_match_results_select on public.tournament_match_results
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_match_results.tournament_id
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

drop policy if exists player_tournament_stats_select on public.player_tournament_stats;
create policy player_tournament_stats_select on public.player_tournament_stats
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = player_tournament_stats.tournament_id
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

drop policy if exists tournament_standings_select on public.tournament_standings;
create policy tournament_standings_select on public.tournament_standings
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_standings.tournament_id
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

-- Audit: solo staff/owner/admin (no público)
drop policy if exists tournament_match_audit_select on public.tournament_match_audit;
create policy tournament_match_audit_select on public.tournament_match_audit
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.tournaments t
      join public.venues v on v.id = t.venue_id
      where t.id = tournament_match_audit.tournament_id
        and (
          v.owner_id = (select auth.uid())
          or public.is_venue_staff(t.venue_id)
        )
    )
  );

revoke all on table public.match_events from anon, authenticated;
revoke all on table public.tournament_match_results from anon, authenticated;
revoke all on table public.player_tournament_stats from anon, authenticated;
revoke all on table public.tournament_standings from anon, authenticated;
revoke all on table public.tournament_match_audit from anon, authenticated;

grant select on table public.match_events to anon, authenticated;
grant select on table public.tournament_match_results to anon, authenticated;
grant select on table public.player_tournament_stats to anon, authenticated;
grant select on table public.tournament_standings to anon, authenticated;
grant select on table public.tournament_match_audit to authenticated;

-- =============================================================================
-- 7. append_match_event
-- =============================================================================
create or replace function public.append_match_event(
  p_tournament_id uuid,
  p_bm_match_id bigint,
  p_team_side text,
  p_type text,
  p_player_id uuid default null,
  p_period integer default null,
  p_clock integer default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_t public.tournaments%rowtype;
  v_match public.bm_match%rowtype;
  v_id uuid;
  v_type text := btrim(coalesce(p_type, ''));
  v_side text := lower(btrim(coalesce(p_team_side, '')));
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_recent int;
begin
  if v_uid is null then
    raise exception 'Entrá con tu cuenta.';
  end if;

  select * into v_t from public.tournaments where id = p_tournament_id;
  if not found then
    raise exception 'Torneo no encontrado.';
  end if;

  if not public.can_score_tournament(v_t.venue_id, v_uid) then
    raise exception 'No tenés permiso para cargar acta (premium + scorer/manager/owner).';
  end if;

  if v_t.status <> 'active' then
    raise exception 'Solo se puede cargar acta en torneos activos.';
  end if;

  if v_side not in ('a', 'b') then
    raise exception 'team_side debe ser a o b.';
  end if;

  if char_length(v_type) < 1 or char_length(v_type) > 40 then
    raise exception 'type de evento inválido.';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'payload debe ser un objeto JSON.';
  end if;

  if p_period is not null and p_period < 0 then
    raise exception 'period inválido.';
  end if;

  if p_clock is not null and p_clock < 0 then
    raise exception 'clock inválido.';
  end if;

  select * into v_match
  from public.bm_match
  where id = p_bm_match_id and tournament_id = p_tournament_id;
  if not found then
    raise exception 'Partido no encontrado en este torneo.';
  end if;

  if exists (
    select 1 from public.tournament_match_results r
    where r.tournament_id = p_tournament_id and r.bm_match_id = p_bm_match_id
  ) then
    raise exception 'El partido ya tiene resultado confirmado.';
  end if;

  if p_player_id is not null then
    if not exists (
      select 1
      from public.tournament_team_members m
      join public.tournament_teams tt on tt.id = m.team_id
      where m.id = p_player_id and tt.tournament_id = p_tournament_id
    ) then
      raise exception 'Jugador no pertenece a este torneo.';
    end if;
  end if;

  -- Rate limit suave: máx. 60 eventos / minuto / usuario / partido
  select count(*)::int into v_recent
  from public.match_events e
  where e.tournament_id = p_tournament_id
    and e.bm_match_id = p_bm_match_id
    and e.created_by = v_uid
    and e.created_at > now() - interval '1 minute';

  if v_recent >= 60 then
    raise exception 'Demasiados eventos en poco tiempo. Esperá un momento.';
  end if;

  insert into public.match_events (
    tournament_id,
    bm_match_id,
    sport,
    team_side,
    player_id,
    type,
    period,
    clock,
    payload,
    created_by
  )
  values (
    p_tournament_id,
    p_bm_match_id,
    v_t.sport,
    v_side,
    p_player_id,
    v_type,
    p_period,
    p_clock,
    v_payload,
    v_uid
  )
  returning id into v_id;

  return v_id;
end;
$fn$;

comment on function public.append_match_event(
  uuid, bigint, text, text, uuid, integer, integer, jsonb
) is
  'Inserta evento de acta. Requiere can_score. Validación fina de catálogo en Server Action.';

revoke all on function public.append_match_event(
  uuid, bigint, text, text, uuid, integer, integer, jsonb
) from public, anon;
grant execute on function public.append_match_event(
  uuid, bigint, text, text, uuid, integer, integer, jsonb
) to authenticated;

-- =============================================================================
-- 8. void_match_event
-- =============================================================================
create or replace function public.void_match_event(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_ev public.match_events%rowtype;
  v_t public.tournaments%rowtype;
begin
  if v_uid is null then
    raise exception 'Entrá con tu cuenta.';
  end if;

  select * into v_ev from public.match_events where id = p_event_id;
  if not found then
    raise exception 'Evento no encontrado.';
  end if;

  if v_ev.voided_at is not null then
    raise exception 'El evento ya está anulado.';
  end if;

  select * into v_t from public.tournaments where id = v_ev.tournament_id;
  if not found then
    raise exception 'Torneo no encontrado.';
  end if;

  if not public.can_score_tournament(v_t.venue_id, v_uid) then
    raise exception 'No tenés permiso para anular eventos.';
  end if;

  if exists (
    select 1 from public.tournament_match_results r
    where r.tournament_id = v_ev.tournament_id and r.bm_match_id = v_ev.bm_match_id
  ) then
    raise exception 'No se puede anular: el partido ya está confirmado.';
  end if;

  update public.match_events
  set voided_at = now(), voided_by = v_uid
  where id = p_event_id;

  insert into public.tournament_match_audit (
    tournament_id,
    bm_match_id,
    action,
    actor_id,
    event_id,
    meta
  )
  values (
    v_ev.tournament_id,
    v_ev.bm_match_id,
    'void_event',
    v_uid,
    p_event_id,
    jsonb_build_object('type', v_ev.type, 'team_side', v_ev.team_side)
  );

  return p_event_id;
end;
$fn$;

comment on function public.void_match_event(uuid) is
  'Anula (soft) un evento de acta. Requiere can_score. No permitido post-confirm.';

revoke all on function public.void_match_event(uuid) from public, anon;
grant execute on function public.void_match_event(uuid) to authenticated;

-- =============================================================================
-- 9. finalize_match_confirm (agregados + audit; BM ya actualizado en servidor)
-- =============================================================================
create or replace function public.finalize_match_confirm(
  p_tournament_id uuid,
  p_bm_match_id bigint,
  p_score_a integer,
  p_score_b integer,
  p_team_a_id uuid default null,
  p_team_b_id uuid default null,
  p_player_metrics jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_t public.tournaments%rowtype;
  v_member uuid;
  v_metrics jsonb;
  v_draw boolean;
  v_a_win boolean;
  v_b_win boolean;
begin
  if v_uid is null then
    raise exception 'Entrá con tu cuenta.';
  end if;

  select * into v_t from public.tournaments where id = p_tournament_id;
  if not found then
    raise exception 'Torneo no encontrado.';
  end if;

  if not public.can_score_tournament(v_t.venue_id, v_uid) then
    raise exception 'No tenés permiso para confirmar el resultado.';
  end if;

  if p_score_a is null or p_score_b is null or p_score_a < 0 or p_score_b < 0 then
    raise exception 'Marcador inválido.';
  end if;

  if not exists (
    select 1 from public.bm_match m
    where m.id = p_bm_match_id and m.tournament_id = p_tournament_id
  ) then
    raise exception 'Partido no encontrado en este torneo.';
  end if;

  if exists (
    select 1 from public.tournament_match_results r
    where r.tournament_id = p_tournament_id and r.bm_match_id = p_bm_match_id
  ) then
    raise exception 'El partido ya tiene resultado confirmado.';
  end if;

  insert into public.tournament_match_results (
    tournament_id, bm_match_id, score_a, score_b, confirmed_by
  ) values (
    p_tournament_id, p_bm_match_id, p_score_a, p_score_b, v_uid
  );

  v_draw := p_score_a = p_score_b;
  v_a_win := p_score_a > p_score_b;
  v_b_win := p_score_b > p_score_a;

  if p_team_a_id is not null then
    insert into public.tournament_standings as s (
      tournament_id, team_id, played, wins, draws, losses,
      for_score, against_score, points, updated_at
    ) values (
      p_tournament_id, p_team_a_id, 1,
      case when v_a_win then 1 else 0 end,
      case when v_draw then 1 else 0 end,
      case when v_b_win then 1 else 0 end,
      p_score_a, p_score_b,
      case when v_a_win then 3 when v_draw then 1 else 0 end,
      now()
    )
    on conflict (tournament_id, team_id) do update set
      played = s.played + 1,
      wins = s.wins + excluded.wins,
      draws = s.draws + excluded.draws,
      losses = s.losses + excluded.losses,
      for_score = s.for_score + excluded.for_score,
      against_score = s.against_score + excluded.against_score,
      points = s.points + excluded.points,
      updated_at = now();
  end if;

  if p_team_b_id is not null then
    insert into public.tournament_standings as s (
      tournament_id, team_id, played, wins, draws, losses,
      for_score, against_score, points, updated_at
    ) values (
      p_tournament_id, p_team_b_id, 1,
      case when v_b_win then 1 else 0 end,
      case when v_draw then 1 else 0 end,
      case when v_a_win then 1 else 0 end,
      p_score_b, p_score_a,
      case when v_b_win then 3 when v_draw then 1 else 0 end,
      now()
    )
    on conflict (tournament_id, team_id) do update set
      played = s.played + 1,
      wins = s.wins + excluded.wins,
      draws = s.draws + excluded.draws,
      losses = s.losses + excluded.losses,
      for_score = s.for_score + excluded.for_score,
      against_score = s.against_score + excluded.against_score,
      points = s.points + excluded.points,
      updated_at = now();
  end if;

  if p_player_metrics is not null and jsonb_typeof(p_player_metrics) = 'object' then
    for v_member, v_metrics in
      select key::uuid, value
      from jsonb_each(p_player_metrics)
    loop
      if jsonb_typeof(v_metrics) <> 'object' then
        continue;
      end if;

      insert into public.player_tournament_stats as ps (
        tournament_id, team_member_id, metrics, updated_at
      ) values (
        p_tournament_id, v_member, v_metrics, now()
      )
      on conflict (tournament_id, team_member_id) do update set
        metrics = (
          select coalesce(
            jsonb_object_agg(
              k,
              to_jsonb(
                coalesce((ps.metrics ->> k)::numeric, 0)
                + coalesce((excluded.metrics ->> k)::numeric, 0)
              )
            ),
            '{}'::jsonb
          )
          from (
            select distinct key as k
            from (
              select jsonb_object_keys(coalesce(ps.metrics, '{}'::jsonb)) as key
              union
              select jsonb_object_keys(excluded.metrics)
            ) keys
          ) u
        ),
        updated_at = now();
    end loop;
  end if;

  insert into public.tournament_match_audit (
    tournament_id, bm_match_id, action, actor_id, meta
  ) values (
    p_tournament_id,
    p_bm_match_id,
    'confirm',
    v_uid,
    jsonb_build_object(
      'score_a', p_score_a,
      'score_b', p_score_b,
      'team_a_id', p_team_a_id,
      'team_b_id', p_team_b_id
    )
  );
end;
$fn$;

comment on function public.finalize_match_confirm(
  uuid, bigint, integer, integer, uuid, uuid, jsonb
) is
  'Persiste resultado confirmado + standings/stats/audit. Llamar tras manager.update.match.';

revoke all on function public.finalize_match_confirm(
  uuid, bigint, integer, integer, uuid, uuid, jsonb
) from public, anon;
grant execute on function public.finalize_match_confirm(
  uuid, bigint, integer, integer, uuid, uuid, jsonb
) to authenticated;
