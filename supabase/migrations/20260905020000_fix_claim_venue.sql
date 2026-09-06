-- Fix claim_venue: la tabla venues no tiene columna updated_at.
-- Recrear el RPC sin esa asignación (y limpiar inputs de contacto).

create or replace function public.claim_venue(
  p_venue_id uuid,
  p_whatsapp text default null,
  p_email text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verificar que la cancha exista
  if not exists (select 1 from public.venues where id = p_venue_id) then
    raise exception 'Cancha no encontrada';
  end if;

  -- Actualizar datos del dueño (venues no tiene updated_at)
  update public.venues
  set
    owner_id = auth.uid(),
    contact_whatsapp = nullif(btrim(coalesce(p_whatsapp, '')), ''),
    contact_email = nullif(btrim(lower(coalesce(p_email, ''))), '')
  where id = p_venue_id;

  return true;
end;
$$;

revoke all on function public.claim_venue(uuid, text, text) from public, anon;
grant execute on function public.claim_venue(uuid, text, text) to authenticated;
