-- Migración para Sistema de Banca/Rotación y Modo Reto (Búsqueda de Rival) en BaFut
-- 100% retrocompatible con partidos existentes.

-- 1. Ampliación de public.matches
alter table public.matches
  add column if not exists match_mode text not null default 'pickup',
  add column if not exists host_team_name text null,
  add column if not exists away_team_name text null,
  add column if not exists challenge_target_level text not null default 'any',
  add column if not exists rotation_rule text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'matches_match_mode_check'
  ) then
    alter table public.matches
      add constraint matches_match_mode_check check (match_mode in ('pickup', 'challenge'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'matches_challenge_target_level_check'
  ) then
    alter table public.matches
      add constraint matches_challenge_target_level_check check (challenge_target_level in ('any', 'low', 'mid', 'high'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'matches_host_team_name_len'
  ) then
    alter table public.matches
      add constraint matches_host_team_name_len check (host_team_name is null or char_length(btrim(host_team_name)) between 2 and 60);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'matches_away_team_name_len'
  ) then
    alter table public.matches
      add constraint matches_away_team_name_len check (away_team_name is null or char_length(btrim(away_team_name)) between 2 and 60);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'matches_rotation_rule_len'
  ) then
    alter table public.matches
      add constraint matches_rotation_rule_len check (rotation_rule is null or char_length(btrim(rotation_rule)) between 2 and 120);
  end if;
end $$;

-- 2. Ampliación de public.match_slots
alter table public.match_slots
  add column if not exists slot_role text not null default 'starter',
  add column if not exists custom_cost_per_person numeric null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'match_slots_slot_role_check'
  ) then
    alter table public.match_slots
      add constraint match_slots_slot_role_check check (slot_role in ('starter', 'bench'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'match_slots_custom_cost_check'
  ) then
    alter table public.match_slots
      add constraint match_slots_custom_cost_check check (custom_cost_per_person is null or custom_cost_per_person >= 0);
  end if;
end $$;

-- 3. Índice compuesto para consultas eficientes en feed y detalle
create index if not exists match_slots_side_role_idx on public.match_slots (match_id, side, slot_role);

-- 4. Actualización del RPC respond_claim para soportar autoridad dual (Host A vs Away B)
create or replace function public.respond_claim(p_claim_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_host uuid;
  v_away uuid;
  v_side text;
  v_current text;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_status is distinct from 'accepted' and p_status is distinct from 'rejected' then
    raise exception 'Estado no válido';
  end if;

  select m.host_id, m.away_opened_by, s.side, c.status
    into v_host, v_away, v_side, v_current
  from public.slot_claims c
  join public.matches m on m.id = c.match_id
  join public.match_slots s on s.id = c.slot_id
  where c.id = p_claim_id
  for update of c;

  if v_host is null then
    raise exception 'Pedido no existe';
  end if;

  -- Regla de moderación:
  -- Si el cupo es del Equipo B y ya hay un capitán rival (away_opened_by), solo él modera su equipo.
  -- De lo contrario, el anfitrión (host_id) modera.
  if v_side = 'b' and v_away is not null then
    if v_away is distinct from v_uid then
      raise exception 'Solo el capitán del equipo rival puede confirmar este cupo';
    end if;
  else
    if v_host is distinct from v_uid then
      raise exception 'Solo quien armó el partido puede confirmar';
    end if;
  end if;

  if v_current is distinct from 'pending' then
    raise exception 'El pedido ya no está pendiente';
  end if;

  update public.slot_claims
  set status = p_status, updated_at = now()
  where id = p_claim_id;
end;
$$;

revoke all on function public.respond_claim(uuid, text) from public, anon;
grant execute on function public.respond_claim(uuid, text) to authenticated;

-- 5. RPC Atómico para aceptar reto completo con un equipo rival
create or replace function public.accept_challenge_full_team(
  p_match_id uuid,
  p_team_name text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_host uuid;
  v_status text;
  v_starts timestamptz;
  v_away uuid;
  v_share text;
  v_accepted_individual_count int;
  v_side_b_count int;
  v_first_b_slot uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_match_id is null then
    raise exception 'Partido no válido.';
  end if;
  if p_team_name is null or char_length(btrim(p_team_name)) < 2 then
    raise exception 'Ingresá un nombre para tu equipo (mínimo 2 caracteres).';
  end if;

  select host_id, status, starts_at, away_opened_by, share_code
    into v_host, v_status, v_starts, v_away, v_share
  from public.matches
  where id = p_match_id
  for update;

  if v_host is null then
    raise exception 'El partido no existe';
  end if;
  if v_status is distinct from 'open' then
    raise exception 'Ese partido ya no está abierto';
  end if;
  if v_starts <= now() then
    raise exception 'Ese partido ya empezó o pasó';
  end if;
  if v_host = v_uid then
    raise exception 'No puedes retar a tu propio equipo.';
  end if;
  if v_away is not null then
    raise exception 'El equipo rival ya fue tomado por otro capitán.';
  end if;

  -- Contar si ya hay agentes libres confirmados individualmente en el lado B
  select count(*) into v_accepted_individual_count
  from public.slot_claims c
  join public.match_slots s on s.id = c.slot_id
  where s.match_id = p_match_id
    and s.side = 'b'
    and c.status = 'accepted';

  if v_accepted_individual_count > 0 then
    raise exception 'El rival ya tiene % jugador(es) confirmado(s). Súmate a los cupos libres restantes.', v_accepted_individual_count;
  end if;

  -- Contar slots de lado B
  select count(*), min(id::text) into v_side_b_count, v_first_b_slot
  from public.match_slots
  where match_id = p_match_id and side = 'b';

  if v_side_b_count = 0 then
    raise exception 'Este partido no tiene cupos configurados para rival.';
  end if;

  -- Asignar capitán rival y nombre de equipo
  update public.matches
  set away_opened_by = v_uid,
      away_team_name = btrim(p_team_name)
  where id = p_match_id;

  -- Rechazar pedidos pendientes individuales previos en lado B
  update public.slot_claims
  set status = 'rejected', updated_at = now()
  where match_id = p_match_id
    and slot_id in (select id from public.match_slots where match_id = p_match_id and side = 'b')
    and status = 'pending';

  -- Asignar al capitán rival en el primer slot disponible de lado B
  if v_first_b_slot is not null then
    insert into public.slot_claims (slot_id, match_id, player_id, status, declared_level)
    values (v_first_b_slot::uuid, p_match_id, v_uid, 'accepted', 'any');
  end if;

  return v_share;
end;
$$;

revoke all on function public.accept_challenge_full_team(uuid, text) from public, anon;
grant execute on function public.accept_challenge_full_team(uuid, text) to authenticated;
