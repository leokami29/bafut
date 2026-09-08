-- Copy Colombia: "seña" → "abono" en mensajes visibles del RPC de deposit %.

create or replace function public.set_venue_booking_deposit_pct(
  p_venue_id uuid,
  p_deposit_pct integer
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_venue_id is null or p_deposit_pct is null then
    raise exception 'Datos incompletos';
  end if;
  if p_deposit_pct not in (30, 50, 70, 100) then
    raise exception 'El abono debe ser 30%%, 50%%, 70%% o 100%%.';
  end if;

  select owner_id into v_owner
  from public.venues
  where id = p_venue_id
    and deleted_at is null;

  if not found then
    raise exception 'Cancha no encontrada.';
  end if;

  if v_owner is distinct from v_uid and not public.is_admin(v_uid) then
    raise exception 'Solo el dueño o un admin pueden cambiar este ajuste.';
  end if;

  update public.venues
  set booking_deposit_pct = p_deposit_pct
  where id = p_venue_id;
end;
$fn$;

comment on column public.venues.booking_deposit_pct is
  'Porcentaje de abono al reservar (30/50/70/100). 100 = pago completo del alquiler.';

comment on column public.venue_bookings.deposit_pct is
  'Porcentaje de abono al momento del pedido (snapshot del venue).';

comment on column public.venue_bookings.deposit_cop is
  'Abono en COP: round(final_cop * deposit_pct / 100).';
