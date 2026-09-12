-- Corrección de trigger de inserción en match_slots para modo Reto (Challenge)
-- Permite al host del partido insertar cupos del equipo rival (side = 'b') al crear un partido en match_mode = 'challenge'.

create or replace function private.guard_slot_side_insert()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_mode text;
  v_host uuid;
  v_away uuid;
  v_status text;
  v_uid uuid := (select auth.uid());
  v_side_b_count int;
begin
  if new.side = 'b' then
    select match_mode, host_id, away_opened_by, status
      into v_mode, v_host, v_away, v_status
    from public.matches
    where id = new.match_id;

    if v_status is distinct from 'open' then
      raise exception 'El partido no está abierto';
    end if;

    if v_mode = 'challenge' then
      -- En modo reto, el host anfitrión crea los cupos del equipo rival (lado B).
      -- También se permite si el capitán rival o service role está activo.
      if v_uid is not null and v_host is distinct from v_uid and v_away is distinct from v_uid then
        raise exception 'No se puede abrir el lado B asi';
      end if;

      select count(*) into v_side_b_count
      from public.match_slots s
      where s.match_id = new.match_id and s.side = 'b';

      if v_side_b_count >= 16 then
        raise exception 'El lado B ya tiene el maximo de cupos';
      end if;
    else
      -- En modo pickup legacy, quien abrió lado B (away_opened_by) puede insertar hasta 2 cupos
      if v_uid is not null and (v_away is distinct from v_uid or v_away is null) then
        raise exception 'No se puede abrir el lado B asi';
      end if;

      select count(*) into v_side_b_count
      from public.match_slots s
      where s.match_id = new.match_id and s.side = 'b';

      if v_side_b_count >= 2 then
        raise exception 'El lado B ya tiene el maximo de cupos';
      end if;
    end if;
  end if;
  return new;
end;
$function$;
