-- Eliminación de cuenta propia: limpia datos públicos en orden seguro y borra el perfil.
-- auth.users lo elimina el servidor con service role (auth.admin.deleteUser).

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  -- Lado B en partidos ajenos (away_opened_by tiene ON DELETE RESTRICT).
  delete from public.match_slots ms
  using public.matches m
  where ms.match_id = m.id
    and ms.side = 'b'
    and m.away_opened_by = uid
    and m.host_id is distinct from uid;

  update public.matches
  set away_opened_by = null
  where away_opened_by = uid;

  -- Promociones creadas por el usuario (created_by sin cascade).
  delete from public.venue_promotions
  where created_by = uid;

  -- Partidos que organiza (host_id sin cascade; cupos y pedidos en cascada).
  delete from public.matches
  where host_id = uid;

  -- Perfil: cascada a contactos, alertas, reservas, claims, templates, etc.
  -- Canchas con owner_id quedan con dueño NULL (ON DELETE SET NULL).
  delete from public.profiles
  where id = uid;

  if not found then
    raise exception 'Perfil no encontrado';
  end if;
end;
$$;

comment on function public.delete_own_account() is
  'Borra datos del usuario autenticado (perfil, partidos hosteados, reservas, alertas, etc.). Requiere auth.admin.deleteUser en el servidor para cerrar auth.users.';

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
