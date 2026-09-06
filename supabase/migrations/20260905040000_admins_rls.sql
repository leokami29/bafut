-- RLS sobre admins: hoy la tabla queda sin políticas y, con los default
-- grants de Supabase, cualquiera puede leer QUIÉN es admin (user ids).
-- Con esta política cada usuario solo ve su propia fila: la app puede
-- preguntarse "¿soy admin?" sin exponer la lista.

alter table public.admins enable row level security;

drop policy if exists admins_select_own on public.admins;
create policy admins_select_own on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Las funciones RPC (approve/reject/create_venue_subscription) son SECURITY
-- DEFINER y corren como owner: bypassan RLS y siguen viendo toda la tabla.
