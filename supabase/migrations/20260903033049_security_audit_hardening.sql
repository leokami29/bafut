-- Security audit hardening:
-- 1) Force claim/respond/withdraw via SECURITY DEFINER RPCs (no direct INSERT/UPDATE).
-- 2) Rate-limit match publishes per host.
-- 3) Length CHECKs for display_name / notes.
-- 4) Document get_match_contact authz (SECURITY DEFINER stays; checks unchanged).

-- ---------------------------------------------------------------------------
-- Length constraints (truncate outliers first)
-- ---------------------------------------------------------------------------
update public.profiles
set display_name = left(display_name, 40)
where char_length(display_name) > 40;

update public.matches
set notes = left(notes, 500)
where notes is not null and char_length(notes) > 500;

alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles
  add constraint profiles_display_name_len
  check (char_length(display_name) between 1 and 40);

alter table public.matches drop constraint if exists matches_notes_len;
alter table public.matches
  add constraint matches_notes_len
  check (notes is null or char_length(notes) <= 500);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(new.raw_user_meta_data->>'display_name', ''),
        split_part(new.email, '@', 1),
        'jugador'
      ),
      40
    )
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rate limit: max 8 matches / hour / host
-- ---------------------------------------------------------------------------
create or replace function private.enforce_match_create_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent int;
begin
  select count(*) into v_recent
  from public.matches
  where host_id = new.host_id
    and created_at > now() - interval '1 hour';

  if v_recent >= 8 then
    raise exception 'Demasiados partidos publicados. Espera un rato.';
  end if;

  return new;
end;
$$;

drop trigger if exists matches_create_rate_limit on public.matches;
create trigger matches_create_rate_limit
  before insert on public.matches
  for each row execute function private.enforce_match_create_rate_limit();

-- ---------------------------------------------------------------------------
-- claim_slot: SECURITY DEFINER + full checks; revoke direct INSERT
-- ---------------------------------------------------------------------------
drop policy if exists slot_claims_insert on public.slot_claims;
revoke insert on public.slot_claims from authenticated;

create or replace function public.claim_slot(p_slot_id uuid)
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
  v_recent int;
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select s.match_id, m.host_id, m.starts_at, m.status
    into v_match, v_host, v_starts, v_status
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

  select count(*) into v_recent
  from public.slot_claims
  where player_id = v_uid
    and created_at > now() - interval '1 hour';
  if v_recent >= 10 then
    raise exception 'Demasiados pedidos. Espera un rato.';
  end if;

  insert into public.slot_claims (slot_id, match_id, player_id, status)
  values (p_slot_id, v_match, v_uid, 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.claim_slot(uuid) from public, anon;
grant execute on function public.claim_slot(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- respond_claim + withdraw_claim: SECURITY DEFINER; revoke direct UPDATE
-- ---------------------------------------------------------------------------
drop policy if exists slot_claims_update on public.slot_claims;
revoke update on public.slot_claims from authenticated;

create or replace function public.respond_claim(p_claim_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_host uuid;
  v_current text;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_status is distinct from 'accepted' and p_status is distinct from 'rejected' then
    raise exception 'Estado no válido';
  end if;

  select m.host_id, c.status
    into v_host, v_current
  from public.slot_claims c
  join public.matches m on m.id = c.match_id
  where c.id = p_claim_id
  for update of c;

  if v_host is null then
    raise exception 'Pedido no existe';
  end if;
  if v_host is distinct from v_uid then
    raise exception 'Solo quien armó el partido puede confirmar';
  end if;
  if v_current is distinct from 'pending' then
    raise exception 'El pedido ya no está pendiente';
  end if;

  update public.slot_claims
  set status = p_status, updated_at = now()
  where id = p_claim_id;
end;
$$;

create or replace function public.withdraw_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  update public.slot_claims
  set status = 'withdrawn', updated_at = now()
  where id = p_claim_id
    and player_id = v_uid
    and status = 'pending';

  if not found then
    raise exception 'No se pudo retirar el pedido';
  end if;
end;
$$;

revoke all on function public.respond_claim(uuid, text) from public, anon;
grant execute on function public.respond_claim(uuid, text) to authenticated;

revoke all on function public.withdraw_claim(uuid) from public, anon;
grant execute on function public.withdraw_claim(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_match_contact: keep SECURITY DEFINER + authz checks; document intent
-- ---------------------------------------------------------------------------
comment on function public.get_match_contact(uuid) is
  'SECURITY DEFINER: returns contact only for host/player of an accepted open claim. Do not broaden without reviewing authz. Prefer private schema if exposed further.';

create or replace function public.get_match_contact(p_claim_id uuid)
returns table (display_name text, whatsapp text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_host uuid;
  v_player uuid;
  v_status text;
  v_match_status text;
  v_other uuid;
begin
  -- Authz: only host or accepted player of an open match may see the other party's contact.
  if v_uid is null then
    return;
  end if;

  select m.host_id, c.player_id, c.status, m.status
    into v_host, v_player, v_status, v_match_status
  from public.slot_claims c
  join public.matches m on m.id = c.match_id
  where c.id = p_claim_id;

  if v_status is distinct from 'accepted' or v_match_status is distinct from 'open' then
    return;
  end if;

  if v_uid = v_host then
    v_other := v_player;
  elsif v_uid = v_player then
    v_other := v_host;
  else
    return;
  end if;

  return query
    select p.display_name, pc.whatsapp
    from public.profiles p
    left join public.profile_contacts pc on pc.user_id = p.id
    where p.id = v_other;
end;
$$;

revoke all on function public.get_match_contact(uuid) from public, anon;
grant execute on function public.get_match_contact(uuid) to authenticated;
