-- Soft hold ~8 min al entrar al pago (status=hold), ocupa franja vía GiST.
-- Al enviar comprobante: hold → pending (hold dueño 4h). Cron expira hold y pending.

-- =============================================================================
-- 1. Schema: status hold + columnas de pago opcionales en hold
-- =============================================================================

alter table public.venue_bookings
  drop constraint if exists venue_bookings_status_check;

alter table public.venue_bookings
  add constraint venue_bookings_status_check
  check (status in ('hold', 'pending', 'confirmed', 'rejected', 'cancelled', 'expired'));

alter table public.venue_bookings
  drop constraint if exists venue_bookings_hold_pending_check;

alter table public.venue_bookings
  add constraint venue_bookings_hold_pending_check
  check (
    (status in ('hold', 'pending') and hold_expires_at is not null)
    or (status not in ('hold', 'pending'))
  );

alter table public.venue_bookings
  alter column payment_method drop not null,
  alter column proof_path drop not null,
  alter column contact_whatsapp drop not null,
  alter column legal_accepted_at drop not null;

alter table public.venue_bookings
  drop constraint if exists venue_bookings_payment_method_check;

alter table public.venue_bookings
  add constraint venue_bookings_payment_method_check
  check (
    payment_method is null
    or payment_method in ('nequi', 'bank_transfer')
  );

alter table public.venue_bookings
  drop constraint if exists venue_bookings_proof_path_len_check;

alter table public.venue_bookings
  add constraint venue_bookings_proof_path_len_check
  check (
    proof_path is null
    or char_length(proof_path) between 8 and 400
  );

alter table public.venue_bookings
  drop constraint if exists venue_bookings_whatsapp_check;

alter table public.venue_bookings
  add constraint venue_bookings_whatsapp_check
  check (
    contact_whatsapp is null
    or contact_whatsapp ~ '^573[0-9]{9}$'
  );

alter table public.venue_bookings
  drop constraint if exists venue_bookings_hold_payment_shape_check;

alter table public.venue_bookings
  add constraint venue_bookings_hold_payment_shape_check
  check (
    (
      status = 'hold'
      and payment_method is null
      and proof_path is null
      and contact_whatsapp is null
      and legal_accepted_at is null
    )
    or (
      status <> 'hold'
      and payment_method is not null
      and proof_path is not null
      and contact_whatsapp is not null
      and legal_accepted_at is not null
    )
  );

alter table public.venue_bookings drop constraint if exists venue_bookings_venue_occupy_excl;
alter table public.venue_bookings
  add constraint venue_bookings_venue_occupy_excl
  exclude using gist (
    venue_id with =,
    occupy_range with &&
  )
  where (status in ('hold', 'pending', 'confirmed'));

drop index if exists public.venue_bookings_one_pending_per_player_venue_idx;
create unique index venue_bookings_one_active_per_player_venue_idx
  on public.venue_bookings (player_id, venue_id)
  where status in ('hold', 'pending');

drop index if exists public.venue_bookings_hold_expires_idx;
create index venue_bookings_hold_expires_idx
  on public.venue_bookings (hold_expires_at)
  where status in ('hold', 'pending');

alter table public.venue_booking_events
  drop constraint if exists venue_booking_events_to_status_check;

alter table public.venue_booking_events
  add constraint venue_booking_events_to_status_check
  check (to_status in ('hold', 'pending', 'confirmed', 'rejected', 'cancelled', 'expired'));

-- =============================================================================
-- 2. Ocupación: incluir hold
-- =============================================================================

create or replace function private.assert_venue_slot_free(
  p_venue_id uuid,
  p_range tstzrange,
  p_ignore_booking_id uuid default null,
  p_ignore_match_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_share text;
begin
  if p_venue_id is null or p_range is null or isempty(p_range) then
    raise exception 'Franja inválida.';
  end if;

  select m.share_code into v_share
  from public.matches m
  where m.venue_id = p_venue_id
    and m.status = 'open'
    and (p_ignore_match_id is null or m.id is distinct from p_ignore_match_id)
    and m.occupy_range && p_range
  order by m.starts_at, m.id
  limit 1;

  if v_share is not null then
    raise exception 'OCCUPANCY:%', v_share;
  end if;

  if exists (
    select 1
    from public.venue_bookings b
    where b.venue_id = p_venue_id
      and b.status in ('hold', 'pending', 'confirmed')
      and (p_ignore_booking_id is null or b.id is distinct from p_ignore_booking_id)
      and b.occupy_range && p_range
  ) then
    raise exception 'Esa franja ya tiene una reserva pedida o confirmada. Elegí otra hora.';
  end if;
end;
$fn$;

create or replace function public.lookup_venue_occupancy(
  p_venue_id uuid,
  p_starts_at timestamptz,
  p_duration_min integer,
  p_exclude_match_id uuid default null,
  p_exclude_booking_id uuid default null
)
returns table (
  kind text,
  match_id uuid,
  share_code text,
  host_id uuid,
  starts_at timestamptz,
  duration_min integer,
  venue_id uuid,
  venue_name text,
  away_opened_by uuid,
  open_slot_count integer,
  has_side_b boolean,
  sport text,
  format text
)
language sql
stable
security invoker
set search_path = public
as $fn$
  (
    select
      'match'::text as kind,
      m.id as match_id,
      m.share_code,
      m.host_id,
      m.starts_at,
      m.duration_min,
      m.venue_id,
      v.name as venue_name,
      m.away_opened_by,
      (
        select count(*)::int
        from public.match_slots s
        where s.match_id = m.id
          and not exists (
            select 1 from public.slot_claims c
            where c.slot_id = s.id and c.status = 'accepted'
          )
      ) as open_slot_count,
      (m.away_opened_by is not null) as has_side_b,
      m.sport,
      m.format
    from public.matches m
    join public.venues v on v.id = m.venue_id
    where m.venue_id = p_venue_id
      and m.status = 'open'
      and (p_exclude_match_id is null or m.id <> p_exclude_match_id)
      and p_starts_at is not null
      and p_duration_min in (30, 60, 90)
      and m.occupy_range && tstzrange(
        p_starts_at,
        p_starts_at + make_interval(mins => p_duration_min),
        '[)'
      )
    order by m.starts_at, m.id
    limit 1
  )
  union all
  (
    select
      'booking'::text as kind,
      b.id as match_id,
      null::text as share_code,
      null::uuid as host_id,
      b.starts_at,
      b.duration_min,
      b.venue_id,
      v.name as venue_name,
      null::uuid as away_opened_by,
      0 as open_slot_count,
      true as has_side_b,
      b.sport,
      null::text as format
    from public.venue_bookings b
    join public.venues v on v.id = b.venue_id
    where b.venue_id = p_venue_id
      and b.status in ('hold', 'pending', 'confirmed')
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
      and p_starts_at is not null
      and p_duration_min in (30, 60, 90)
      and b.occupy_range && tstzrange(
        p_starts_at,
        p_starts_at + make_interval(mins => p_duration_min),
        '[)'
      )
      and not exists (
        select 1
        from public.matches m
        where m.venue_id = p_venue_id
          and m.status = 'open'
          and (p_exclude_match_id is null or m.id <> p_exclude_match_id)
          and m.occupy_range && tstzrange(
            p_starts_at,
            p_starts_at + make_interval(mins => p_duration_min),
            '[)'
          )
      )
    order by b.starts_at, b.id
    limit 1
  )
  limit 1;
$fn$;

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

-- =============================================================================
-- 3. start / release soft hold
-- =============================================================================

create or replace function public.start_venue_booking_hold(
  p_venue_id uuid,
  p_sport text,
  p_starts_at timestamptz,
  p_duration_min integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_venue record;
  v_tz text;
  v_flag boolean;
  v_price jsonb;
  v_errors text[];
  v_final int;
  v_deposit_pct int;
  v_deposit_cop int;
  v_range tstzrange;
  v_id uuid;
  v_expires timestamptz;
  v_existing uuid;
begin
  if v_uid is null then
    raise exception 'Entrá con tu cuenta para reservar.';
  end if;

  select enabled into v_flag
  from public.feature_flags
  where key = 'venue_booking';

  if coalesce(v_flag, false) is not true then
    raise exception 'Las reservas no están disponibles ahora.';
  end if;

  if p_venue_id is null or p_starts_at is null then
    raise exception 'Datos incompletos';
  end if;

  select
    v.id,
    v.owner_id,
    v.booking_enabled,
    v.booking_deposit_pct,
    v.sports,
    v.deleted_at,
    c.timezone
  into v_venue
  from public.venues v
  join public.cities c on c.id = v.city_id
  where v.id = p_venue_id;

  if not found or v_venue.deleted_at is not null then
    raise exception 'Cancha no encontrada.';
  end if;
  if v_venue.owner_id is null or not v_venue.booking_enabled then
    raise exception 'Esta cancha no acepta reservas.';
  end if;

  if p_sport is null or p_sport not in ('futbol', 'futbol_sala', 'basquet', 'voleibol', 'padel') then
    raise exception 'Elige un deporte válido.';
  end if;
  if v_venue.sports is null or not (p_sport = any (v_venue.sports)) then
    raise exception 'Esa cancha no ofrece ese deporte.';
  end if;

  if p_duration_min not in (30, 60, 90) then
    raise exception 'La duración debe ser 30, 60 o 90 minutos.';
  end if;

  if p_starts_at < now() + interval '2 hours' then
    raise exception 'Pedí la reserva con al menos 2 horas de anticipación.';
  end if;
  if p_starts_at > now() + interval '14 days' then
    raise exception 'Solo se pueden pedir reservas hasta 14 días adelante.';
  end if;

  v_tz := v_venue.timezone;
  if (p_starts_at at time zone v_tz) < ((now() at time zone v_tz) + interval '2 hours') then
    raise exception 'Pedí la reserva con al menos 2 horas de anticipación.';
  end if;

  -- Liberar hold previo del mismo jugador en esta cancha (o reutilizar si misma franja).
  select id into v_existing
  from public.venue_bookings
  where player_id = v_uid
    and venue_id = p_venue_id
    and status = 'hold'
  for update;

  if v_existing is not null then
    update public.venue_bookings
    set
      status = 'cancelled',
      hold_expires_at = null,
      updated_at = now()
    where id = v_existing;

    perform private.log_venue_booking_event(
      v_existing,
      'hold',
      'cancelled',
      v_uid,
      jsonb_build_object('source', 'replace_hold')
    );
  end if;

  if exists (
    select 1
    from public.venue_bookings b
    where b.player_id = v_uid
      and b.venue_id = p_venue_id
      and b.status = 'pending'
  ) then
    raise exception 'Ya tenés una reserva pendiente en esta cancha.';
  end if;

  perform private.assert_rate_limit(
    'venue_booking_hold',
    v_uid,
    20,
    interval '1 hour',
    'Demasiados intentos de apartar horario. Esperá un rato.'
  );

  v_price := public.preview_match_price(p_venue_id, p_sport, p_starts_at, p_duration_min);
  if coalesce(jsonb_array_length(v_price->'errors'), 0) > 0 then
    v_errors := coalesce(
      (
        select array_agg(x)
        from jsonb_array_elements_text(coalesce(v_price->'errors', '[]'::jsonb)) as t(x)
      ),
      '{}'::text[]
    );
    raise exception 'No hay tarifa usable para ese deporte/horario: %',
      array_to_string(v_errors, '; ');
  end if;

  v_final := nullif(v_price->>'final_cop', '')::int;
  if v_final is null or v_final < 0 then
    raise exception 'No hay tarifa usable para ese deporte/horario.';
  end if;

  v_deposit_pct := coalesce(v_venue.booking_deposit_pct, 100);
  if v_deposit_pct not in (30, 50, 70, 100) then
    v_deposit_pct := 100;
  end if;
  v_deposit_cop := round((v_final::numeric * v_deposit_pct::numeric) / 100.0)::int;

  v_range := tstzrange(
    p_starts_at,
    p_starts_at + make_interval(mins => p_duration_min),
    '[)'
  );
  v_expires := now() + interval '8 minutes';

  perform private.lock_venue_slot(p_venue_id);
  perform private.assert_venue_slot_free(p_venue_id, v_range, null, null);

  begin
    insert into public.venue_bookings (
      venue_id,
      player_id,
      sport,
      starts_at,
      duration_min,
      occupy_range,
      status,
      payment_method,
      proof_path,
      base_cop,
      discount_cop,
      final_cop,
      deposit_pct,
      deposit_cop,
      amount_cop,
      promo_id,
      billed_min,
      currency,
      contact_whatsapp,
      legal_accepted_at,
      note,
      hold_expires_at
    )
    values (
      p_venue_id,
      v_uid,
      p_sport,
      p_starts_at,
      p_duration_min,
      v_range,
      'hold',
      null,
      null,
      coalesce((v_price->>'base_cop')::int, 0),
      coalesce((v_price->>'discount_cop')::int, 0),
      v_final,
      v_deposit_pct,
      v_deposit_cop,
      v_deposit_cop,
      nullif(v_price->>'promo_id', '')::uuid,
      coalesce((v_price->>'billed_min')::int, p_duration_min),
      'COP',
      null,
      null,
      null,
      v_expires
    )
    returning id into v_id;
  exception
    when unique_violation then
      raise exception 'Ya tenés una reserva pendiente en esta cancha.';
    when exclusion_violation then
      raise exception 'Esa franja ya tiene una reserva pedida o confirmada. Elegí otra hora.';
  end;

  perform private.log_venue_booking_event(
    v_id,
    null,
    'hold',
    v_uid,
    jsonb_build_object(
      'final_cop', v_final,
      'deposit_cop', v_deposit_cop,
      'soft_hold_minutes', 8
    )
  );

  return jsonb_build_object(
    'hold_id', v_id,
    'hold_expires_at', v_expires,
    'final_cop', v_final,
    'deposit_cop', v_deposit_cop,
    'deposit_pct', v_deposit_pct
  );
end;
$fn$;

revoke all on function public.start_venue_booking_hold(uuid, text, timestamptz, integer) from public, anon;
grant execute on function public.start_venue_booking_hold(uuid, text, timestamptz, integer) to authenticated;

create or replace function public.release_venue_booking_hold(p_hold_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_row public.venue_bookings%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_hold_id is null then
    raise exception 'Datos incompletos';
  end if;

  select * into v_row
  from public.venue_bookings
  where id = p_hold_id
  for update;

  if not found then
    return;
  end if;
  if v_row.player_id is distinct from v_uid and not public.is_admin(v_uid) then
    raise exception 'No podés liberar este apartamento.';
  end if;
  if v_row.status is distinct from 'hold' then
    return;
  end if;

  update public.venue_bookings
  set
    status = 'cancelled',
    hold_expires_at = null,
    updated_at = now()
  where id = p_hold_id;

  perform private.log_venue_booking_event(
    p_hold_id,
    'hold',
    'cancelled',
    v_uid,
    jsonb_build_object('source', 'release_hold')
  );
end;
$fn$;

revoke all on function public.release_venue_booking_hold(uuid) from public, anon;
grant execute on function public.release_venue_booking_hold(uuid) to authenticated;

-- =============================================================================
-- 4. submit: convertir hold → pending (o insert legacy sin hold)
-- =============================================================================

drop function if exists public.submit_venue_booking(
  uuid, text, timestamptz, integer, text, text, text, text, integer, integer
);

create or replace function public.submit_venue_booking(
  p_venue_id uuid,
  p_sport text,
  p_starts_at timestamptz,
  p_duration_min integer,
  p_payment_method text,
  p_proof_path text,
  p_contact_whatsapp text,
  p_note text default null,
  p_expected_deposit_cop integer default null,
  p_expected_final_cop integer default null,
  p_hold_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_venue record;
  v_tz text;
  v_flag boolean;
  v_method text;
  v_wa text;
  v_path text;
  v_note text;
  v_price jsonb;
  v_errors text[];
  v_final int;
  v_deposit_pct int;
  v_deposit_cop int;
  v_range tstzrange;
  v_id uuid;
  v_prefix text;
  v_hold public.venue_bookings%rowtype;
begin
  if v_uid is null then
    raise exception 'Entrá con tu cuenta para pedir un turno.';
  end if;

  select enabled into v_flag
  from public.feature_flags
  where key = 'venue_booking';

  if coalesce(v_flag, false) is not true then
    raise exception 'Las reservas no están disponibles ahora.';
  end if;

  if p_venue_id is null or p_starts_at is null then
    raise exception 'Datos incompletos';
  end if;

  if p_expected_deposit_cop is null or p_expected_final_cop is null then
    raise exception 'Datos incompletos';
  end if;
  if p_expected_deposit_cop < 0 or p_expected_final_cop < 0 then
    raise exception 'Datos incompletos';
  end if;

  select
    v.id,
    v.owner_id,
    v.booking_enabled,
    v.booking_deposit_pct,
    v.sports,
    v.deleted_at,
    c.timezone
  into v_venue
  from public.venues v
  join public.cities c on c.id = v.city_id
  where v.id = p_venue_id;

  if not found or v_venue.deleted_at is not null then
    raise exception 'Cancha no encontrada.';
  end if;
  if v_venue.owner_id is null then
    raise exception 'Esta cancha todavía no acepta reservas.';
  end if;
  if not v_venue.booking_enabled then
    raise exception 'Esta cancha dejó de aceptar reservas.';
  end if;

  if p_sport is null or p_sport not in ('futbol', 'futbol_sala', 'basquet', 'voleibol', 'padel') then
    raise exception 'Elige un deporte válido.';
  end if;
  if v_venue.sports is null or not (p_sport = any (v_venue.sports)) then
    raise exception 'Esa cancha no ofrece ese deporte.';
  end if;

  if p_duration_min not in (30, 60, 90) then
    raise exception 'La duración debe ser 30, 60 o 90 minutos.';
  end if;

  if p_starts_at < now() + interval '2 hours' then
    raise exception 'Pedí la reserva con al menos 2 horas de anticipación.';
  end if;
  if p_starts_at > now() + interval '14 days' then
    raise exception 'Solo se pueden pedir reservas hasta 14 días adelante.';
  end if;

  v_tz := v_venue.timezone;
  if (p_starts_at at time zone v_tz) < ((now() at time zone v_tz) + interval '2 hours') then
    raise exception 'Pedí la reserva con al menos 2 horas de anticipación.';
  end if;

  v_method := lower(btrim(coalesce(p_payment_method, '')));
  if v_method not in ('nequi', 'bank_transfer') then
    raise exception 'Método de pago no válido.';
  end if;

  v_wa := btrim(coalesce(p_contact_whatsapp, ''));
  if v_wa !~ '^573[0-9]{9}$' then
    raise exception 'WhatsApp inválido. Usá formato 573XXXXXXXXX.';
  end if;

  v_path := btrim(coalesce(p_proof_path, ''));
  if v_path = '' or position('..' in v_path) > 0 then
    raise exception 'Comprobante no válido.';
  end if;
  v_prefix := p_venue_id::text || '/' || v_uid::text || '/';
  if left(v_path, length(v_prefix)) is distinct from v_prefix then
    raise exception 'La ruta del comprobante no corresponde a esta cancha y usuario.';
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');
  if v_note is not null and char_length(v_note) > 300 then
    raise exception 'La nota es demasiado larga (máx. 300).';
  end if;

  perform private.assert_rate_limit(
    'venue_booking_submit',
    v_uid,
    5,
    interval '1 hour',
    'Demasiados pedidos de reserva. Esperá un rato.'
  );

  v_price := public.preview_match_price(p_venue_id, p_sport, p_starts_at, p_duration_min);
  v_errors := coalesce(
    (
      select array_agg(x)
      from jsonb_array_elements_text(coalesce(v_price->'errors', '[]'::jsonb)) as t(x)
    ),
    '{}'::text[]
  );
  if coalesce(jsonb_array_length(v_price->'errors'), 0) > 0 then
    raise exception 'No hay tarifa usable para ese deporte/horario: %',
      array_to_string(v_errors, '; ');
  end if;

  v_final := nullif(v_price->>'final_cop', '')::int;
  if v_final is null or v_final < 0 then
    raise exception 'No hay tarifa usable para ese deporte/horario.';
  end if;

  v_deposit_pct := coalesce(v_venue.booking_deposit_pct, 100);
  if v_deposit_pct not in (30, 50, 70, 100) then
    v_deposit_pct := 100;
  end if;
  v_deposit_cop := round((v_final::numeric * v_deposit_pct::numeric) / 100.0)::int;

  if p_expected_final_cop is distinct from v_final
     or p_expected_deposit_cop is distinct from v_deposit_cop then
    raise exception 'BOOKING_PRICE_CHANGED:%:%', v_final, v_deposit_cop;
  end if;

  v_range := tstzrange(
    p_starts_at,
    p_starts_at + make_interval(mins => p_duration_min),
    '[)'
  );

  if p_hold_id is not null then
    select * into v_hold
    from public.venue_bookings
    where id = p_hold_id
    for update;

    if not found or v_hold.status is distinct from 'hold' then
      raise exception 'BOOKING_HOLD_EXPIRED';
    end if;
    if v_hold.player_id is distinct from v_uid then
      raise exception 'No podés usar este apartamento.';
    end if;
    if v_hold.venue_id is distinct from p_venue_id
       or v_hold.sport is distinct from p_sport
       or v_hold.starts_at is distinct from p_starts_at
       or v_hold.duration_min is distinct from p_duration_min then
      raise exception 'BOOKING_HOLD_EXPIRED';
    end if;
    if v_hold.hold_expires_at is null or v_hold.hold_expires_at < now() then
      update public.venue_bookings
      set status = 'expired', hold_expires_at = null, updated_at = now()
      where id = p_hold_id;
      perform private.log_venue_booking_event(
        p_hold_id, 'hold', 'expired', v_uid,
        jsonb_build_object('source', 'submit_expired')
      );
      raise exception 'BOOKING_HOLD_EXPIRED';
    end if;

    perform private.lock_venue_slot(p_venue_id);
    perform private.assert_venue_slot_free(p_venue_id, v_range, p_hold_id, null);

    update public.venue_bookings
    set
      status = 'pending',
      payment_method = v_method,
      proof_path = v_path,
      contact_whatsapp = v_wa,
      legal_accepted_at = now(),
      note = v_note,
      base_cop = coalesce((v_price->>'base_cop')::int, 0),
      discount_cop = coalesce((v_price->>'discount_cop')::int, 0),
      final_cop = v_final,
      deposit_pct = v_deposit_pct,
      deposit_cop = v_deposit_cop,
      amount_cop = v_deposit_cop,
      promo_id = nullif(v_price->>'promo_id', '')::uuid,
      billed_min = coalesce((v_price->>'billed_min')::int, p_duration_min),
      hold_expires_at = now() + interval '4 hours',
      updated_at = now()
    where id = p_hold_id
    returning id into v_id;

    perform private.log_venue_booking_event(
      v_id,
      'hold',
      'pending',
      v_uid,
      jsonb_build_object(
        'payment_method', v_method,
        'final_cop', v_final,
        'deposit_pct', v_deposit_pct,
        'deposit_cop', v_deposit_cop,
        'amount_cop', v_deposit_cop
      )
    );

    return v_id;
  end if;

  perform private.lock_venue_slot(p_venue_id);
  perform private.assert_venue_slot_free(p_venue_id, v_range, null, null);

  begin
    insert into public.venue_bookings (
      venue_id, player_id, sport, starts_at, duration_min, occupy_range, status,
      payment_method, proof_path, base_cop, discount_cop, final_cop,
      deposit_pct, deposit_cop, amount_cop, promo_id, billed_min, currency,
      contact_whatsapp, legal_accepted_at, note, hold_expires_at
    )
    values (
      p_venue_id, v_uid, p_sport, p_starts_at, p_duration_min, v_range, 'pending',
      v_method, v_path,
      coalesce((v_price->>'base_cop')::int, 0),
      coalesce((v_price->>'discount_cop')::int, 0),
      v_final, v_deposit_pct, v_deposit_cop, v_deposit_cop,
      nullif(v_price->>'promo_id', '')::uuid,
      coalesce((v_price->>'billed_min')::int, p_duration_min),
      'COP', v_wa, now(), v_note, now() + interval '4 hours'
    )
    returning id into v_id;
  exception
    when unique_violation then
      raise exception 'Ya tenés una reserva pendiente en esta cancha.';
    when exclusion_violation then
      raise exception 'Esa franja ya tiene una reserva pedida o confirmada. Elegí otra hora.';
  end;

  perform private.log_venue_booking_event(
    v_id, null, 'pending', v_uid,
    jsonb_build_object(
      'payment_method', v_method,
      'final_cop', v_final,
      'deposit_pct', v_deposit_pct,
      'deposit_cop', v_deposit_cop,
      'amount_cop', v_deposit_cop
    )
  );

  return v_id;
end;
$fn$;

revoke all on function public.submit_venue_booking(
  uuid, text, timestamptz, integer, text, text, text, text, integer, integer, uuid
) from public, anon;
grant execute on function public.submit_venue_booking(
  uuid, text, timestamptz, integer, text, text, text, text, integer, integer, uuid
) to authenticated;

-- =============================================================================
-- 5. cancel / expire: soportar hold
-- =============================================================================

create or replace function public.cancel_venue_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_row public.venue_bookings%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_booking_id is null then
    raise exception 'Datos incompletos';
  end if;

  select * into v_row
  from public.venue_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Reserva no encontrada.';
  end if;
  if v_row.player_id is distinct from v_uid then
    raise exception 'Solo quien pidió la reserva puede cancelarla.';
  end if;

  if v_row.status in ('hold', 'pending') then
    null;
  elsif v_row.status = 'confirmed' then
    if v_row.starts_at - now() < interval '12 hours' then
      raise exception 'Solo podés cancelar una reserva confirmada con al menos 12 horas de anticipación.';
    end if;
  else
    raise exception 'Esa reserva ya no se puede cancelar.';
  end if;

  update public.venue_bookings
  set
    status = 'cancelled',
    hold_expires_at = null,
    updated_at = now()
  where id = p_booking_id;

  perform private.log_venue_booking_event(
    p_booking_id,
    v_row.status,
    'cancelled',
    v_uid,
    '{}'::jsonb
  );
end;
$fn$;

create or replace function public.expire_venue_booking_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select id, status
    from public.venue_bookings
    where status in ('hold', 'pending')
      and hold_expires_at is not null
      and hold_expires_at < now()
    for update skip locked
  loop
    update public.venue_bookings
    set
      status = 'expired',
      hold_expires_at = null,
      updated_at = now()
    where id = r.id;

    perform private.log_venue_booking_event(
      r.id,
      r.status,
      'expired',
      null,
      jsonb_build_object('source', 'cron')
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$fn$;

comment on function public.start_venue_booking_hold(uuid, text, timestamptz, integer) is
  'Aparta la franja 8 min (status=hold) al entrar al pago.';
comment on function public.release_venue_booking_hold(uuid) is
  'Libera soft hold (hold→cancelled).';
comment on function public.expire_venue_booking_holds() is
  'Cron: hold|pending con hold_expires_at < now() → expired.';
comment on table public.venue_bookings is
  'Reservas: hold 8m pre-pago; pending 4h aprobación dueño; EXCLUDE + assert vs matches.';
