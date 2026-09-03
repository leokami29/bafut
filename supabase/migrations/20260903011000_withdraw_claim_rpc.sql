-- Retiro de pedido por el jugador; host sigue confirmando/rechazando.
drop policy if exists slot_claims_update on public.slot_claims;
create policy slot_claims_update on public.slot_claims
  for update to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.host_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.host_id = (select auth.uid())
    )
    and status in ('accepted', 'rejected')
  );

create or replace function public.withdraw_claim(p_claim_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.slot_claims
  set status = 'withdrawn', updated_at = now()
  where id = p_claim_id
    and player_id = (select auth.uid())
    and status = 'pending';
  if not found then
    raise exception 'No se pudo retirar el pedido';
  end if;
end;
$$;

grant execute on function public.withdraw_claim(uuid) to authenticated;
