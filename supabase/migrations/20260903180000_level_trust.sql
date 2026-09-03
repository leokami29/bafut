-- Level trust (Fase B): declared level on claim, post-match feedback, profile aggregates.

-- ---------------------------------------------------------------------------
-- slot_claims: declared level + ack timestamp
-- ---------------------------------------------------------------------------
alter table public.slot_claims
  add column if not exists declared_level text not null default 'mid',
  add column if not exists level_ack_at timestamptz;

alter table public.slot_claims drop constraint if exists slot_claims_declared_level_check;
alter table public.slot_claims
  add constraint slot_claims_declared_level_check
  check (declared_level in ('low', 'mid', 'high'));

-- ---------------------------------------------------------------------------
-- profiles: aggregate counters (trigger-maintained; not client-writable)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists level_feedback_count integer not null default 0,
  add column if not exists level_ok_count integer not null default 0;

comment on column public.profiles.level_feedback_count is
  'Aggregate count of match_level_feedback about this user; maintained by trigger only.';
comment on column public.profiles.level_ok_count is
  'Aggregate count of level_ok=true feedback about this user; maintained by trigger only.';

-- Column-level grants: clients may update profile fields except counters.
revoke update on table public.profiles from authenticated;
grant update (
  display_name,
  city_id,
  preferred_sport,
  preferred_position,
  level,
  updated_at
) on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- match_level_feedback
-- ---------------------------------------------------------------------------
create table if not exists public.match_level_feedback (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  claim_id uuid not null references public.slot_claims(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  about_user_id uuid not null references public.profiles(id) on delete cascade,
  level_ok boolean not null,
  created_at timestamptz not null default now(),
  constraint match_level_feedback_claim_from_unique unique (claim_id, from_user_id),
  constraint match_level_feedback_parties_distinct check (from_user_id <> about_user_id)
);

create index if not exists match_level_feedback_about_idx
  on public.match_level_feedback (about_user_id);
create index if not exists match_level_feedback_from_idx
  on public.match_level_feedback (from_user_id);
create index if not exists match_level_feedback_match_idx
  on public.match_level_feedback (match_id);
create index if not exists match_level_feedback_from_created_idx
  on public.match_level_feedback (from_user_id, created_at);

alter table public.match_level_feedback enable row level security;

drop policy if exists match_level_feedback_select on public.match_level_feedback;
create policy match_level_feedback_select on public.match_level_feedback
  for select to authenticated
  using (
    (select auth.uid()) in (from_user_id, about_user_id)
  );

-- No direct INSERT/UPDATE for authenticated — RPC only (security definer).
revoke all on table public.match_level_feedback from public, anon;
revoke insert, update, delete on table public.match_level_feedback from authenticated;
grant select on table public.match_level_feedback to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: bump profile aggregates after feedback insert
-- ---------------------------------------------------------------------------
create or replace function private.apply_level_feedback_aggregates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    level_feedback_count = level_feedback_count + 1,
    level_ok_count = level_ok_count + case when new.level_ok then 1 else 0 end,
    updated_at = now()
  where id = new.about_user_id;
  return new;
end;
$$;

drop trigger if exists match_level_feedback_after_insert on public.match_level_feedback;
create trigger match_level_feedback_after_insert
  after insert on public.match_level_feedback
  for each row execute function private.apply_level_feedback_aggregates();

-- ---------------------------------------------------------------------------
-- claim_slot: new signature with declared level + ack
-- ---------------------------------------------------------------------------
drop function if exists public.claim_slot(uuid);

create or replace function public.claim_slot(
  p_slot_id uuid,
  p_declared_level text,
  p_level_ack boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_match uuid;
  v_host uuid;
  v_starts timestamptz;
  v_status text;
  v_slot_level text;
  v_recent int;
  v_ack_at timestamptz := null;
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if p_declared_level is null or p_declared_level not in ('low', 'mid', 'high') then
    raise exception 'Nivel declarado inválido';
  end if;

  select s.match_id, s.level, m.host_id, m.starts_at, m.status
    into v_match, v_slot_level, v_host, v_starts, v_status
  from public.match_slots s
  join public.matches m on m.id = s.match_id
  where s.id = p_slot_id;

  if v_match is null then
    raise exception 'Cupo no existe';
  end if;
  if v_host = v_uid then
    raise exception 'El host no puede pedirse el cupo';
  end if;
  if v_status is distinct from 'open' then
    raise exception 'El partido ya no está abierto';
  end if;
  if v_starts <= now() then
    raise exception 'Ese partido ya pasó';
  end if;
  if exists (
    select 1 from public.slot_claims c
    where c.slot_id = p_slot_id and c.status = 'accepted'
  ) then
    raise exception 'Ese cupo ya está lleno';
  end if;

  -- Mismatch vs slot level (any slot never requires ack)
  if v_slot_level is distinct from 'any' and p_declared_level is distinct from v_slot_level then
    if coalesce(p_level_ack, false) is not true then
      raise exception 'Debes confirmar que tu nivel no coincide con el del cupo';
    end if;
    v_ack_at := now();
  end if;

  select count(*) into v_recent
  from public.slot_claims
  where player_id = v_uid
    and created_at > now() - interval '1 hour';
  if v_recent >= 10 then
    raise exception 'Demasiados pedidos. Espera un rato.';
  end if;

  insert into public.slot_claims (
    slot_id, match_id, player_id, status, declared_level, level_ack_at
  )
  values (
    p_slot_id, v_match, v_uid, 'pending', p_declared_level, v_ack_at
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.claim_slot(uuid, text, boolean) from public, anon;
grant execute on function public.claim_slot(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_level_feedback: post-match Sí/No on declared level fit
-- ---------------------------------------------------------------------------
create or replace function public.submit_level_feedback(
  p_claim_id uuid,
  p_level_ok boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_claim public.slot_claims%rowtype;
  v_host uuid;
  v_match_status text;
  v_starts timestamptz;
  v_duration int;
  v_ends timestamptz;
  v_about uuid;
  v_recent int;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_level_ok is null then
    raise exception 'Respuesta de nivel requerida';
  end if;

  select c.*
    into v_claim
  from public.slot_claims c
  where c.id = p_claim_id
  for update of c;

  if not found then
    raise exception 'Pedido no existe';
  end if;
  if v_claim.status is distinct from 'accepted' then
    raise exception 'Solo se puede evaluar un cupo aceptado';
  end if;

  select m.host_id, m.status, m.starts_at, m.duration_min
    into v_host, v_match_status, v_starts, v_duration
  from public.matches m
  where m.id = v_claim.match_id;

  if v_match_status is not distinct from 'cancelled' then
    raise exception 'El partido fue cancelado';
  end if;

  if v_uid is distinct from v_host and v_uid is distinct from v_claim.player_id then
    raise exception 'No puedes evaluar este partido';
  end if;

  if v_uid = v_host then
    v_about := v_claim.player_id;
  else
    v_about := v_host;
  end if;

  v_ends := v_starts + make_interval(mins => v_duration);
  if now() < v_ends then
    raise exception 'El partido aún no terminó';
  end if;
  if now() > v_ends + interval '7 days' then
    raise exception 'La ventana para evaluar ya cerró';
  end if;

  select count(*) into v_recent
  from public.match_level_feedback
  where from_user_id = v_uid
    and created_at > now() - interval '1 day';
  if v_recent >= 20 then
    raise exception 'Demasiadas evaluaciones hoy. Intenta mañana.';
  end if;

  insert into public.match_level_feedback (
    match_id, claim_id, from_user_id, about_user_id, level_ok
  )
  values (
    v_claim.match_id, p_claim_id, v_uid, v_about, p_level_ok
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'Ya evaluaste este partido';
end;
$$;

revoke all on function public.submit_level_feedback(uuid, boolean) from public, anon;
grant execute on function public.submit_level_feedback(uuid, boolean) to authenticated;
