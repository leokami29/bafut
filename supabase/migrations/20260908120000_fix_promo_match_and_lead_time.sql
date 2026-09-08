-- Fix preview_match_price: aplicar promos de forma fiable (sin RECORD IS NULL),
-- calificar columnas, respetar lead_time_minutes, y ordenar override > discount.
-- La seña (% deposit) se calcula en app/RPC sobre final_cop (ya con descuento).

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
as $fn$
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
  v_slot_id uuid;
  v_slot_start time;
  v_slot_end time;
  v_slot_price int;
  v_remaining_min int;
  v_segment_min int;
  v_price_per_min numeric;
  v_fallback_hour_cop int;
  v_slot_found boolean;
  v_promo_found boolean;
  v_promo_kind text;
  v_promo_override int;
  v_promo_discount int;
begin
  select c.timezone into v_tz
  from public.venues v
  join public.cities c on c.id = v.city_id
  where v.id = p_venue_id;

  if v_tz is null then
    v_tz := 'America/Bogota';
  end if;

  v_local := p_starts_at at time zone v_tz;
  v_local_date := v_local::date;
  v_day_of_week := extract(dow from v_local)::int;
  v_query_start_time := v_local::time;
  v_start_time := v_query_start_time;
  v_cursor := v_local;

  select m.min_minutes into v_min_minutes
  from public.venue_pricing_min m
  where m.venue_id = p_venue_id and m.sport = p_sport;

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

  -- Precio base: COP/hora → /60 por minuto.
  v_remaining_min := v_billed_min;
  while v_remaining_min > 0 loop
    v_day_of_week := extract(dow from v_cursor)::int;
    v_start_time := v_cursor::time;

    select s.id, s.start_time, s.end_time, s.price_cop
      into v_slot_id, v_slot_start, v_slot_end, v_slot_price
    from public.venue_price_slots s
    where s.venue_id = p_venue_id
      and s.sport = p_sport
      and s.day_of_week = v_day_of_week
      and s.start_time <= v_start_time
      and s.end_time > v_start_time
    order by s.start_time
    limit 1;

    v_slot_found := FOUND;

    if not v_slot_found then
      select d.default_price_cop into v_fallback_hour_cop
      from public.venue_pricing_default d
      where d.venue_id = p_venue_id
        and d.sport = p_sport
        and d.day_of_week = v_day_of_week;

      if v_fallback_hour_cop is null then
        v_errors := v_errors || format(
          'No hay franja ni fallback para %s a las %s.',
          v_day_of_week,
          v_start_time
        );
        exit;
      end if;

      v_price_per_min := v_fallback_hour_cop::numeric / 60;
      v_base_acc := v_base_acc + (v_remaining_min * v_price_per_min);
      v_remaining_min := 0;
      continue;
    end if;

    v_price_per_min := v_slot_price::numeric / 60;
    v_segment_min := least(
      v_remaining_min,
      greatest(1, extract(epoch from (v_slot_end - v_start_time))::int / 60)
    );
    v_base_acc := v_base_acc + (v_segment_min * v_price_per_min);
    v_cursor := v_cursor + (v_segment_min || ' minutes')::interval;
    v_remaining_min := v_remaining_min - v_segment_min;
  end loop;

  v_base_cop := round(v_base_acc)::int;

  -- Promo: columnas calificadas + lead_time (anticipación mínima para aplicar).
  select
    vp.id,
    vp.kind::text,
    vp.override_price_cop,
    vp.discount_pct
  into
    v_promo_id,
    v_promo_kind,
    v_promo_override,
    v_promo_discount
  from public.venue_promotions vp
  where vp.venue_id = p_venue_id
    and vp.sport = p_sport
    and vp.active = true
    and (vp.start_time is null or vp.start_time <= v_query_start_time)
    and (vp.end_time is null or vp.end_time > v_query_start_time)
    and (
      vp.days_of_week is null
      or extract(dow from v_local)::int = any (vp.days_of_week)
    )
    and (vp.date_start is null or v_local_date >= vp.date_start)
    and (vp.date_end is null or v_local_date <= vp.date_end)
    and (
      coalesce(vp.lead_time_minutes, 0) <= 0
      or p_starts_at >= (now() + make_interval(mins => coalesce(vp.lead_time_minutes, 0)))
    )
  order by
    case vp.kind::text
      when 'override_slot' then 2
      when 'discount_pct' then 1
      else 0
    end desc,
    vp.discount_pct desc nulls last
  limit 1;

  v_promo_found := FOUND;

  if v_promo_found then
    if v_promo_kind = 'override_slot' then
      v_base_cop := coalesce(v_promo_override, v_base_cop);
      v_discount_cop := 0;
    elsif v_promo_kind = 'discount_pct' then
      v_discount_cop := round(
        (v_base_cop::numeric * coalesce(v_promo_discount, 0)) / 100
      )::int;
    end if;
  else
    v_promo_id := null;
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
$fn$;

comment on function public.preview_match_price(uuid, text, timestamptz, int) is
  'Precio sin guardar. Franjas/fallback COP/hora (/60*min). Promos con lead_time; final_cop ya descontado (base para seña %).';
