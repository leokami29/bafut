-- Loop seguro, multi-deporte, contacto privado, cleanup directorio.

alter table public.matches
  add column if not exists status text not null default 'open';

alter table public.venues
  add column if not exists phone text,
  add column if not exists website text,
  add column if not exists rating numeric;

create table if not exists public.profile_contacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  whatsapp text not null,
  updated_at timestamptz not null default now()
);

alter table public.profile_contacts enable row level security;

drop policy if exists profile_contacts_select_own on public.profile_contacts;
create policy profile_contacts_select_own on public.profile_contacts
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists profile_contacts_insert_own on public.profile_contacts;
create policy profile_contacts_insert_own on public.profile_contacts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists profile_contacts_update_own on public.profile_contacts;
create policy profile_contacts_update_own on public.profile_contacts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.matches drop constraint if exists matches_format_check;
alter table public.matches add constraint matches_format_check
  check (format in ('2v2', '3v3', '4v4', '5v5', '6v6', '7v7', '8v8', '11v11'));

alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches add constraint matches_status_check
  check (status in ('open', 'cancelled'));

alter table public.matches drop constraint if exists matches_duration_check;
alter table public.matches add constraint matches_duration_check
  check (duration_min in (30, 60, 90));

alter table public.match_slots drop constraint if exists match_slots_position_check;
alter table public.match_slots add constraint match_slots_position_check
  check (
    position in (
      'any', 'gk', 'def', 'mid', 'fwd',
      'cierre', 'ala', 'pivot',
      'base', 'escolta', 'ala_pivot',
      'armador', 'central', 'opuesto', 'receptor', 'libero',
      'drive', 'reves'
    )
  );

alter table public.slot_claims drop constraint if exists slot_claims_status_check;
alter table public.slot_claims add constraint slot_claims_status_check
  check (status in ('pending', 'accepted', 'rejected', 'withdrawn'));

alter table public.slot_claims drop constraint if exists slot_claims_slot_id_player_id_key;
alter table public.slot_claims drop constraint if exists slot_claims_match_id_player_id_key;

drop index if exists public.slot_claims_one_active_per_match_idx;
create unique index slot_claims_one_active_per_match_idx
  on public.slot_claims (match_id, player_id)
  where status in ('pending', 'accepted');

drop index if exists public.slot_claims_one_active_per_slot_idx;
create unique index slot_claims_one_active_per_slot_idx
  on public.slot_claims (slot_id, player_id)
  where status in ('pending', 'accepted');

drop policy if exists slot_claims_update on public.slot_claims;
create policy slot_claims_update on public.slot_claims
  for update to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.host_id = (select auth.uid())
    )
    or player_id = (select auth.uid())
  )
  with check (
    (
      exists (
        select 1 from public.matches m
        where m.id = match_id and m.host_id = (select auth.uid())
      )
      and status in ('accepted', 'rejected')
    )
    or (
      player_id = (select auth.uid())
      and status = 'withdrawn'
    )
  );

create or replace function public.claim_slot(p_slot_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_match uuid;
  v_host uuid;
  v_starts timestamptz;
  v_status text;
  v_recent int;
begin
  if (select auth.uid()) is null then
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
  if v_host = (select auth.uid()) then
    raise exception 'El host no puede pedirse el cupo';
  end if;
  if v_status is distinct from 'open' then
    raise exception 'El partido ya no está abierto';
  end if;
  if v_starts <= now() then
    raise exception 'Ese partido ya pasó';
  end if;

  select count(*) into v_recent
  from public.slot_claims
  where player_id = (select auth.uid())
    and created_at > now() - interval '1 hour';
  if v_recent >= 10 then
    raise exception 'Demasiados pedidos. Espera un rato.';
  end if;

  insert into public.slot_claims (slot_id, match_id, player_id, status)
  values (p_slot_id, v_match, (select auth.uid()), 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

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
grant select, insert, update on public.profile_contacts to authenticated;

create index if not exists venues_sports_gin on public.venues using gin (sports);
create index if not exists matches_city_sport_starts_idx on public.matches (city_id, sport, starts_at);
create index if not exists matches_status_starts_idx on public.matches (city_id, status, starts_at);

create or replace function public.list_upcoming_open_match_ids(p_city_id uuid, p_limit integer default 50)
returns uuid[]
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(array_agg(id order by starts_at), '{}'::uuid[])
  from (
    select m.id, m.starts_at
    from public.matches m
    where m.city_id = p_city_id
      and m.status = 'open'
      and m.starts_at >= now()
      and exists (
        select 1
        from public.match_slots s
        where s.match_id = m.id
          and not exists (
            select 1 from public.slot_claims c
            where c.slot_id = s.id and c.status = 'accepted'
          )
      )
    order by m.starts_at
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  ) q;
$$;

grant execute on function public.list_upcoming_open_match_ids(uuid, integer) to anon, authenticated;

-- Backfill venue meta from notes
update public.venues
set
  phone = coalesce(
    phone,
    nullif(trim(substring(notes from 'Tel:\s*([^.|]+)')), '')
  ),
  website = coalesce(
    website,
    nullif(trim(substring(notes from 'Web:\s*(\S+)')), '')
  ),
  rating = coalesce(
    rating,
    substring(notes from '★\s*([0-9.]+)')::numeric
  )
where notes is not null;

update public.venues
set phone = null
where phone is not null and regexp_replace(phone, '\D', '', 'g') in ('3222222222', '0000000000');

-- Curar ruido del scrape
delete from public.venues
where city_id = (select id from public.cities where slug = 'barranquilla')
  and slug in (
    'liga-de-voleibol-del-atlantico',
    'cancha-de-baloncesto-titanes'
  );
