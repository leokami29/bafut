-- Ciudad es dato, no código. Barranquilla entra como primer seed.
-- Motor: partidos, cupos, claims con confirmación del host.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  country_code text not null default 'CO',
  timezone text not null default 'America/Bogota',
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  slug text not null,
  name text not null,
  neighborhood text,
  address text,
  lat double precision not null,
  lng double precision not null,
  sports text[] not null default array['futbol']::text[],
  surface text not null default 'sintetica',
  covered boolean,
  venue_kind text not null default 'alquiler',
  notes text,
  created_at timestamptz not null default now(),
  unique (city_id, slug)
);

create index venues_city_id_idx on public.venues (city_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  city_id uuid references public.cities(id),
  preferred_sport text not null default 'futbol',
  preferred_position text not null default 'any',
  level text not null default 'mid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_city_id_idx on public.profiles (city_id);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  share_code text not null unique default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  city_id uuid not null references public.cities(id),
  venue_id uuid not null references public.venues(id),
  host_id uuid not null references public.profiles(id),
  starts_at timestamptz not null,
  duration_min integer not null default 60,
  sport text not null default 'futbol',
  format text not null default '5v5',
  cost_per_person integer,
  currency text not null default 'COP',
  gender_policy text not null default 'mixed',
  notes text,
  created_at timestamptz not null default now(),
  constraint matches_format_check check (format in ('5v5', '6v6', '7v7', '8v8', '11v11')),
  constraint matches_sport_check check (sport in ('futbol', 'futbol_sala', 'basquet', 'voleibol', 'padel')),
  constraint matches_gender_check check (gender_policy in ('mixed', 'men', 'women'))
);

create index matches_city_starts_idx on public.matches (city_id, starts_at);
create index matches_venue_idx on public.matches (venue_id);
create index matches_host_idx on public.matches (host_id);

create table public.match_slots (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  position text not null default 'any',
  level text not null default 'any',
  created_at timestamptz not null default now(),
  constraint match_slots_position_check check (position in ('gk', 'def', 'mid', 'fwd', 'any')),
  constraint match_slots_level_check check (level in ('low', 'mid', 'high', 'any'))
);

create index match_slots_match_idx on public.match_slots (match_id);

create table public.slot_claims (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.match_slots(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slot_claims_status_check check (status in ('pending', 'accepted', 'rejected')),
  unique (slot_id, player_id)
);

create unique index slot_claims_one_accepted_idx on public.slot_claims (slot_id) where status = 'accepted';
create unique index slot_claims_one_active_per_match_idx
  on public.slot_claims (match_id, player_id)
  where status in ('pending', 'accepted');
create index slot_claims_player_idx on public.slot_claims (player_id);
create index slot_claims_match_idx on public.slot_claims (match_id);
create index slot_claims_slot_status_idx on public.slot_claims (slot_id, status);

alter table public.cities enable row level security;
alter table public.venues enable row level security;
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_slots enable row level security;
alter table public.slot_claims enable row level security;

create policy cities_select on public.cities for select to anon, authenticated using (true);
create policy venues_select on public.venues for select to anon, authenticated using (true);

create policy profiles_select on public.profiles for select to anon, authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy matches_select on public.matches for select to anon, authenticated using (true);
create policy matches_insert on public.matches for insert to authenticated
  with check (host_id = (select auth.uid()));
create policy matches_update on public.matches for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));
create policy matches_delete on public.matches for delete to authenticated
  using (host_id = (select auth.uid()));

create policy match_slots_select on public.match_slots for select to anon, authenticated using (true);
create policy match_slots_insert on public.match_slots for insert to authenticated
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.host_id = (select auth.uid())
    )
  );
create policy match_slots_delete on public.match_slots for delete to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.host_id = (select auth.uid())
    )
  );

create policy slot_claims_select on public.slot_claims for select to anon, authenticated
  using (
    status = 'accepted'
    or player_id = (select auth.uid())
    or exists (
      select 1 from public.matches m
      where m.id = match_id and m.host_id = (select auth.uid())
    )
  );

create policy slot_claims_insert on public.slot_claims for insert to authenticated
  with check (
    player_id = (select auth.uid())
    and status = 'pending'
    and not exists (
      select 1 from public.slot_claims c
      where c.slot_id = slot_claims.slot_id and c.status = 'accepted'
    )
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.starts_at > now()
    )
  );

create policy slot_claims_update on public.slot_claims for update to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.host_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.host_id = (select auth.uid())
    )
  );

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
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1), 'jugador')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.set_claim_match_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select s.match_id into new.match_id from public.match_slots s where s.id = new.slot_id;
  new.updated_at = now();
  return new;
end;
$$;

create trigger slot_claims_set_match
  before insert or update on public.slot_claims
  for each row execute function private.set_claim_match_id();

create or replace function private.on_claim_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and (old.status is distinct from 'accepted') then
    update public.slot_claims
    set status = 'rejected', updated_at = now()
    where slot_id = new.slot_id
      and id <> new.id
      and status = 'pending';
  end if;
  return new;
end;
$$;

create trigger slot_claims_after_accept
  after update of status on public.slot_claims
  for each row execute function private.on_claim_accepted();

create or replace function public.claim_slot(p_slot_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_match uuid;
begin
  select match_id into v_match from public.match_slots where id = p_slot_id;
  if v_match is null then
    raise exception 'Cupo no existe';
  end if;

  insert into public.slot_claims (slot_id, match_id, player_id, status)
  values (p_slot_id, v_match, (select auth.uid()), 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.cities, public.venues, public.profiles, public.matches, public.match_slots, public.slot_claims to anon, authenticated;
grant insert, update, delete on public.matches to authenticated;
grant insert, delete on public.match_slots to authenticated;
grant insert, update on public.slot_claims to authenticated;
grant insert, update on public.profiles to authenticated;
grant execute on function public.claim_slot(uuid) to authenticated;

revoke all on schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
