-- Contacto WhatsApp gated (Parte A):
-- 1) Predicado match_is_contactable (espejo de isMatchHistory en lib/level-trust.ts)
-- 2) RPC batch list_my_match_contacts
-- 3) get_match_contact como wrapper claim-scoped sobre la misma matriz
-- 4) slot_claims_select alineado con away_opened_by (mismo criterio que respond_claim)

-- ---------------------------------------------------------------------------
-- Predicado: contactable iff status open AND now < starts_at + duration_min
-- Espejo TS: isMatchHistory(starts, duration) => now >= ends; contactable => !history && open
-- ---------------------------------------------------------------------------
create or replace function public.match_is_contactable(
  p_status text,
  p_starts_at timestamptz,
  p_duration_min integer
)
returns boolean
language sql
stable
as $$
  select
    p_status is not distinct from 'open'
    and p_starts_at is not null
    and p_duration_min is not null
    and p_duration_min >= 0
    and (p_starts_at + make_interval(mins => p_duration_min)) > now();
$$;

comment on function public.match_is_contactable(text, timestamptz, integer) is
  'Espejo de isMatchHistory (lib/level-trust.ts): contactable si status=open y now < starts_at+duration_min. Cortar cancelled/historial.';

create or replace function public.match_is_contactable(p_match_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (
      select public.match_is_contactable(m.status, m.starts_at, m.duration_min)
      from public.matches m
      where m.id = p_match_id
    ),
    false
  );
$$;

comment on function public.match_is_contactable(uuid) is
  'Convenience overload: match_is_contactable por id de partido.';

revoke all on function public.match_is_contactable(text, timestamptz, integer) from public, anon;
revoke all on function public.match_is_contactable(uuid) from public, anon;
grant execute on function public.match_is_contactable(text, timestamptz, integer) to authenticated;
grant execute on function public.match_is_contactable(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Moderador del lado (misma regla que respond_claim)
-- ---------------------------------------------------------------------------
create or replace function public.match_side_moderator(
  p_side text,
  p_host_id uuid,
  p_away_opened_by uuid
)
returns uuid
language sql
immutable
as $$
  select case
    when p_side is not distinct from 'b' and p_away_opened_by is not null then p_away_opened_by
    else p_host_id
  end;
$$;

comment on function public.match_side_moderator(text, uuid, uuid) is
  'Autoridad dual: side b + away_opened_by => capitán B; si no, host.';

revoke all on function public.match_side_moderator(text, uuid, uuid) from public, anon;
grant execute on function public.match_side_moderator(text, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- list_my_match_contacts: matriz v1 de aristas WA
-- relation ∈ moderator_claim | my_moderator | side_peer | host_away
-- ---------------------------------------------------------------------------
create or replace function public.list_my_match_contacts(p_match_id uuid)
returns table (
  other_user_id uuid,
  display_name text,
  whatsapp text,
  relation text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_host uuid;
  v_away uuid;
  v_status text;
  v_starts timestamptz;
  v_duration integer;
  v_viewer_ok boolean := false;
begin
  if v_uid is null or p_match_id is null then
    return;
  end if;

  select m.host_id, m.away_opened_by, m.status, m.starts_at, m.duration_min
    into v_host, v_away, v_status, v_starts, v_duration
  from public.matches m
  where m.id = p_match_id;

  if v_host is null then
    return;
  end if;

  if not public.match_is_contactable(v_status, v_starts, v_duration) then
    return;
  end if;

  if v_uid = v_host or v_uid is not distinct from v_away then
    v_viewer_ok := true;
  elsif exists (
    select 1
    from public.slot_claims c
    where c.match_id = p_match_id
      and c.player_id = v_uid
      and c.status in ('pending', 'accepted')
  ) then
    v_viewer_ok := true;
  end if;

  if not v_viewer_ok then
    return;
  end if;

  return query
  with claims as (
    select
      c.player_id,
      c.status,
      s.side,
      public.match_side_moderator(s.side, v_host, v_away) as moderator_id
    from public.slot_claims c
    join public.match_slots s on s.id = c.slot_id
    where c.match_id = p_match_id
      and c.status in ('pending', 'accepted')
  ),
  edges as (
    -- Moderador del lado ↔ claim (pending|accepted)
    select cl.player_id as oid, 'moderator_claim'::text as rel
    from claims cl
    where cl.moderator_id = v_uid
      and cl.player_id is distinct from v_uid

    union

    select cl.moderator_id as oid, 'my_moderator'::text as rel
    from claims cl
    where cl.player_id = v_uid
      and cl.moderator_id is distinct from v_uid

    union

    -- Host ↔ capitán B
    select v_away as oid, 'host_away'::text as rel
    where v_uid = v_host
      and v_away is not null
      and v_away is distinct from v_uid

    union

    select v_host as oid, 'host_away'::text as rel
    where v_uid is not distinct from v_away
      and v_host is distinct from v_uid

    union

    -- Peers accepted mismo side (no rivales A↔B)
    select peer.player_id as oid, 'side_peer'::text as rel
    from claims me
    join claims peer
      on peer.side is not distinct from me.side
     and peer.player_id is distinct from me.player_id
    where me.player_id = v_uid
      and me.status = 'accepted'
      and peer.status = 'accepted'
  ),
  ranked as (
    select distinct on (e.oid)
      e.oid,
      e.rel
    from edges e
    where e.oid is not null
    order by e.oid,
      case e.rel
        when 'moderator_claim' then 1
        when 'my_moderator' then 2
        when 'host_away' then 3
        when 'side_peer' then 4
        else 5
      end
  )
  select
    r.oid,
    p.display_name,
    pc.whatsapp,
    r.rel
  from ranked r
  join public.profiles p on p.id = r.oid
  left join public.profile_contacts pc on pc.user_id = p.id;
end;
$$;

comment on function public.list_my_match_contacts(uuid) is
  'SECURITY DEFINER: contactos WA del viewer en un partido. Relaciones v1: moderator_claim, my_moderator, host_away, side_peer (mismo lado). Vacío si cancelled/historial. No devolver propio WA como other.';

revoke all on function public.list_my_match_contacts(uuid) from public, anon;
grant execute on function public.list_my_match_contacts(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_match_contact: wrapper claim-scoped sobre list_my_match_contacts
-- Extiende a pending + capitán B (antes solo accepted host↔player)
-- ---------------------------------------------------------------------------
create or replace function public.get_match_contact(p_claim_id uuid)
returns table (display_name text, whatsapp text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_match_id uuid;
  v_player uuid;
  v_status text;
  v_side text;
  v_host uuid;
  v_away uuid;
  v_mod uuid;
  v_other uuid;
begin
  if v_uid is null or p_claim_id is null then
    return;
  end if;

  select
    c.match_id,
    c.player_id,
    c.status,
    s.side,
    m.host_id,
    m.away_opened_by
  into
    v_match_id,
    v_player,
    v_status,
    v_side,
    v_host,
    v_away
  from public.slot_claims c
  join public.matches m on m.id = c.match_id
  join public.match_slots s on s.id = c.slot_id
  where c.id = p_claim_id;

  if v_match_id is null then
    return;
  end if;

  if v_status is distinct from 'pending' and v_status is distinct from 'accepted' then
    return;
  end if;

  if not public.match_is_contactable(v_match_id) then
    return;
  end if;

  v_mod := public.match_side_moderator(v_side, v_host, v_away);

  if v_uid = v_mod then
    v_other := v_player;
  elsif v_uid = v_player then
    v_other := v_mod;
  else
    return;
  end if;

  if v_other is null or v_other = v_uid then
    return;
  end if;

  return query
    select l.display_name, l.whatsapp
    from public.list_my_match_contacts(v_match_id) l
    where l.other_user_id = v_other
    limit 1;
end;
$$;

comment on function public.get_match_contact(uuid) is
  'SECURITY DEFINER (deprecado como fuente primaria): wrapper claim-scoped de list_my_match_contacts. pending|accepted; moderador del lado ↔ player. Preferir list_my_match_contacts.';

revoke all on function public.get_match_contact(uuid) from public, anon;
grant execute on function public.get_match_contact(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: capitán B ve claims de slots side=b (pending incluidos), como respond_claim
-- ---------------------------------------------------------------------------
drop policy if exists slot_claims_select on public.slot_claims;
create policy slot_claims_select on public.slot_claims for select to anon, authenticated
  using (
    status = 'accepted'
    or player_id = (select auth.uid())
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and m.host_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.matches m
      join public.match_slots s on s.id = slot_claims.slot_id
      where m.id = slot_claims.match_id
        and m.away_opened_by = (select auth.uid())
        and s.side = 'b'
    )
  );
