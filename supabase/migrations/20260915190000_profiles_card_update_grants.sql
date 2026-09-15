-- La ficha de jugador escribe columnas nuevas. El UPDATE de authenticated
-- quedó limitado a los campos originales (level_trust), así que guardar la
-- foto fallaba con "permission denied for table profiles".
-- Los contadores de nivel siguen sin ser escribibles desde el cliente.

revoke update on table public.profiles from authenticated;
grant update (
  display_name,
  city_id,
  preferred_sport,
  preferred_position,
  preferred_format,
  secondary_position,
  preferred_foot,
  level,
  avatar_path,
  avatar_focus_x,
  avatar_focus_y,
  avatar_zoom,
  birth_date,
  gender,
  height_cm,
  weight_kg,
  neighborhood,
  preferred_days,
  preferred_time_slots,
  plays_for_pay,
  terms_accepted_at,
  updated_at
) on table public.profiles to authenticated;
