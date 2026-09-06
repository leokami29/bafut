-- CRUD de canchas para dueño (edición) y admin (todo).
-- RLS en venues solo deja SELECT; toda escritura va por SECURITY DEFINER
-- con chequeo de dueño/admin dentro de la función.

-- ============================================
-- 1. Slugger reutilizable
-- ============================================
create or replace function private.slugify(p_text text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from
    regexp_replace(
      lower(translate(
        coalesce(p_text, ''),
        'áàâäãéèêëíìîïóòôõöúùûüñç',
        'aaaaaeeeeiiiiooooouuuunc'
      )),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- ============================================
-- 2. update_venue: dueño o admin editan la ficha
--    NULL = no tocar; '' = limpiar.
-- ============================================
create or replace function public.update_venue(
  p_venue_id uuid,
  p_name text default null,
  p_neighborhood text default null,
  p_address text default null,
  p_phone text default null,
  p_website text default null,
  p_sports text[] default null,
  p_surface text default null,
  p_covered boolean default null,
  p_venue_kind text default null,
  p_notes text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select owner_id into v_owner from public.venues where id = p_venue_id;
  if v_owner is null and not found then
    raise exception 'Cancha no encontrada.';
  end if;
  if v_owner is distinct from v_uid
     and not exists (select 1 from public.admins where user_id = v_uid) then
    raise exception 'Solo el dueño de la cancha o un admin de BaFut pueden editarla.';
  end if;

  -- Validaciones (espejo de lib/venue-edit.ts; la DB manda).
  if p_name is not null
     and (char_length(btrim(p_name)) < 2 or char_length(btrim(p_name)) > 120) then
    raise exception 'El nombre debe tener entre 2 y 120 caracteres.';
  end if;
  if p_surface is not null and p_surface not in ('sintetica', 'grama', 'dura', 'cemento') then
    raise exception 'Superficie no válida.';
  end if;
  if p_venue_kind is not null and p_venue_kind not in ('alquiler', 'publica', 'club') then
    raise exception 'Tipo de cancha no válido.';
  end if;
  if p_sports is not null and (
    cardinality(p_sports) = 0
    or exists (
      select 1 from unnest(p_sports) as s(x)
      where s.x not in ('futbol', 'futbol_sala', 'basquet', 'voleibol', 'padel')
    )
  ) then
    raise exception 'Uno o más deportes no son válidos.';
  end if;
  if p_phone is not null and btrim(p_phone) <> ''
     and btrim(p_phone) !~ '^\+?[0-9 ()-]{7,20}$' then
    raise exception 'Ese teléfono no parece válido.';
  end if;
  if p_website is not null and btrim(p_website) <> ''
     and btrim(p_website) !~* '^https?://' then
    raise exception 'El sitio web debe empezar con http(s)://.';
  end if;
  if p_notes is not null and char_length(coalesce(p_notes, '')) > 500 then
    raise exception 'La nota es demasiado larga (máx. 500 caracteres).';
  end if;
  if (p_lat is not null and (p_lat < -90 or p_lat > 90))
     or (p_lng is not null and (p_lng < -180 or p_lng > 180)) then
    raise exception 'Coordenadas fuera de rango.';
  end if;

  update public.venues
  set
    name = coalesce(nullif(btrim(coalesce(p_name, '')), ''), name),
    neighborhood = case when p_neighborhood is null then neighborhood else nullif(btrim(p_neighborhood), '') end,
    address = case when p_address is null then address else nullif(btrim(p_address), '') end,
    phone = case when p_phone is null then phone else nullif(btrim(p_phone), '') end,
    website = case when p_website is null then website else nullif(btrim(p_website), '') end,
    sports = coalesce(p_sports, sports),
    surface = coalesce(p_surface, surface),
    covered = coalesce(p_covered, covered),
    venue_kind = coalesce(p_venue_kind, venue_kind),
    notes = case when p_notes is null then notes else nullif(btrim(p_notes), '') end,
    lat = coalesce(p_lat, lat),
    lng = coalesce(p_lng, lng)
  where id = p_venue_id;
end;
$$;

-- ============================================
-- 3. create_venue: solo admin (onboarding de canchas nuevas)
-- ============================================
create or replace function public.create_venue(
  p_city_id uuid,
  p_name text,
  p_neighborhood text default null,
  p_address text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_sports text[] default array['futbol']::text[],
  p_surface text default 'sintetica',
  p_covered boolean default null,
  p_venue_kind text default 'alquiler',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_slug text;
  v_base text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if not exists (select 1 from public.admins where user_id = v_uid) then
    raise exception 'Solo administradores de BaFut pueden crear canchas.';
  end if;

  if p_lat is null or p_lng is null then
    raise exception 'Faltan las coordenadas (lat, long).';
  end if;

  if char_length(btrim(coalesce(p_name, ''))) < 2 or char_length(btrim(p_name)) > 120 then
    raise exception 'El nombre debe tener entre 2 y 120 caracteres.';
  end if;
  if p_surface not in ('sintetica', 'grama', 'dura', 'cemento') then
    raise exception 'Superficie no válida.';
  end if;
  if p_venue_kind not in ('alquiler', 'publica', 'club') then
    raise exception 'Tipo de cancha no válido.';
  end if;
  if cardinality(p_sports) = 0 or exists (
    select 1 from unnest(p_sports) as s(x)
    where s.x not in ('futbol', 'futbol_sala', 'basquet', 'voleibol', 'padel')
  ) then
    raise exception 'Uno o más deportes no son válidos.';
  end if;
  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'Coordenadas fuera de rango.';
  end if;
  if not exists (select 1 from public.cities where id = p_city_id) then
    raise exception 'Ciudad no encontrada.';
  end if;

  -- Slug único por ciudad con sufijo numérico.
  v_base := coalesce(nullif(private.slugify(p_name), ''), 'cancha');
  v_slug := v_base;
  while exists (select 1 from public.venues where city_id = p_city_id and slug = v_slug) loop
    v_slug := v_base || '-' || (
      select count(*) + 1
      from public.venues
      where city_id = p_city_id and slug like v_base || '-%'
    );
  end loop;

  insert into public.venues (
    city_id, slug, name, neighborhood, address, lat, lng,
    sports, surface, covered, venue_kind, notes
  )
  values (
    p_city_id, v_slug, btrim(p_name),
    nullif(btrim(coalesce(p_neighborhood, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    p_lat, p_lng, p_sports, p_surface, p_covered, p_venue_kind,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ============================================
-- 4. delete_venue: solo admin y sin partidos (soft-safety)
-- ============================================
create or replace function public.delete_venue(p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_has_matches boolean;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if not exists (select 1 from public.admins where user_id = v_uid) then
    raise exception 'Solo administradores de BaFut pueden eliminar canchas.';
  end if;
  if not exists (select 1 from public.venues where id = p_venue_id) then
    raise exception 'Cancha no encontrada.';
  end if;

  select exists (select 1 from public.matches where venue_id = p_venue_id)
    into v_has_matches;
  if v_has_matches then
    raise exception 'No se puede eliminar: la cancha tiene partidos asociados. Cancelá los partidos primero o dejala sin verificar.';
  end if;

  delete from public.venue_photos where venue_id = p_venue_id;
  delete from public.venues where id = p_venue_id;
end;
$$;

-- ============================================
-- 5. unclaim_venue: el dueño libera la ficha (o admin revoca)
-- ============================================
create or replace function public.unclaim_venue(p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select owner_id into v_owner from public.venues where id = p_venue_id;
  if v_owner is null and not found then
    raise exception 'Cancha no encontrada.';
  end if;
  if v_owner is distinct from v_uid
     and not exists (select 1 from public.admins where user_id = v_uid) then
    raise exception 'Solo el dueño o un admin pueden liberar la ficha.';
  end if;

  update public.venues
  set
    owner_id = null,
    contact_whatsapp = null,
    contact_email = null,
    is_verified = false
  where id = p_venue_id;
end;
$$;

-- ============================================
-- 6. Storage: bucket público de fotos + permisos owner/admin
--    Ruta de objeto: <venue_id>/<uuid>.<ext>
-- ============================================
insert into storage.buckets (id, name, public)
values ('venue-photos', 'venue-photos', true)
on conflict (id) do nothing;

drop policy if exists venue_photos_storage_read on storage.objects;
create policy venue_photos_storage_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'venue-photos');

drop policy if exists venue_photos_storage_insert on storage.objects;
create policy venue_photos_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'venue-photos'
    and exists (
      select 1 from public.venues v
      where v.id = (storage.foldername(name))[1]::uuid
        and (
          v.owner_id = (select auth.uid())
          or (select auth.uid()) in (select user_id from public.admins)
        )
    )
  );

drop policy if exists venue_photos_storage_update on storage.objects;
create policy venue_photos_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'venue-photos'
    and exists (
      select 1 from public.venues v
      where v.id = (storage.foldername(name))[1]::uuid
        and (
          v.owner_id = (select auth.uid())
          or (select auth.uid()) in (select user_id from public.admins)
        )
    )
  );

drop policy if exists venue_photos_storage_delete on storage.objects;
create policy venue_photos_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'venue-photos'
    and exists (
      select 1 from public.venues v
      where v.id = (storage.foldername(name))[1]::uuid
        and (
          v.owner_id = (select auth.uid())
          or (select auth.uid()) in (select user_id from public.admins)
        )
    )
  );

-- ============================================
-- 7. Grants RPC
-- ============================================
revoke all on function public.update_venue from public, anon;
revoke all on function public.create_venue from public, anon;
revoke all on function public.delete_venue from public, anon;
revoke all on function public.unclaim_venue from public, anon;

grant execute on function public.update_venue to authenticated;
grant execute on function public.create_venue to authenticated;
grant execute on function public.delete_venue to authenticated;
grant execute on function public.unclaim_venue to authenticated;
