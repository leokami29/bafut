-- Semántica de precio: price_cop / default_price_cop = COP por hora.
-- Facturación: pricePerMin = price_cop / 60, luego × minutos facturados (por franja si cruza).
-- Conserva lógica de timezone de ciudad de 20260908021120_fix_preview_match_price_timezone.sql.
-- No reescala filas existentes: el dueño reingresa si el número era "precio de bloque".

comment on table public.venue_price_slots is
  'Franjas horarias por (cancha, deporte, día). price_cop = COP por hora (no precio del bloque completo). Sin solapamiento.';

comment on column public.venue_price_slots.price_cop is
  'COP por hora. Al facturar: (price_cop / 60) * minutos en esta franja.';

comment on table public.venue_pricing_default is
  'Fallback COP/hora por día cuando no hay franja que cubra el instante. Misma fórmula: /60 * minutos.';

comment on column public.venue_pricing_default.default_price_cop is
  'COP por hora (fallback sin franja). No es precio de día completo.';

-- ============================================
-- preview_match_price (COP/hora)
-- ============================================
create or replace function public.preview_match_price(
  p_venue_id uuid,
  p_sport text,
  p_starts_at timestamptz,
  p_duration_min int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_local timestamp;
  v_local_date date;
  v_day_of_week int;
  v_start_time time;
  v_query_start_time time;
  v_cursor timestamp;
  v_min_minutes int;
  v_billed_min int;
  v_base_acc numeric := 0;
  v_base_cop int := 0;
  v_discount_cop int := 0;
  v_final_cop int;
  v_promo_id uuid;
  v_errors text[] := '{}';
  v_slots record;
  v_remaining_min int;
  v_segment_min int;
  v_price_per_min numeric;
  v_fallback_hour_cop int;
  v_promo record;
begin
  select c.timezone into v_tz
  from public.venues v
  join public.cities c on c.id = v.city_id
  where v.id = p_venue_id;

  if v_tz is null then
    v_tz := 'America/Bogota';
  end if;

  -- Wall clock civil en la ciudad (timestamp without time zone).
  v_local := p_starts_at at time zone v_tz;
  v_local_date := v_local::date;
  v_day_of_week := extract(dow from v_local)::int;
  v_query_start_time := v_local::time;
  v_start_time := v_query_start_time;
  v_cursor := v_local;

  -- Duración mínima
  select min_minutes into v_min_minutes
  from public.venue_pricing_min
  where venue_id = p_venue_id and sport = p_sport;

  if v_min_minutes is null then
    v_min_minutes := 60;
  end if;

  v_billed_min := floor(p_duration_min / v_min_minutes) * v_min_minutes;

  if v_billed_min = 0 then
    v_errors := v_errors || format(
      'La duración (%s min) es menor que la mínima (%s min).',
      p_duration_min,
      v_min_minutes
    );
  end if;

  -- Precio base: price_cop = COP/hora → /60 por minuto; cruza franjas y medianoche si aplica.
  v_remaining_min := v_billed_min;
  while v_remaining_min > 0 loop
    v_day_of_week := extract(dow from v_cursor)::int;
    v_start_time := v_cursor::time;

    select id, start_time, end_time, price_cop into v_slots
    from public.venue_price_slots
    where venue_id = p_venue_id
      and sport = p_sport
      and day_of_week = v_day_of_week
      and start_time <= v_start_time
      and end_time > v_start_time
    order by start_time
    limit 1;

    if v_slots is null then
      select default_price_cop into v_fallback_hour_cop
      from public.venue_pricing_default
      where venue_id = p_venue_id and sport = p_sport and day_of_week = v_day_of_week;

      if v_fallback_hour_cop is null then
        v_errors := v_errors || format(
          'No hay franja ni fallback para %s a las %s.',
          v_day_of_week,
          v_start_time
        );
        exit;
      end if;

      -- Fallback = COP/hora (misma semántica que franjas / lib/pricing.ts).
      v_price_per_min := v_fallback_hour_cop::numeric / 60;
      v_base_acc := v_base_acc + (v_remaining_min * v_price_per_min);
      v_remaining_min := 0;
      continue;
    end if;

    -- Franja: price_cop = COP/hora.
    v_price_per_min := v_slots.price_cop::numeric / 60;
    v_segment_min := least(
      v_remaining_min,
      extract(epoch from (v_slots.end_time - v_start_time))::int / 60
    );
    v_base_acc := v_base_acc + (v_segment_min * v_price_per_min);
    v_cursor := v_cursor + (v_segment_min || ' minutes')::interval;
    v_remaining_min := v_remaining_min - v_segment_min;
  end loop;

  v_base_cop := round(v_base_acc)::int;

  -- Promos: ventana de hora/fecha en hora civil de la ciudad (inicio del partido, no cursor avanzado).
  select id, kind, override_price_cop, discount_pct into v_promo
  from public.venue_promotions
  where venue_id = p_venue_id
    and sport = p_sport
    and active = true
    and (start_time is null or start_time <= v_query_start_time)
    and (end_time is null or end_time > v_query_start_time)
    and (
      days_of_week is null
      or extract(dow from v_local)::int = any (days_of_week)
    )
    and (date_start is null or v_local_date >= date_start)
    and (date_end is null or v_local_date <= date_end)
  order by kind desc
  limit 1;

  if v_promo is not null then
    v_promo_id := v_promo.id;
    if v_promo.kind = 'override_slot' then
      v_base_cop := v_promo.override_price_cop;
      v_discount_cop := 0;
    elsif v_promo.kind = 'discount_pct' then
      v_discount_cop := round((v_base_cop::numeric * v_promo.discount_pct) / 100)::int;
    end if;
  end if;

  v_final_cop := greatest(0, v_base_cop - v_discount_cop);

  return jsonb_build_object(
    'base_cop', v_base_cop,
    'discount_cop', v_discount_cop,
    'final_cop', v_final_cop,
    'promo_id', v_promo_id,
    'duration_min', p_duration_min,
    'billed_min', v_billed_min,
    'min_minutes', v_min_minutes,
    'errors', v_errors
  );
end;
$$;

comment on function public.preview_match_price(uuid, text, timestamptz, int) is
  'Calcula precio sin guardar. Franjas y fallback: COP/hora; pricePerMin = price_cop/60. TZ = ciudad de la cancha.';
