-- Fix pricing bugs:
-- 1) preview_match_price: usar timezone de la ciudad (no UTC session) para dow/hora/fecha de promos
-- 2) apply_match_pricing: parsear errors JSON vía jsonb_array_elements_text (no cast a text[])
-- 3) set_venue_booking_enabled: rechazar activar turnos sin ninguna tarifa configurada

-- ============================================
-- preview_match_price
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
  v_fallback_day_cop int;
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

  -- Precio base por franjas en hora civil local (avanza cursor; cruza medianoche si aplica).
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
      select default_price_cop into v_fallback_day_cop
      from public.venue_pricing_default
      where venue_id = p_venue_id and sport = p_sport and day_of_week = v_day_of_week;

      if v_fallback_day_cop is null then
        v_errors := v_errors || format(
          'No hay franja ni fallback para %s a las %s.',
          v_day_of_week,
          v_start_time
        );
        exit;
      end if;

      -- Fallback = precio de día completo → prorrateo por minuto (como lib/pricing.ts).
      v_price_per_min := v_fallback_day_cop::numeric / (24 * 60);
      v_base_acc := v_base_acc + (v_remaining_min * v_price_per_min);
      v_remaining_min := 0;
      continue;
    end if;

    -- Precio de la franja prorrateado por minuto de duración de la franja.
    v_price_per_min := v_slots.price_cop::numeric
      / greatest(
        1,
        extract(epoch from (v_slots.end_time - v_slots.start_time))::int / 60
      );
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

-- ============================================
-- apply_match_pricing
-- ============================================
create or replace function public.apply_match_pricing(
  p_match_id uuid,
  p_overridden_price_cop int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_venue_id uuid;
  v_sport text;
  v_starts_at timestamptz;
  v_duration_min int;
  v_result jsonb;
  v_errors text[];
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select venue_id, sport, starts_at, duration_min
  into v_venue_id, v_sport, v_starts_at, v_duration_min
  from public.matches
  where id = p_match_id;

  if not found then
    raise exception 'Partido no encontrado.';
  end if;

  if not exists (
    select 1 from public.venues v
    where v.id = v_venue_id
      and (v.owner_id = v_uid or v_uid in (select user_id from public.admins))
  ) then
    raise exception 'Solo el dueño o un admin pueden aplicar pricing.';
  end if;

  if p_overridden_price_cop is not null then
    insert into public.matches_pricing_snapshot (
      match_id, base_cop, discount_cop, final_cop, overridden_by_owner
    )
    values (p_match_id, p_overridden_price_cop, 0, p_overridden_price_cop, true);
    return;
  end if;

  v_result := public.preview_match_price(v_venue_id, v_sport, v_starts_at, v_duration_min);
  v_errors := coalesce(
    (
      select array_agg(x)
      from jsonb_array_elements_text(coalesce(v_result->'errors', '[]'::jsonb)) as t(x)
    ),
    '{}'::text[]
  );

  if coalesce(jsonb_array_length(v_result->'errors'), 0) > 0 then
    raise exception 'Errores de pricing: %', array_to_string(v_errors, '; ');
  end if;

  insert into public.matches_pricing_snapshot (
    match_id, base_cop, discount_cop, final_cop, promo_id
  )
  values (
    p_match_id,
    (v_result->>'base_cop')::int,
    (v_result->>'discount_cop')::int,
    (v_result->>'final_cop')::int,
    (v_result->>'promo_id')::uuid
  );
end;
$$;

-- ============================================
-- set_venue_booking_enabled (soft check de pricing)
-- ============================================
create or replace function public.set_venue_booking_enabled(
  p_venue_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_sports text[];
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_venue_id is null or p_enabled is null then
    raise exception 'Datos incompletos';
  end if;

  select owner_id, sports into v_owner, v_sports
  from public.venues
  where id = p_venue_id
    and deleted_at is null;

  if not found then
    raise exception 'Cancha no encontrada.';
  end if;

  if v_owner is distinct from v_uid and not public.is_admin(v_uid) then
    raise exception 'Solo el dueño o un admin pueden cambiar este ajuste.';
  end if;

  if p_enabled then
    if not exists (
      select 1
      from public.venue_price_slots s
      where s.venue_id = p_venue_id
        and (v_sports is null or s.sport = any (v_sports))
    )
    and not exists (
      select 1
      from public.venue_pricing_default d
      where d.venue_id = p_venue_id
        and (v_sports is null or d.sport = any (v_sports))
    ) then
      raise exception
        'Configurá al menos una franja o un precio fallback antes de activar pedidos de turno.';
    end if;
  end if;

  update public.venues
  set booking_enabled = p_enabled
  where id = p_venue_id;
end;
$$;
