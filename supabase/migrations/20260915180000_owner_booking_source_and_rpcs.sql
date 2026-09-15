-- Owner writes: source player|owner|block + RPCs create_owner_venue_booking / create_venue_block

alter table public.venue_bookings
  add column if not exists source text not null default 'player';

alter table public.venue_bookings
  drop constraint if exists venue_bookings_source_check;

alter table public.venue_bookings
  add constraint venue_bookings_source_check
  check (source in ('player', 'owner', 'block'));

comment on column public.venue_bookings.source is
  'player = reserva web; owner = alta manual dueño; block = bloqueo de franja.';

alter table public.venue_bookings
  drop constraint if exists venue_bookings_whatsapp_check;

alter table public.venue_bookings
  add constraint venue_bookings_whatsapp_check
  check (
    contact_whatsapp is null
    or contact_whatsapp ~ '^573[0-9]{9}$'
  );

create or replace function public.list_venue_day_occupancy(
  p_venue_id uuid,
  p_day_start timestamptz,
  p_day_end timestamptz,
  p_exclude_match_id uuid default null,
  p_exclude_booking_id uuid default null
)
returns table (
  kind text,
  match_id uuid,
  share_code text,
  starts_at timestamptz,
  duration_min integer,
  sport text,
  format text,
  open_slot_count integer,
  has_side_b boolean
)
language sql
stable
security invoker
set search_path = public
as $fn$
  select * from (
    select
      'match'::text as kind,
      m.id as match_id,
      m.share_code,
      m.starts_at,
      m.duration_min,
      m.sport,
      m.format,
      (
        select count(*)::int
        from public.match_slots s
        where s.match_id = m.id
          and not exists (
            select 1 from public.slot_claims c
            where c.slot_id = s.id and c.status = 'accepted'
          )
      ) as open_slot_count,
      (m.away_opened_by is not null) as has_side_b
    from public.matches m
    where m.venue_id = p_venue_id
      and m.status = 'open'
      and (p_exclude_match_id is null or m.id <> p_exclude_match_id)
      and p_day_start is not null
      and p_day_end is not null
      and p_day_end > p_day_start
      and m.starts_at >= p_day_start
      and m.starts_at < p_day_end

    union all

    select
      'booking'::text as kind,
      b.id as match_id,
      null::text as share_code,
      b.starts_at,
      b.duration_min,
      b.sport,
      null::text as format,
      0 as open_slot_count,
      true as has_side_b
    from public.venue_bookings b
    where b.venue_id = p_venue_id
      and b.status in ('hold', 'pending', 'confirmed')
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
      and p_day_start is not null
      and p_day_end is not null
      and p_day_end > p_day_start
      and b.starts_at >= p_day_start
      and b.starts_at < p_day_end
  ) u
  order by u.starts_at, u.kind, u.match_id;
$fn$;

create or replace function public.create_owner_venue_booking(
  p_venue_id uuid,
  p_sport text,
  p_starts_at timestamptz,
  p_duration_min integer,
  p_final_cop integer default 0,
  p_contact_whatsapp text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_id uuid;
  v_wa text := nullif(btrim(coalesce(p_contact_whatsapp, '')), '');
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_uid is null then
    raise exception 'Entrá con tu cuenta.';
  end if;

  select owner_id into v_owner
  from public.venues
  where id = p_venue_id and deleted_at is null;

  if not found then
    raise exception 'Cancha no encontrada.';
  end if;

  if not (public.is_admin() or v_owner = v_uid) then
    raise exception 'No tenés permiso para cargar reservas en esta cancha.';
  end if;

  if p_sport is null or p_sport not in ('futbol', 'futbol_sala', 'basquet', 'voleibol', 'padel') then
    raise exception 'Deporte no válido.';
  end if;

  if p_duration_min is null or p_duration_min not in (30, 60, 90) then
    raise exception 'Duración no válida.';
  end if;

  if p_starts_at is null then
    raise exception 'Fecha/hora requerida.';
  end if;

  if p_final_cop is null or p_final_cop < 0 then
    raise exception 'Monto inválido.';
  end if;

  if v_wa is not null and v_wa !~ '^573[0-9]{9}$' then
    raise exception 'WhatsApp inválido (573XXXXXXXXX).';
  end if;

  if v_note is not null and char_length(v_note) > 300 then
    raise exception 'Nota demasiado larga.';
  end if;

  perform private.assert_venue_slot_free(
    p_venue_id,
    tstzrange(p_starts_at, p_starts_at + make_interval(mins => p_duration_min), '[)'),
    null,
    null
  );

  insert into public.venue_bookings (
    venue_id,
    player_id,
    sport,
    starts_at,
    duration_min,
    occupy_range,
    status,
    source,
    payment_method,
    proof_path,
    base_cop,
    discount_cop,
    final_cop,
    deposit_pct,
    deposit_cop,
    billed_min,
    contact_whatsapp,
    note,
    legal_accepted_at
  ) values (
    p_venue_id,
    v_uid,
    p_sport,
    p_starts_at,
    p_duration_min,
    tstzrange(p_starts_at, p_starts_at + make_interval(mins => p_duration_min), '[)'),
    'confirmed',
    'owner',
    null,
    null,
    coalesce(p_final_cop, 0),
    0,
    coalesce(p_final_cop, 0),
    100,
    coalesce(p_final_cop, 0),
    p_duration_min,
    v_wa,
    v_note,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$fn$;

revoke all on function public.create_owner_venue_booking(uuid, text, timestamptz, integer, integer, text, text)
  from public, anon;
grant execute on function public.create_owner_venue_booking(uuid, text, timestamptz, integer, integer, text, text)
  to authenticated;

create or replace function public.create_venue_block(
  p_venue_id uuid,
  p_sport text,
  p_starts_at timestamptz,
  p_duration_min integer,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_id uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_uid is null then
    raise exception 'Entrá con tu cuenta.';
  end if;

  select owner_id into v_owner
  from public.venues
  where id = p_venue_id and deleted_at is null;

  if not found then
    raise exception 'Cancha no encontrada.';
  end if;

  if not (public.is_admin() or v_owner = v_uid) then
    raise exception 'No tenés permiso para bloquear franjas en esta cancha.';
  end if;

  if p_sport is null or p_sport not in ('futbol', 'futbol_sala', 'basquet', 'voleibol', 'padel') then
    raise exception 'Deporte no válido.';
  end if;

  if p_duration_min is null or p_duration_min not in (30, 60, 90) then
    raise exception 'Duración no válida.';
  end if;

  if p_starts_at is null then
    raise exception 'Fecha/hora requerida.';
  end if;

  if v_note is not null and char_length(v_note) > 300 then
    raise exception 'Nota demasiado larga.';
  end if;

  perform private.assert_venue_slot_free(
    p_venue_id,
    tstzrange(p_starts_at, p_starts_at + make_interval(mins => p_duration_min), '[)'),
    null,
    null
  );

  insert into public.venue_bookings (
    venue_id,
    player_id,
    sport,
    starts_at,
    duration_min,
    occupy_range,
    status,
    source,
    payment_method,
    proof_path,
    base_cop,
    discount_cop,
    final_cop,
    deposit_pct,
    deposit_cop,
    billed_min,
    contact_whatsapp,
    note,
    legal_accepted_at
  ) values (
    p_venue_id,
    v_uid,
    p_sport,
    p_starts_at,
    p_duration_min,
    tstzrange(p_starts_at, p_starts_at + make_interval(mins => p_duration_min), '[)'),
    'confirmed',
    'block',
    null,
    null,
    0,
    0,
    0,
    100,
    0,
    p_duration_min,
    null,
    coalesce(v_note, 'Bloqueo'),
    now()
  )
  returning id into v_id;

  return v_id;
end;
$fn$;

revoke all on function public.create_venue_block(uuid, text, timestamptz, integer, text)
  from public, anon;
grant execute on function public.create_venue_block(uuid, text, timestamptz, integer, text)
  to authenticated;
