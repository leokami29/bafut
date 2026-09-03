-- UX ocupación: sport/format en lookup + listado del día por cancha.
drop function if exists public.lookup_venue_occupancy(uuid, timestamptz, integer, uuid);

create function public.lookup_venue_occupancy(
  p_venue_id uuid,
  p_starts_at timestamptz,
  p_duration_min integer,
  p_exclude_match_id uuid default null
)
returns table (
  match_id uuid,
  share_code text,
  host_id uuid,
  starts_at timestamptz,
  duration_min integer,
  venue_id uuid,
  venue_name text,
  away_opened_by uuid,
  open_slot_count integer,
  has_side_b boolean,
  sport text,
  format text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.id,
    m.share_code,
    m.host_id,
    m.starts_at,
    m.duration_min,
    m.venue_id,
    v.name,
    m.away_opened_by,
    (
      select count(*)::int
      from public.match_slots s
      where s.match_id = m.id
        and not exists (
          select 1 from public.slot_claims c
          where c.slot_id = s.id and c.status = 'accepted'
        )
    ) as open_slot_count,
    (m.away_opened_by is not null) as has_side_b,
    m.sport,
    m.format
  from public.matches m
  join public.venues v on v.id = m.venue_id
  where m.venue_id = p_venue_id
    and m.status = 'open'
    and (p_exclude_match_id is null or m.id <> p_exclude_match_id)
    and p_starts_at is not null
    and p_duration_min in (30, 60, 90)
    and m.occupy_range && tstzrange(
      p_starts_at,
      p_starts_at + make_interval(mins => p_duration_min),
      '[)'
    )
  order by m.starts_at, m.id
  limit 1;
$$;

revoke all on function public.lookup_venue_occupancy(uuid, timestamptz, integer, uuid) from public;
grant execute on function public.lookup_venue_occupancy(uuid, timestamptz, integer, uuid) to anon, authenticated;

create or replace function public.list_venue_day_occupancy(
  p_venue_id uuid,
  p_day_start timestamptz,
  p_day_end timestamptz,
  p_exclude_match_id uuid default null
)
returns table (
  match_id uuid,
  share_code text,
  starts_at timestamptz,
  duration_min integer,
  sport text,
  format text,
  open_slot_count integer,
  has_side_b boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.id,
    m.share_code,
    m.starts_at,
    m.duration_min,
    m.sport,
    m.format,
    (
      select count(*)::int
      from public.match_slots s
      where s.match_id = m.id
        and not exists (
          select 1 from public.slot_claims c
          where c.slot_id = s.id and c.status = 'accepted'
        )
    ) as open_slot_count,
    (m.away_opened_by is not null) as has_side_b
  from public.matches m
  where m.venue_id = p_venue_id
    and m.status = 'open'
    and (p_exclude_match_id is null or m.id <> p_exclude_match_id)
    and p_day_start is not null
    and p_day_end is not null
    and p_day_end > p_day_start
    and m.starts_at >= p_day_start
    and m.starts_at < p_day_end
  order by m.starts_at, m.id;
$$;

comment on function public.list_venue_day_occupancy(uuid, timestamptz, timestamptz, uuid) is
  'Partidos open de una cancha en un día civil (instantes day_start..day_end).';

revoke all on function public.list_venue_day_occupancy(uuid, timestamptz, timestamptz, uuid) from public;
grant execute on function public.list_venue_day_occupancy(uuid, timestamptz, timestamptz, uuid) to anon, authenticated;
