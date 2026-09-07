-- Fix de integridad comercial: liberar una cancha (unclaim) NO debe dejar una
-- suscripción Premium 'active' sin dueño ni una solicitud pending zombi.
--
-- Política: el Premium lo paga el dueño, por cancha y por periodo.
-- Si el dueño se va (o un admin lo expulsa):
--   - suscripciones 'active'          -> 'cancelled' (el rembolso lo decide un admin, hay audit)
--   - solicitudes 'pending'           -> 'rejected' con motivo explicativo
--   - owner/contactos/is_verified     -> null / null / false
-- Siempre se audita con los counts cancelados: acá es donde cambia la plata.

create or replace function public.unclaim_venue(p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_as_admin boolean;
  v_cancelled_subs integer := 0;
  v_cancelled_reqs integer := 0;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select owner_id into v_owner from public.venues where id = p_venue_id;
  if v_owner is null and not found then
    raise exception 'Cancha no encontrada.';
  end if;

  v_as_admin := public.is_admin(v_uid);
  if v_owner is distinct from v_uid and not v_as_admin then
    raise exception 'Solo el dueño o un admin pueden liberar la ficha.';
  end if;

  -- Premium: el tiempo pagado y no usado queda cancelado, no heredable.
  update public.venue_subscriptions
  set
    status = 'cancelled',
    updated_at = now()
  where venue_id = p_venue_id
    and status = 'active';
  get diagnostics v_cancelled_subs = row_count;

  update public.venue_subscription_requests
  set
    status = 'rejected',
    reject_reason = 'El dueño liberó la cancha: el trámite Premium quedó cancelado. Solicitalo de nuevo cuando reclames la ficha.',
    reviewed_by = v_uid,
    reviewed_at = now(),
    updated_at = now()
  where venue_id = p_venue_id
    and status = 'pending';
  get diagnostics v_cancelled_reqs = row_count;

  update public.venues
  set
    owner_id = null,
    contact_whatsapp = null,
    contact_email = null,
    is_verified = false
  where id = p_venue_id;

  perform private.log_admin_action(
    'unclaim_venue',
    'venue',
    p_venue_id,
    jsonb_build_object(
      'previous_owner_id', v_owner,
      'by_admin', v_as_admin and v_owner is distinct from v_uid,
      'cancelled_subscriptions', v_cancelled_subs,
      'cancelled_requests', v_cancelled_reqs
    )
  );
end;
$$;

revoke all on function public.unclaim_venue from public, anon;
grant execute on function public.unclaim_venue to authenticated;

-- ============================================================
-- Limpieza de huérfanos históricos (regla anterior: active sin dueño).
-- Afecta plata de clientes: revisá ANTES de correr y decidí rembolsos.
--
-- SELECT vs.id, vs.venue_id, v.name, vs.plan, vs.expires_at
-- FROM public.venue_subscriptions vs
-- JOIN public.venues v ON v.id = vs.venue_id
-- WHERE vs.status = 'active' AND v.owner_id IS NULL;
--
-- UPDATE public.venue_subscriptions vs
-- SET status = 'cancelled', updated_at = now()
-- WHERE vs.status = 'active'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.venues v
--     WHERE v.id = vs.venue_id AND v.owner_id IS NOT NULL
--   );
