-- A2: Solicitud premium con comprobante manual (Nequi/banco) + invoice.
-- Proofs en Storage privado; approve/reject vía RPC (SECURITY DEFINER).

-- ============================================
-- 1. Tabla venue_subscription_requests
-- ============================================
create table if not exists public.venue_subscription_requests (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null default 'premium' check (plan in ('basic', 'premium')),
  payment_method text not null check (payment_method in ('nequi', 'bank_transfer')),
  amount_cop integer not null check (amount_cop > 0),
  payment_reference text check (
    payment_reference is null
    or char_length(btrim(payment_reference)) between 1 and 80
  ),
  proof_path text not null check (char_length(proof_path) between 8 and 400),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reject_reason text check (
    reject_reason is null or char_length(reject_reason) <= 300
  ),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  subscription_id uuid references public.venue_subscriptions(id) on delete set null,
  invoice_number text unique,
  legal_accepted_at timestamptz not null,
  duration_days integer not null default 30 check (duration_days between 1 and 366),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists venue_subscription_requests_one_pending_per_venue_idx
  on public.venue_subscription_requests (venue_id)
  where status = 'pending';

create index if not exists venue_subscription_requests_status_idx
  on public.venue_subscription_requests (status, created_at);

create index if not exists venue_subscription_requests_venue_idx
  on public.venue_subscription_requests (venue_id);

create index if not exists venue_subscription_requests_user_idx
  on public.venue_subscription_requests (user_id);

-- Numeración de facturas: BF-YYYYMM-0001
create sequence if not exists public.venue_invoice_seq start 1 increment 1;

-- ============================================
-- 2. RLS (lectura own/admin; escritura solo RPC)
-- ============================================
alter table public.venue_subscription_requests enable row level security;

drop policy if exists venue_subscription_requests_select on public.venue_subscription_requests;
create policy venue_subscription_requests_select on public.venue_subscription_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select auth.uid()) in (select user_id from public.admins)
    or exists (
      select 1 from public.venues v
      where v.id = venue_subscription_requests.venue_id
        and v.owner_id = (select auth.uid())
    )
  );

revoke insert, update, delete on public.venue_subscription_requests from anon, authenticated;
grant select on public.venue_subscription_requests to authenticated;

-- ============================================
-- 3. Storage privado: comprobantes
--    Ruta: <venue_id>/<uuid>.<ext>
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'venue-subscription-proofs',
  'venue-subscription-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists venue_sub_proofs_select on storage.objects;
create policy venue_sub_proofs_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'venue-subscription-proofs'
    and (
      (select auth.uid()) in (select user_id from public.admins)
      or exists (
        select 1 from public.venues v
        where v.id = (storage.foldername(name))[1]::uuid
          and v.owner_id = (select auth.uid())
      )
    )
  );

drop policy if exists venue_sub_proofs_insert on storage.objects;
create policy venue_sub_proofs_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'venue-subscription-proofs'
    and exists (
      select 1 from public.venues v
      where v.id = (storage.foldername(name))[1]::uuid
        and (
          v.owner_id = (select auth.uid())
          or (select auth.uid()) in (select user_id from public.admins)
        )
    )
  );

drop policy if exists venue_sub_proofs_delete on storage.objects;
create policy venue_sub_proofs_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'venue-subscription-proofs'
    and (
      (select auth.uid()) in (select user_id from public.admins)
      or exists (
        select 1 from public.venues v
        where v.id = (storage.foldername(name))[1]::uuid
          and v.owner_id = (select auth.uid())
      )
    )
  );

-- ============================================
-- 4. RPC: dueño envía solicitud
-- ============================================
create or replace function public.submit_venue_subscription_request(
  p_venue_id uuid,
  p_payment_method text,
  p_amount_cop integer,
  p_proof_path text,
  p_payment_reference text default null,
  p_plan text default 'premium',
  p_duration_days integer default 30
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
  v_active_premium boolean;
  v_id uuid;
  v_method text;
  v_plan text;
  v_ref text;
  v_path text;
begin
  if v_uid is null then
    raise exception 'Entrá con tu cuenta para solicitar Premium.';
  end if;

  select owner_id into v_owner from public.venues where id = p_venue_id;
  if not found then
    raise exception 'Cancha no encontrada.';
  end if;
  if v_owner is distinct from v_uid
     and not exists (select 1 from public.admins where user_id = v_uid) then
    raise exception 'Solo el dueño de la cancha puede solicitar Premium.';
  end if;

  v_method := lower(btrim(coalesce(p_payment_method, '')));
  if v_method not in ('nequi', 'bank_transfer') then
    raise exception 'Método de pago no válido.';
  end if;

  v_plan := lower(btrim(coalesce(p_plan, 'premium')));
  if v_plan not in ('basic', 'premium') then
    raise exception 'Plan no válido.';
  end if;

  if p_amount_cop is null or p_amount_cop <= 0 or p_amount_cop > 50000000 then
    raise exception 'Monto no válido.';
  end if;

  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 366 then
    raise exception 'Duración no válida.';
  end if;

  v_path := btrim(coalesce(p_proof_path, ''));
  if v_path = '' or position('..' in v_path) > 0 then
    raise exception 'Comprobante no válido.';
  end if;
  -- Debe vivir bajo la carpeta de esta cancha
  if split_part(v_path, '/', 1) is distinct from p_venue_id::text then
    raise exception 'La ruta del comprobante no corresponde a esta cancha.';
  end if;

  v_ref := nullif(btrim(coalesce(p_payment_reference, '')), '');

  select exists (
    select 1 from public.venue_subscription_requests
    where venue_id = p_venue_id and status = 'pending'
  ) into v_pending;
  if v_pending then
    raise exception 'Ya hay una solicitud Premium pendiente de revisión.';
  end if;

  select exists (
    select 1 from public.venue_subscriptions
    where venue_id = p_venue_id
      and status = 'active'
      and plan = 'premium'
      and expires_at > now()
  ) into v_active_premium;
  if v_active_premium then
    raise exception 'Esta cancha ya tiene Premium activo.';
  end if;

  insert into public.venue_subscription_requests (
    venue_id,
    user_id,
    plan,
    payment_method,
    amount_cop,
    payment_reference,
    proof_path,
    status,
    legal_accepted_at,
    duration_days
  )
  values (
    p_venue_id,
    v_uid,
    v_plan,
    v_method,
    p_amount_cop,
    v_ref,
    v_path,
    'pending',
    now(),
    p_duration_days
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ============================================
-- 5. RPC: admin aprueba → crea suscripción + invoice
-- ============================================
create or replace function public.approve_venue_subscription_request(
  p_request_id uuid,
  p_duration_days integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_req public.venue_subscription_requests%rowtype;
  v_subscription_id uuid;
  v_days integer;
  v_invoice text;
begin
  if v_uid is null or not exists (select 1 from public.admins where user_id = v_uid) then
    raise exception 'Solo administradores pueden aprobar solicitudes Premium.';
  end if;

  select * into v_req
  from public.venue_subscription_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada.';
  end if;
  if v_req.status is distinct from 'pending' then
    raise exception 'Esta solicitud ya fue revisada.';
  end if;

  v_days := coalesce(p_duration_days, v_req.duration_days, 30);
  if v_days < 1 or v_days > 366 then
    raise exception 'Duración no válida.';
  end if;

  -- Reutilizar la misma semántica que create_venue_subscription
  insert into public.venue_subscriptions (
    venue_id,
    plan,
    started_at,
    expires_at,
    payment_method,
    status
  )
  values (
    v_req.venue_id,
    v_req.plan,
    now(),
    now() + (v_days || ' days')::interval,
    v_req.payment_method,
    'active'
  )
  returning id into v_subscription_id;

  update public.venues
  set is_verified = true
  where id = v_req.venue_id;

  v_invoice :=
    'BF-' || to_char(now() at time zone 'America/Bogota', 'YYYYMM')
    || '-' || lpad(nextval('public.venue_invoice_seq')::text, 4, '0');

  update public.venue_subscription_requests
  set
    status = 'approved',
    reviewed_by = v_uid,
    reviewed_at = now(),
    subscription_id = v_subscription_id,
    invoice_number = v_invoice,
    duration_days = v_days,
    updated_at = now()
  where id = p_request_id;

  return v_subscription_id;
end;
$$;

-- ============================================
-- 6. RPC: admin rechaza
-- ============================================
create or replace function public.reject_venue_subscription_request(
  p_request_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_status text;
  v_reason text;
begin
  if v_uid is null or not exists (select 1 from public.admins where user_id = v_uid) then
    raise exception 'Solo administradores pueden rechazar solicitudes Premium.';
  end if;

  select status into v_status
  from public.venue_subscription_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada.';
  end if;
  if v_status is distinct from 'pending' then
    raise exception 'Esta solicitud ya fue revisada.';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is not null and char_length(v_reason) > 300 then
    raise exception 'El motivo es demasiado largo.';
  end if;

  update public.venue_subscription_requests
  set
    status = 'rejected',
    reject_reason = v_reason,
    reviewed_by = v_uid,
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;
end;
$$;

-- ============================================
-- 7. Grants
-- ============================================
revoke all on function public.submit_venue_subscription_request(uuid, text, integer, text, text, text, integer)
  from public, anon;
revoke all on function public.approve_venue_subscription_request(uuid, integer)
  from public, anon;
revoke all on function public.reject_venue_subscription_request(uuid, text)
  from public, anon;

grant execute on function public.submit_venue_subscription_request(uuid, text, integer, text, text, text, integer)
  to authenticated;
grant execute on function public.approve_venue_subscription_request(uuid, integer)
  to authenticated;
grant execute on function public.reject_venue_subscription_request(uuid, text)
  to authenticated;
