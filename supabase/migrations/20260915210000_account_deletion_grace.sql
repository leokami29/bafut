-- Eliminación de cuenta con gracia 30 días: schedule → cancel → purge (tombstone).
-- Reemplaza el hard-delete inmediato de delete_own_account.
-- Constante TS espejo: ACCOUNT_PURGE_DAYS = 30, DELETED_PLAYER_LABEL = 'Jugador eliminado'.

-- ---------------------------------------------------------------------------
-- 1. Columnas tombstone / gracia
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists deletion_scheduled_at timestamptz,
  add column if not exists purge_at timestamptz,
  add column if not exists deleted_at timestamptz;

comment on column public.profiles.deletion_scheduled_at is
  'Momento en que el usuario solicitó eliminar la cuenta (null = activa).';
comment on column public.profiles.purge_at is
  'Purga irreversible programada (deletion_scheduled_at + 30 días).';
comment on column public.profiles.deleted_at is
  'Tombstone: purga completada; PII anonimizada; fila conservada para historial.';

create index if not exists profiles_purge_due_idx
  on public.profiles (purge_at)
  where deletion_scheduled_at is not null and deleted_at is null;

drop index if exists public.profiles_city_id_idx;
create index if not exists profiles_active_city_idx
  on public.profiles (city_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 2. card_share_code nullable + unique parcial
-- ---------------------------------------------------------------------------
alter table public.profiles
  alter column card_share_code drop not null;

drop index if exists public.profiles_card_share_code_uidx;
create unique index if not exists profiles_card_share_code_uidx
  on public.profiles (card_share_code)
  where card_share_code is not null;

-- ---------------------------------------------------------------------------
-- 3. FK auth: quitar CASCADE para conservar tombstone tras deleteUser
-- ---------------------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

-- ---------------------------------------------------------------------------
-- 4. RLS: bloquear update en tombstone
-- ---------------------------------------------------------------------------
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and deleted_at is null)
  with check (id = (select auth.uid()) and deleted_at is null);

-- ---------------------------------------------------------------------------
-- 5. Helpers internos
-- ---------------------------------------------------------------------------
create or replace function private.unclaim_venue_core(p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.venues where id = p_venue_id;
  if not found or v_owner is null then
    return;
  end if;

  update public.venue_subscriptions
  set status = 'cancelled', updated_at = now()
  where venue_id = p_venue_id and status = 'active';

  update public.venue_subscription_requests
  set
    status = 'rejected',
    reject_reason = 'El dueño liberó la cancha: el trámite Premium quedó cancelado.',
    reviewed_at = now(),
    updated_at = now()
  where venue_id = p_venue_id and status = 'pending';

  update public.venues
  set
    owner_id = null,
    contact_whatsapp = null,
    contact_email = null,
    is_verified = false
  where id = p_venue_id;
end;
$$;

revoke all on function private.unclaim_venue_core(uuid) from public, anon, authenticated;

create or replace function private.purge_account(p_uid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avatar_path text;
  v_venue_id uuid;
  v_deleted_label constant text := 'Jugador eliminado';
begin
  if p_uid is null then
    raise exception 'Usuario inválido';
  end if;

  select avatar_path into v_avatar_path
  from public.profiles
  where id = p_uid and deleted_at is null and purge_at is not null and purge_at <= now()
  for update;

  if not found then
    return null;
  end if;

  -- Partidos futuros open del host → cancelled
  update public.matches
  set status = 'cancelled'
  where host_id = p_uid
    and status = 'open'
    and starts_at > now();

  -- Pedidos de cupo pending → withdrawn
  update public.slot_claims
  set status = 'withdrawn', updated_at = now()
  where player_id = p_uid and status = 'pending';

  -- Capitán B en partidos ajenos: solo limpiar away_opened_by (no borrar slots B)
  update public.matches
  set away_opened_by = null
  where away_opened_by = p_uid;

  -- Reservas hold/pending → cancelled
  update public.venue_bookings
  set status = 'cancelled', updated_at = now()
  where player_id = p_uid and status in ('pending');

  -- Reclamos de cancha pending → rejected
  update public.venue_claims
  set
    status = 'rejected',
    reject_reason = 'Cuenta eliminada: reclamo cancelado.',
    reviewed_at = now(),
    updated_at = now()
  where user_id = p_uid and status = 'pending';

  -- Promociones creadas por el usuario
  delete from public.venue_promotions where created_by = p_uid;

  -- Templates, alertas, push, staff, admin platform
  delete from public.match_templates where host_id = p_uid;
  delete from public.match_alerts where user_id = p_uid;
  delete from public.push_subscriptions where user_id = p_uid;
  delete from public.venue_staff where user_id = p_uid;
  delete from public.admins where user_id = p_uid;

  -- Torneos: anonimizar display_name en miembros vinculados
  update public.tournament_team_members
  set display_name = v_deleted_label
  where user_id = p_uid;

  -- Canchas: unclaim (premium incluido)
  for v_venue_id in
    select id from public.venues where owner_id = p_uid and deleted_at is null
  loop
    perform private.unclaim_venue_core(v_venue_id);
  end loop;

  -- PII
  delete from public.profile_contacts where user_id = p_uid;

  update public.profiles
  set
    display_name = v_deleted_label,
    avatar_path = null,
    avatar_focus_x = 0.5,
    avatar_focus_y = 0.5,
    avatar_zoom = 1,
    card_share_code = null,
    neighborhood = null,
    birth_date = null,
    gender = null,
    height_cm = null,
    weight_kg = null,
    preferred_foot = null,
    secondary_position = null,
    preferred_days = '{}'::text[],
    preferred_time_slots = '{}'::text[],
    plays_for_pay = false,
    deletion_scheduled_at = null,
    purge_at = null,
    deleted_at = now(),
    updated_at = now()
  where id = p_uid;

  return v_avatar_path;
end;
$$;

revoke all on function private.purge_account(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. RPCs públicas
-- ---------------------------------------------------------------------------
create or replace function public.schedule_own_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_scheduled timestamptz;
  v_purge timestamptz;
  v_admin_count int;
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  select deletion_scheduled_at, purge_at
    into v_scheduled, v_purge
  from public.profiles
  where id = uid and deleted_at is null
  for update;

  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  -- Idempotente: no resetear purge_at si ya está programado
  if v_scheduled is not null and v_purge is not null then
    return;
  end if;

  -- Bloquear si es el único admin de plataforma
  if exists (select 1 from public.admins where user_id = uid) then
    select count(*)::int into v_admin_count from public.admins;
    if v_admin_count = 1 then
      raise exception 'Sos el único administrador de BaFut. Designá otro admin antes de eliminar tu cuenta.';
    end if;
  end if;

  update public.profiles
  set
    deletion_scheduled_at = now(),
    purge_at = now() + interval '30 days',
    updated_at = now()
  where id = uid;
end;
$$;

comment on function public.schedule_own_account_deletion() is
  'Programa eliminación en 30 días. Cuenta usable hasta purge_at. Idempotente si ya programada.';

create or replace function public.cancel_own_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  update public.profiles
  set
    deletion_scheduled_at = null,
    purge_at = null,
    updated_at = now()
  where id = uid
    and deleted_at is null
    and deletion_scheduled_at is not null
    and purge_at is not null
    and purge_at > now();

  if not found then
    raise exception 'No hay una eliminación activa que cancelar, o el plazo ya venció.';
  end if;
end;
$$;

comment on function public.cancel_own_account_deletion() is
  'Cancela eliminación programada durante la gracia (purge_at > now()).';

create or replace function public.purge_due_deleted_accounts()
returns table (user_id uuid, avatar_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_avatar text;
begin
  for v_row in
    select p.id
    from public.profiles p
    where p.deletion_scheduled_at is not null
      and p.deleted_at is null
      and p.purge_at is not null
      and p.purge_at <= now()
    order by p.purge_at
    limit 50
  loop
    v_avatar := private.purge_account(v_row.id);
    if v_avatar is not null or exists (
      select 1 from public.profiles where id = v_row.id and deleted_at is not null
    ) then
      user_id := v_row.id;
      avatar_path := v_avatar;
      return next;
    end if;
  end loop;
end;
$$;

comment on function public.purge_due_deleted_accounts() is
  'Cron: tombstone de cuentas con purge_at vencido. Hasta 50 por corrida. Luego auth.admin.deleteUser en el servidor.';

-- Deprecar hard-delete: wrapper a schedule
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.schedule_own_account_deletion();
end;
$$;

comment on function public.delete_own_account() is
  'Deprecated: programa eliminación con gracia 30 días (alias de schedule_own_account_deletion).';

-- ---------------------------------------------------------------------------
-- 7. Guard feedback post-purge
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
  v_about_deleted timestamptz;
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

  select deleted_at into v_about_deleted from public.profiles where id = v_about;
  if v_about_deleted is not null then
    raise exception 'No se puede evaluar: el jugador eliminó su cuenta.';
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

-- ---------------------------------------------------------------------------
-- 8. Grants
-- ---------------------------------------------------------------------------
revoke all on function public.schedule_own_account_deletion() from public, anon;
revoke all on function public.cancel_own_account_deletion() from public, anon;
revoke all on function public.purge_due_deleted_accounts() from public, anon;

grant execute on function public.schedule_own_account_deletion() to authenticated;
grant execute on function public.cancel_own_account_deletion() to authenticated;
grant execute on function public.purge_due_deleted_accounts() to service_role;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
