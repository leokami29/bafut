-- B5 Anti-fraude de reclamos de cancha:
-- checklist de prueba en moderación + cooldown post-rechazo.
-- (La UI de disputa si ya hay owner_id vive en la app; el RPC ya bloquea owner_id.)

-- ============================================
-- 1. Campos de prueba en venue_claims
-- ============================================
alter table public.venue_claims
  add column if not exists proof_facade boolean not null default false,
  add column if not exists proof_nit boolean not null default false,
  add column if not exists proof_call_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'venue_claims_proof_call_note_len'
      and conrelid = 'public.venue_claims'::regclass
  ) then
    alter table public.venue_claims
      add constraint venue_claims_proof_call_note_len
      check (
        proof_call_note is null
        or char_length(btrim(proof_call_note)) between 5 and 500
      );
  end if;
end $$;

comment on column public.venue_claims.proof_facade is
  'Admin verificó foto de fachada / identidad visual del local.';
comment on column public.venue_claims.proof_nit is
  'Admin verificó NIT o razón social del negocio.';
comment on column public.venue_claims.proof_call_note is
  'Nota de llamada o verificación telefónica (alternativa a fachada/NIT).';

-- ============================================
-- 2. claim_venue: cooldown 7 días tras rechazo (mismo user + venue)
-- ============================================
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

  -- Cooldown tras rechazo: no reintentar la misma cancha por 7 días.
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

  insert into public.venue_claims (venue_id, user_id, whatsapp, email, note)
  values (p_venue_id, v_uid, v_whatsapp, v_email, v_note)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.claim_venue(uuid, text, text, text) from public, anon;
grant execute on function public.claim_venue(uuid, text, text, text) to authenticated;

-- ============================================
-- 3. approve_venue_claim: exige checklist de prueba
-- ============================================
drop function if exists public.approve_venue_claim(uuid);

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
end;
$$;

revoke all on function public.approve_venue_claim(uuid, boolean, boolean, text) from public, anon;
grant execute on function public.approve_venue_claim(uuid, boolean, boolean, text) to authenticated;
