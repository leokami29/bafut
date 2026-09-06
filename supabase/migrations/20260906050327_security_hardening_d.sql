-- Fase D (seguridad) — capa base.
-- NOTA: claim/approve/create/delete/unclaim se reafirman en
-- 20260906051053_security_hardening_d_reconcile.sql (compat B5 antifraude).
-- 1) Roles ligeros en admins (moderation | billing | super).
-- 2) Audit log admin_actions + helper private.log_admin_action.
-- 3) Rate limits helper private.assert_rate_limit (+ claim/upload/subscribe en RPCs).
-- 4) Caps de fotos por venue + MIME/tamaño en bucket venue-photos.

-- ---------------------------------------------------------------------------
-- 1. Roles admin
-- ---------------------------------------------------------------------------
alter table public.admins
  add column if not exists role text;

update public.admins
set role = 'super'
where role is null;

alter table public.admins
  alter column role set default 'super';

alter table public.admins
  alter column role set not null;

alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins
  add constraint admins_role_check
  check (role in ('moderation', 'billing', 'super'));

comment on column public.admins.role is
  'moderation=claims; billing=subs; super=todo. Default super para no romper operadores actuales.';

create or replace function public.is_admin(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where user_id = p_uid
  );
$$;

create or replace function public.admin_has_role(p_roles text[], p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = p_uid
      and (a.role = 'super' or a.role = any (p_roles))
  );
$$;

revoke all on function public.is_admin(uuid) from public, anon;
revoke all on function public.admin_has_role(text[], uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.admin_has_role(text[], uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Audit log
-- ---------------------------------------------------------------------------
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_actions_action_len check (char_length(action) between 1 and 80),
  constraint admin_actions_entity_type_len check (char_length(entity_type) between 1 and 80)
);

create index if not exists admin_actions_created_idx
  on public.admin_actions (created_at desc);
create index if not exists admin_actions_admin_idx
  on public.admin_actions (admin_id, created_at desc);
create index if not exists admin_actions_entity_idx
  on public.admin_actions (entity_type, entity_id);

alter table public.admin_actions enable row level security;

drop policy if exists admin_actions_select_admins on public.admin_actions;
create policy admin_actions_select_admins on public.admin_actions
  for select to authenticated
  using (public.is_admin());

revoke insert, update, delete on public.admin_actions from anon, authenticated;
grant select on public.admin_actions to authenticated;

create or replace function private.log_admin_action(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return;
  end if;
  -- Solo IDs / flags en meta — sin PII (whatsapp, email, notes).
  insert into public.admin_actions (admin_id, action, entity_type, entity_id, meta)
  values (
    v_uid,
    left(btrim(p_action), 80),
    left(btrim(p_entity_type), 80),
    p_entity_id,
    coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Rate-limit helper (claim / upload / subscribe; A2 puede reusar scope)
-- ---------------------------------------------------------------------------
create table if not exists private.rate_limit_hits (
  scope text not null,
  subject_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_lookup_idx
  on private.rate_limit_hits (scope, subject_id, created_at desc);

create or replace function private.assert_rate_limit(
  p_scope text,
  p_subject_id uuid,
  p_max integer,
  p_window interval,
  p_message text default 'Demasiados intentos. Esperá un rato.'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if p_subject_id is null then
    raise exception 'No autenticado';
  end if;

  -- Limpieza barata de hits viejos (misma ventana × 2 como piso).
  delete from private.rate_limit_hits
  where scope = p_scope
    and subject_id = p_subject_id
    and created_at < now() - greatest(p_window * 2, interval '1 day');

  select count(*) into v_count
  from private.rate_limit_hits
  where scope = p_scope
    and subject_id = p_subject_id
    and created_at > now() - p_window;

  if v_count >= p_max then
    raise exception '%', p_message;
  end if;

  insert into private.rate_limit_hits (scope, subject_id)
  values (p_scope, p_subject_id);
end;
$$;

comment on function private.assert_rate_limit(text, uuid, integer, interval, text) is
  'Scopes: venue_claim, venue_photo_upload, venue_subscribe, venue_subscribe_admin. A2: usar venue_subscribe en request premium.';

-- ---------------------------------------------------------------------------
-- 4. Caps fotos + rate limit upload
-- ---------------------------------------------------------------------------
create or replace function private.enforce_venue_photo_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_uid uuid := coalesce(new.uploaded_by, (select auth.uid()));
begin
  select count(*) into v_count
  from public.venue_photos
  where venue_id = new.venue_id;

  if v_count >= 12 then
    raise exception 'Esta cancha ya tiene el máximo de 12 fotos.';
  end if;

  if v_uid is not null then
    perform private.assert_rate_limit(
      'venue_photo_upload',
      v_uid,
      20,
      interval '1 hour',
      'Demasiadas fotos subidas. Esperá un rato.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists venue_photos_limits on public.venue_photos;
create trigger venue_photos_limits
  before insert on public.venue_photos
  for each row execute function private.enforce_venue_photo_limits();

-- Bucket: MIME + tamaño (espejo de lib/venue-photos.ts).
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'venue-photos';

-- ---------------------------------------------------------------------------
-- 5. claim_venue: rate limit
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
    raise exception 'Esta cancha ya tiene un dueño registrado. Si creés que es un error, escribinos a dueños@bafut.com.';
  end if;

  select exists (
    select 1 from public.venue_claims
    where venue_id = p_venue_id and status = 'pending'
  ) into v_pending;
  if v_pending then
    raise exception 'Esta cancha ya tiene un reclamo en revisión. Si sos el dueño legítimo, escribinos con tus datos.';
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

  -- Tras validar: no quemar cuota por typos.
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

revoke all on function public.claim_venue(uuid, text, text, text) from public, anon;
grant execute on function public.claim_venue(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Admin RPCs: roles + audit (+ rate limit subscribe)
-- ---------------------------------------------------------------------------
create or replace function public.approve_venue_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_claim public.venue_claims%rowtype;
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
    reviewed_by = v_uid,
    reviewed_at = now(),
    updated_at = now()
  where id = p_claim_id;

  perform private.log_admin_action(
    'approve_venue_claim',
    'venue_claim',
    p_claim_id,
    jsonb_build_object('venue_id', v_claim.venue_id)
  );
end;
$$;

create or replace function public.reject_venue_claim(p_claim_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_claim public.venue_claims%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if not public.admin_has_role(array['moderation']::text[], v_uid) then
    raise exception 'Solo administradores de BaFut pueden rechazar reclamos.';
  end if;

  select * into v_claim from public.venue_claims where id = p_claim_id for update;
  if not found then
    raise exception 'El reclamo no existe.';
  end if;
  if v_claim.status is distinct from 'pending' then
    raise exception 'Ese reclamo ya fue revisado.';
  end if;

  update public.venue_claims
  set
    status = 'rejected',
    reject_reason = nullif(btrim(coalesce(p_reason, '')), ''),
    reviewed_by = v_uid,
    reviewed_at = now(),
    updated_at = now()
  where id = p_claim_id;

  perform private.log_admin_action(
    'reject_venue_claim',
    'venue_claim',
    p_claim_id,
    jsonb_build_object(
      'venue_id', v_claim.venue_id,
      'has_reason', (nullif(btrim(coalesce(p_reason, '')), '') is not null)
    )
  );
end;
$$;

create or replace function public.create_venue_subscription(
  p_venue_id uuid,
  p_plan text,
  p_duration_days integer default 30,
  p_payment_method text default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_subscription_id uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if not public.admin_has_role(array['billing']::text[], v_uid) then
    raise exception 'Solo administradores pueden crear suscripciones';
  end if;

  if not exists (select 1 from public.venues where id = p_venue_id) then
    raise exception 'Cancha no encontrada';
  end if;

  if p_plan is distinct from 'basic' and p_plan is distinct from 'premium' then
    raise exception 'Plan no válido';
  end if;

  perform private.assert_rate_limit(
    'venue_subscribe_admin',
    v_uid,
    30,
    interval '1 hour',
    'Demasiadas suscripciones creadas. Esperá un rato.'
  );

  insert into public.venue_subscriptions (
    venue_id,
    plan,
    started_at,
    expires_at,
    payment_method,
    status
  )
  values (
    p_venue_id,
    p_plan,
    now(),
    now() + (p_duration_days || ' days')::interval,
    p_payment_method,
    'active'
  )
  returning id into v_subscription_id;

  update public.venues
  set is_verified = true
  where id = p_venue_id;

  perform private.log_admin_action(
    'create_venue_subscription',
    'venue_subscription',
    v_subscription_id,
    jsonb_build_object(
      'venue_id', p_venue_id,
      'plan', p_plan,
      'duration_days', p_duration_days,
      'payment_method', p_payment_method
    )
  );

  return v_subscription_id;
end;
$$;

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

revoke all on function public.approve_venue_claim(uuid) from public, anon;
revoke all on function public.reject_venue_claim(uuid, text) from public, anon;
revoke all on function public.create_venue_subscription(uuid, text, integer, text) from public, anon;
revoke all on function public.create_venue from public, anon;
revoke all on function public.delete_venue from public, anon;
revoke all on function public.unclaim_venue from public, anon;

grant execute on function public.approve_venue_claim(uuid) to authenticated;
grant execute on function public.reject_venue_claim(uuid, text) to authenticated;
grant execute on function public.create_venue_subscription(uuid, text, integer, text) to authenticated;
grant execute on function public.create_venue to authenticated;
grant execute on function public.delete_venue to authenticated;
grant execute on function public.unclaim_venue to authenticated;
