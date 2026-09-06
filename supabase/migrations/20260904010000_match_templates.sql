-- Partidos recurrentes: templates que auto-publican partidos cada semana.

create table public.match_templates (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  sport text not null default 'futbol',
  format text not null default '5v5',
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=domingo, 6=sábado
  starts_at_time time not null, -- hora civil en timezone de la ciudad
  duration_min int not null default 60 check (duration_min in (30, 60, 90)),
  open_count int not null default 5 check (open_count between 1 and 12),
  cost_per_person int,
  gender_policy text not null default 'mixed' check (gender_policy in ('mixed', 'men', 'women')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_templates_sport_check check (sport in ('futbol', 'futbol_sala', 'basquet', 'voleibol', 'padel')),
  constraint match_templates_format_check check (format in ('2v2', '3v3', '4v4', '5v5', '6v6', '7v7', '8v8', '11v11'))
);

create index match_templates_host_idx on public.match_templates (host_id);
create index match_templates_venue_idx on public.match_templates (venue_id);
create index match_templates_active_idx on public.match_templates (active, day_of_week);

alter table public.match_templates enable row level security;

create policy match_templates_select on public.match_templates
  for select to authenticated
  using (host_id = (select auth.uid()));

create policy match_templates_insert on public.match_templates
  for insert to authenticated
  with check (host_id = (select auth.uid()));

create policy match_templates_update on public.match_templates
  for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

create policy match_templates_delete on public.match_templates
  for delete to authenticated
  using (host_id = (select auth.uid()));

-- Tabla de log: qué partidos se crearon desde templates.
create table public.match_template_runs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.match_templates(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  run_date date not null,
  created_at timestamptz not null default now(),
  unique (template_id, run_date)
);

create index match_template_runs_date_idx on public.match_template_runs (run_date);

alter table public.match_template_runs enable row level security;

create policy match_template_runs_select on public.match_template_runs
  for select to authenticated
  using (
    exists (
      select 1 from public.match_templates t
      where t.id = template_id and t.host_id = (select auth.uid())
    )
  );

-- RPC para crear partido desde template (llamado por cron job).
create or replace function public.create_match_from_template(
  p_template_id uuid,
  p_run_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template record;
  v_city_id uuid;
  v_city_tz text;
  v_starts_at timestamptz;
  v_match_id uuid;
  v_slot_count int;
  v_i int;
begin
  -- Buscar template activo y obtener datos relacionados.
  select t.*
    into v_template
  from public.match_templates t
  where t.id = p_template_id
    and t.active = true;

  if not found then
    raise exception 'Template no encontrado o inactivo';
  end if;

  -- Obtener city_id y timezone de la cancha.
  select v.city_id, c.timezone
    into v_city_id, v_city_tz
  from public.venues v
  join public.cities c on c.id = v.city_id
  where v.id = v_template.venue_id;

  if v_city_id is null then
    raise exception 'Cancha o ciudad no encontrada';
  end if;

  -- Verificar que no exista ya un partido para esta fecha.
  if exists (
    select 1
    from public.match_template_runs
    where template_id = p_template_id and run_date = p_run_date
  ) then
    raise exception 'Ya se creó partido para esta fecha';
  end if;

  -- Calcular starts_at: combinar fecha + hora del template en timezone de la ciudad.
  v_starts_at := (p_run_date + v_template.starts_at_time) at time zone v_city_tz;

  -- Crear partido.
  insert into public.matches (
    city_id,
    venue_id,
    host_id,
    starts_at,
    duration_min,
    sport,
    format,
    cost_per_person,
    gender_policy,
    notes,
    status
  )
  values (
    v_city_id,
    v_template.venue_id,
    v_template.host_id,
    v_starts_at,
    v_template.duration_min,
    v_template.sport,
    v_template.format,
    v_template.cost_per_person,
    v_template.gender_policy,
    v_template.notes,
    'open'
  )
  returning id into v_match_id;

  -- Crear cupos.
  v_slot_count := v_template.open_count;
  for v_i in 1..v_slot_count loop
    insert into public.match_slots (match_id, position, level, side)
    values (v_match_id, 'any', 'any', 'a');
  end loop;

  -- Log.
  insert into public.match_template_runs (template_id, match_id, run_date)
  values (p_template_id, v_match_id, p_run_date);

  return v_match_id;
end;
$$;

revoke all on function public.create_match_from_template(uuid, date) from public;
grant execute on function public.create_match_from_template(uuid, date) to authenticated;
