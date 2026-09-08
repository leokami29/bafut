-- apply_match_pricing: best-effort (hueco ≠ alquiler)
-- - returns jsonb { applied, reason } en lugar de raise por falta de tarifa
-- - sin override: host OR owner OR admin
-- - con override: solo owner/admin + upsert
-- - ON CONFLICT para re-apply seguro

drop function if exists public.apply_match_pricing(uuid, integer);

create or replace function public.apply_match_pricing(
  p_match_id uuid,
  p_overridden_price_cop int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_host_id uuid;
  v_venue_id uuid;
  v_sport text;
  v_starts_at timestamptz;
  v_duration_min int;
  v_is_owner boolean := false;
  v_is_admin boolean := false;
  v_result jsonb;
  v_inserted_id uuid;
  v_final_cop int;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select host_id, venue_id, sport, starts_at, duration_min
  into v_host_id, v_venue_id, v_sport, v_starts_at, v_duration_min
  from public.matches
  where id = p_match_id;

  if not found then
    raise exception 'Partido no encontrado.';
  end if;

  v_is_admin := public.is_admin(v_uid);
  select exists (
    select 1 from public.venues v
    where v.id = v_venue_id
      and v.owner_id = v_uid
  ) into v_is_owner;

  -- Override: solo dueño/admin; upsert snapshot
  if p_overridden_price_cop is not null then
    if not (v_is_owner or v_is_admin) then
      raise exception 'Solo el dueño o un admin pueden fijar el precio de la cancha.';
    end if;

    insert into public.matches_pricing_snapshot (
      match_id, base_cop, discount_cop, final_cop, overridden_by_owner, promo_id
    )
    values (
      p_match_id, p_overridden_price_cop, 0, p_overridden_price_cop, true, null
    )
    on conflict (match_id) do update set
      base_cop = excluded.base_cop,
      discount_cop = excluded.discount_cop,
      final_cop = excluded.final_cop,
      overridden_by_owner = true,
      promo_id = null,
      snapshotted_at = now();

    return jsonb_build_object('applied', true, 'reason', 'ok');
  end if;

  -- Sin override: host del partido, dueño o admin
  if not (
    v_host_id = v_uid
    or v_is_owner
    or v_is_admin
  ) then
    raise exception 'Solo el anfitrión, el dueño o un admin pueden aplicar pricing.';
  end if;

  v_result := public.preview_match_price(v_venue_id, v_sport, v_starts_at, v_duration_min);

  if coalesce(jsonb_array_length(coalesce(v_result->'errors', '[]'::jsonb)), 0) > 0 then
    return jsonb_build_object('applied', false, 'reason', 'no_tariff');
  end if;

  if v_result->>'final_cop' is null then
    return jsonb_build_object('applied', false, 'reason', 'no_tariff');
  end if;

  v_final_cop := (v_result->>'final_cop')::int;

  insert into public.matches_pricing_snapshot (
    match_id, base_cop, discount_cop, final_cop, promo_id
  )
  values (
    p_match_id,
    (v_result->>'base_cop')::int,
    (v_result->>'discount_cop')::int,
    v_final_cop,
    (v_result->>'promo_id')::uuid
  )
  on conflict (match_id) do nothing
  returning match_id into v_inserted_id;

  if v_inserted_id is null then
    return jsonb_build_object('applied', true, 'reason', 'already_exists');
  end if;

  return jsonb_build_object('applied', true, 'reason', 'ok');
end;
$$;

revoke all on function public.apply_match_pricing(uuid, integer) from public, anon;
grant execute on function public.apply_match_pricing(uuid, integer) to authenticated;
