-- e-ops: expirar suscripciones vencidas + soft-delete de canchas.

-- ============================================
-- 1. Soft-delete: deleted_at en venues
-- ============================================
alter table public.venues
  add column if not exists deleted_at timestamptz;

comment on column public.venues.deleted_at is
  'Soft-delete: ocultar del directorio público. Claims/subs/fotos se retienen.';

create index if not exists venues_not_deleted_idx
  on public.venues (city_id, neighborhood, name)
  where deleted_at is null;

-- Listados públicos: solo canchas vivas. Admins ven también las soft-deleted.
drop policy if exists venues_select on public.venues;
create policy venues_select on public.venues
  for select to anon, authenticated
  using (
    deleted_at is null
    or exists (
      select 1 from public.admins a
      where a.user_id = (select auth.uid())
    )
  );

-- ============================================
-- 2. delete_venue → soft-delete (no hard delete)
-- ============================================
create or replace function public.delete_venue(p_venue_id uuid)
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
  if not public.admin_has_role(array['super']::text[], v_uid) then
    raise exception 'Solo administradores de BaFut pueden eliminar canchas.';
  end if;
  if not exists (
    select 1 from public.venues
    where id = p_venue_id and deleted_at is null
  ) then
    raise exception 'Cancha no encontrada.';
  end if;

  update public.venues
  set deleted_at = now()
  where id = p_venue_id
    and deleted_at is null;

  perform private.log_admin_action(
    'soft_delete_venue',
    'venue',
    p_venue_id,
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.delete_venue(uuid) from public, anon;
grant execute on function public.delete_venue(uuid) to authenticated;

-- ============================================
-- 3. Expirar suscripciones active → expired
-- ============================================
create or replace function public.expire_venue_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.venue_subscriptions
  set
    status = 'expired',
    updated_at = now()
  where status = 'active'
    and expires_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.expire_venue_subscriptions() is
  'Cron diario: marca suscripciones active con expires_at < now() como expired. Gate HTTP: CRON_SECRET.';

revoke all on function public.expire_venue_subscriptions() from public;
grant execute on function public.expire_venue_subscriptions() to anon, authenticated, service_role;
