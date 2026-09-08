-- Congelar monto visto por el jugador: submit exige expected deposit/final.
-- Si el dueño cambia tarifa, promo o % abono entre preview y pago → rechazo claro.

drop function if exists public.submit_venue_booking(
  uuid, text, timestamptz, integer, text, text, text, text
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
  p_expected_final_cop integer default null
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

  -- El cliente no dicta el precio: solo confirma el monto que vio al pagar.
  if p_expected_final_cop is distinct from v_final
     or p_expected_deposit_cop is distinct from v_deposit_cop then
    raise exception 'BOOKING_PRICE_CHANGED:%:%', v_final, v_deposit_cop;
  end if;

  v_range := tstzrange(
    p_starts_at,
    p_starts_at + make_interval(mins => p_duration_min),
    '[)'
  );

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
      'pending',
      v_method,
      v_path,
      coalesce((v_price->>'base_cop')::int, 0),
      coalesce((v_price->>'discount_cop')::int, 0),
      v_final,
      v_deposit_pct,
      v_deposit_cop,
      v_deposit_cop,
      nullif(v_price->>'promo_id', '')::uuid,
      coalesce((v_price->>'billed_min')::int, p_duration_min),
      'COP',
      v_wa,
      now(),
      v_note,
      now() + interval '4 hours'
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
end;
$fn$;

comment on function public.submit_venue_booking(
  uuid, text, timestamptz, integer, text, text, text, text, integer, integer
) is
  'Crea reserva pending. Recalcula precio; exige p_expected_* = monto visto al pagar (anti carrera de tarifa/abono).';

revoke all on function public.submit_venue_booking(
  uuid, text, timestamptz, integer, text, text, text, text, integer, integer
) from public, anon;
grant execute on function public.submit_venue_booking(
  uuid, text, timestamptz, integer, text, text, text, text, integer, integer
) to authenticated;
