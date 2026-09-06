-- Reconciliación D ↔ B5: B5 reescrió claim/approve y quitó rate-limit/audit.
-- Esta migración restaura hardening D encima de la firma antifraude.

-- ---------------------------------------------------------------------------
-- claim_venue: cooldown B5 + rate limit D
-- ---------------------------------------------------------------------------
create or replace function public.claim_venue(
  p_venue_id uuid,
  p_whatsapp text,
  p_note text,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_pending boolean;
  v_open_count int;
  v_id uuid;
  v_whatsapp text;
  v_note text;
  v_email text;
  v_cooldown_until timestamptz;
begin
  if v_uid is null then
    raise exception 'Entrá con tu cuenta para reclamar la cancha.';
  end if;

  select owner_id into v_owner from public.venues where id = p_venue_id;
  if v_owner is null and not found then
    raise exception 'Cancha no encontrada.';
  end if;
  if v_owner is not distinct from v_uid then
    raise exception 'Ya sos el dueño registrado de esta cancha.';
  end if;
  if v_owner is not null then
    raise exception 'Esta cancha ya tiene un dueño registrado. Si creés que es un error, escribinos a duenos@bafut.com.';
  end if;

  select exists (
    select 1 from public.venue_claims
    where venue_id = p_venue_id and status = 'pending'
  ) into v_pending;
  if v_pending then
    raise exception 'Esta cancha ya tiene un reclamo en revisión. Si sos el dueño legítimo, escribinos con tus datos.';
  end if;

  select c.reviewed_at + interval '7 days'
  into v_cooldown_until
  from public.venue_claims c
  where c.venue_id = p_venue_id
    and c.user_id = v_uid
    and c.status = 'rejected'
    and c.reviewed_at is not null
  order by c.reviewed_at desc
  limit 1;

  if v_cooldown_until is not null and v_cooldown_until > now() then
    raise exception
      'Tu reclamo anterior de esta cancha fue rechazado. Podés volver a intentar después del %.',
      to_char(v_cooldown_until at time zone 'America/Bogota', 'DD/MM/YYYY HH24:MI');
  end if;

  select count(*) into v_open_count
  from public.venue_claims
  where user_id = v_uid and status = 'pending';
  if v_open_count >= 3 then
    raise exception 'Tenés demasiados reclamos abiertos. Esperá a que un editor revise los que ya enviaste.';
  end if;

  v_whatsapp := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  if v_whatsapp !~ '^573[0-9]{9}$' then
    raise exception 'Poné un WhatsApp colombiano válido (ej: 3001234567).';
  end if;

  v_note := btrim(coalesce(p_note, ''));
  if char_length(v_note) < 10 or char_length(v_note) > 500 then
    raise exception 'Contanos cómo podemos verificar que sos el dueño (mínimo 10 caracteres).';
  end if;

  v_email := nullif(btrim(lower(coalesce(p_email, ''))), '');
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ese correo no parece válido.';
  end if;

  perform private.assert_rate_limit(
    'venue_claim',
    v_uid,
    5,
    interval '1 hour',
    'Demasiados reclamos. Esperá un rato.'
  );

  insert into public.venue_claims (venue_id, user_id, whatsapp, email, note)
  values (p_venue_id, v_uid, v_whatsapp, v_email, v_note)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- approve_venue_claim: checklist B5 + role moderation + audit
-- ---------------------------------------------------------------------------
create or replace function public.approve_venue_claim(
  p_claim_id uuid,
  p_proof_facade boolean default false,
  p_proof_nit boolean default false,
  p_proof_call_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_claim public.venue_claims%rowtype;
  v_call_note text;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if not public.admin_has_role(array['moderation']::text[], v_uid) then
    raise exception 'Solo administradores de BaFut pueden aprobar reclamos.';
  end if;

  select * into v_claim from public.venue_claims where id = p_claim_id for update;
  if not found then
    raise exception 'El reclamo no existe.';
  end if;
  if v_claim.status is distinct from 'pending' then
    raise exception 'Ese reclamo ya fue revisado.';
  end if;

  v_call_note := nullif(btrim(coalesce(p_proof_call_note, '')), '');
  if v_call_note is not null and (char_length(v_call_note) < 5 or char_length(v_call_note) > 500) then
    raise exception 'La nota de llamada debe tener entre 5 y 500 caracteres.';
  end if;

  if not (
    coalesce(p_proof_facade, false)
    or coalesce(p_proof_nit, false)
    or v_call_note is not null
  ) then
    raise exception
      'Antes de aprobar, marcá al menos una prueba: foto de fachada, NIT/razón social, o dejá nota de la llamada.';
  end if;

  update public.venues
  set
    owner_id = v_claim.user_id,
    contact_whatsapp = v_claim.whatsapp,
    contact_email = v_claim.email,
    is_verified = true
  where id = v_claim.venue_id;

  update public.venue_claims
  set
    status = 'approved',
    proof_facade = coalesce(p_proof_facade, false),
    proof_nit = coalesce(p_proof_nit, false),
    proof_call_note = v_call_note,
    reviewed_by = v_uid,
    reviewed_at = now(),
    updated_at = now()
  where id = p_claim_id;

  perform private.log_admin_action(
    'approve_venue_claim',
    'venue_claim',
    p_claim_id,
    jsonb_build_object(
      'venue_id', v_claim.venue_id,
      'proof_facade', coalesce(p_proof_facade, false),
      'proof_nit', coalesce(p_proof_nit, false),
      'has_call_note', (v_call_note is not null)
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- create / delete / unclaim venue: roles + audit
-- ---------------------------------------------------------------------------
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
  if not public.admin_has_role(array['super']::text[], v_uid) then
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

  perform private.log_admin_action(
    'create_venue',
    'venue',
    v_id,
    jsonb_build_object('city_id', p_city_id, 'slug', v_slug)
  );

  return v_id;
end;
$$;

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
  if not public.admin_has_role(array['super']::text[], v_uid) then
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

  perform private.log_admin_action(
    'delete_venue',
    'venue',
    p_venue_id,
    '{}'::jsonb
  );
end;
$$;

create or replace function public.unclaim_venue(p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_as_admin boolean;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select owner_id into v_owner from public.venues where id = p_venue_id;
  if v_owner is null and not found then
    raise exception 'Cancha no encontrada.';
  end if;

  v_as_admin := public.is_admin(v_uid);
  if v_owner is distinct from v_uid and not v_as_admin then
    raise exception 'Solo el dueño o un admin pueden liberar la ficha.';
  end if;

  update public.venues
  set
    owner_id = null,
    contact_whatsapp = null,
    contact_email = null,
    is_verified = false
  where id = p_venue_id;

  if v_as_admin and v_owner is distinct from v_uid then
    perform private.log_admin_action(
      'unclaim_venue',
      'venue',
      p_venue_id,
      jsonb_build_object('previous_owner_id', v_owner)
    );
  end if;
end;
$$;

revoke all on function public.claim_venue(uuid, text, text, text) from public, anon;
revoke all on function public.approve_venue_claim(uuid, boolean, boolean, text) from public, anon;
revoke all on function public.create_venue from public, anon;
revoke all on function public.delete_venue from public, anon;
revoke all on function public.unclaim_venue from public, anon;

grant execute on function public.claim_venue(uuid, text, text, text) to authenticated;
grant execute on function public.approve_venue_claim(uuid, boolean, boolean, text) to authenticated;
grant execute on function public.create_venue to authenticated;
grant execute on function public.delete_venue to authenticated;
grant execute on function public.unclaim_venue to authenticated;
