-- Ocupacion de cancha (timestamptz; Barranquilla = America/Bogota en cities.timezone):
-- SI: 1 fila matches = 1 pateada. A = host; B = away_opened_by + match_slots.side='b'.
-- SI: ocupado si status='open' en [starts_at, starts_at+duration_min) del mismo venue_id.
-- SI: completo (0 cupos libres) sigue ocupando. Cancelado libera. Pegados [a,b)+[b,c) OK.
-- SI: otra cancha, misma hora. Editar hora/cancha: mismo EXCLUDE (la fila no choca consigo).
-- NO: segundo matches para el rival. NO: tercero publica encima. NO: otro deporte en la misma ficha.
-- NO: overlap parcial. NO: host de A abre B (B es el equipo EN CONTRA; mismo grupo -> unirse).
-- NO: mismo host republica el hueco (editar/compartir). 5v5 vs 7v7: gana el primero; B hereda meta.
-- Cupos A los edita el host; editar A no borra B. Abrir B es RPC atomico (1-2 cupos, una vez).

create extension if not exists btree_gist with schema extensions;

set search_path = public, extensions;

alter table public.matches
  add column if not exists away_opened_by uuid references public.profiles(id) on delete restrict;

alter table public.match_slots
  add column if not exists side text not null default 'a';

alter table public.match_slots drop constraint if exists match_slots_side_check;
alter table public.match_slots
  add constraint match_slots_side_check check (side in ('a', 'b'));

update public.match_slots set side = 'a' where side is distinct from 'a' and side is distinct from 'b';

create index if not exists match_slots_match_side_idx on public.match_slots (match_id, side);

alter table public.matches drop column if exists occupy_range;
alter table public.matches
  add column occupy_range tstzrange;

create or replace function private.sync_match_occupy_range()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.occupy_range := tstzrange(
    new.starts_at,
    new.starts_at + make_interval(mins => new.duration_min),
    '[)'
  );
  return new;
end;
$$;

drop trigger if exists matches_sync_occupy_range on public.matches;
create trigger matches_sync_occupy_range
  before insert or update of starts_at, duration_min, occupy_range
  on public.matches
  for each row execute function private.sync_match_occupy_range();

update public.matches
set occupy_range = tstzrange(starts_at, starts_at + make_interval(mins => duration_min), '[)')
where occupy_range is null;

alter table public.matches alter column occupy_range set not null;

alter table public.matches drop constraint if exists matches_venue_occupy_excl;
alter table public.matches
  add constraint matches_venue_occupy_excl
  exclude using gist (
    venue_id with =,
    occupy_range with &&
  )
  where (status = 'open');

create or replace function private.guard_match_immutable_cols()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.host_id is distinct from old.host_id then
    raise exception 'No se puede cambiar el host';
  end if;
  if new.share_code is distinct from old.share_code then
    raise exception 'No se puede cambiar el codigo';
  end if;
  if new.city_id is distinct from old.city_id then
    raise exception 'No se puede cambiar la ciudad';
  end if;
  if old.away_opened_by is not null and new.away_opened_by is distinct from old.away_opened_by then
    raise exception 'El lado B ya esta abierto';
  end if;
  if old.away_opened_by is not null and new.away_opened_by is null then
    raise exception 'No se puede quitar el lado B';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.guard_slot_match_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.match_id is distinct from old.match_id then
    raise exception 'No se puede mover un cupo a otro partido';
  end if;
  if new.side is distinct from old.side then
    raise exception 'No se puede cambiar el lado del cupo';
  end if;
  return new;
end;
$$;

create or replace function private.guard_slot_side_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.side = 'b' then
    if not exists (
      select 1 from public.matches m
      where m.id = new.match_id
        and m.away_opened_by is not distinct from (select auth.uid())
        and m.status = 'open'
    ) then
      raise exception 'No se puede abrir el lado B asi';
    end if;
    if (
      select count(*) from public.match_slots s
      where s.match_id = new.match_id and s.side = 'b'
    ) >= 2 then
      raise exception 'El lado B ya tiene el maximo de cupos';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists match_slots_guard_side_insert on public.match_slots;
create trigger match_slots_guard_side_insert
  before insert on public.match_slots
  for each row execute function private.guard_slot_side_insert();
