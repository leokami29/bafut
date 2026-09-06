-- Moderación de reclamos de cancha.
-- Antes claim_venue asignaba owner_id al instante: cualquiera podía reclamar.
-- Ahora el reclamo queda 'pending' y un admin de BaFut lo aprueba o rechaza.
-- La tabla admins ya existe (migración 20260905010000): agregate con
--   INSERT INTO public.admins (user_id) VALUES ('<tu-user-id>');

-- ============================================
-- 1. Tabla venue_claims
-- ============================================
create table if not exists public.venue_claims (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  whatsapp text not null check (whatsapp ~ '^573[0-9]{9}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  note text not null check (char_length(note) between 10 and 500),
  reject_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un solo reclamo activo por cancha (permite reclamos históricos tras rechazo).
create unique index venue_claims_one_pending_per_venue_idx
  on public.venue_claims (venue_id)
  where status = 'pending';

-- Un solo pendiente por cancha y usuario (evita doble-submit).
create unique index venue_claims_one_pending_per_user_idx
  on public.venue_claims (venue_id, user_id)
  where status = 'pending';

create index venue_claims_status_idx on public.venue_claims (status, created_at);
create index venue_claims_user_idx on public.venue_claims (user_id);
create index venue_claims_venue_idx on public.venue_claims (venue_id);

-- ============================================
-- 2. RLS: solo lectura (own claims + admin); escritura 100% vía RPC
-- ============================================
alter table public.venue_claims enable row level security;

create policy venue_claims_select on public.venue_claims
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select auth.uid()) in (select user_id from public.admins)
  );

-- Sin políticas de insert/update/delete: nadie escribe directo, solo SECURITY DEFINER.
revoke insert, update, delete on public.venue_claims from anon, authenticated;
grant select on public.venue_claims to authenticated;

-- ============================================
-- 3. claim_venue v2: crea reclamo pendiente (NO toca venues)
-- ============================================
drop function if exists public.claim_venue(uuid, text, text);

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

  -- Normalizaciones básicas (la app ya normaliza el teléfono; el CHECK atrapa lo demás).
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

  insert into public.venue_claims (venue_id, user_id, whatsapp, email, note)
  values (p_venue_id, v_uid, v_whatsapp, v_email, v_note)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.claim_venue(uuid, text, text, text) from public, anon;
grant execute on function public.claim_venue(uuid, text, text, text) to authenticated;

-- ============================================
-- 4. Revisión de reclamos (solo admins)
-- ============================================

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
  if not exists (select 1 from public.admins where user_id = v_uid) then
    raise exception 'Solo administradores de BaFut pueden aprobar reclamos.';
  end if;

  select * into v_claim from public.venue_claims where id = p_claim_id for update;
  if not found then
    raise exception 'El reclamo no existe.';
  end if;
  if v_claim.status is distinct from 'pending' then
    raise exception 'Ese reclamo ya fue revisado.';
  end if;

  -- Dueño + sello de verificada con el contacto del reclamo.
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
  v_status text;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if not exists (select 1 from public.admins where user_id = v_uid) then
    raise exception 'Solo administradores de BaFut pueden rechazar reclamos.';
  end if;

  select status into v_status from public.venue_claims where id = p_claim_id for update;
  if v_status is null then
    raise exception 'El reclamo no existe.';
  end if;
  if v_status is distinct from 'pending' then
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
end;
$$;

revoke all on function public.approve_venue_claim(uuid) from public, anon;
revoke all on function public.reject_venue_claim(uuid, text) from public, anon;
grant execute on function public.approve_venue_claim(uuid) to authenticated;
grant execute on function public.reject_venue_claim(uuid, text) to authenticated;

-- ============================================
-- 5. Consulta pública: ¿la cancha tiene un reclamo en revisión?
-- ============================================

create or replace function public.venue_has_pending_claim(p_venue_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.venue_claims
    where venue_id = p_venue_id and status = 'pending'
  );
$$;

revoke all on function public.venue_has_pending_claim(uuid) from public;
grant execute on function public.venue_has_pending_claim(uuid) to anon, authenticated;

-- ============================================
-- 6. Datos heredados: dueños asignados SIN moderación (pre-lanzamiento)
-- ============================================
-- Si querés limpiar los owner_id que se asignaron con la versión vieja de
-- claim_venue (cualquiera podía reclamar), descomentá y revisá antes de correr:
--
-- UPDATE public.venues
-- SET owner_id = NULL, is_verified = false
-- WHERE owner_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM public.venue_claims c
--     WHERE c.venue_id = venues.id AND c.status = 'approved'
--   );
