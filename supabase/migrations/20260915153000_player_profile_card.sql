-- Ficha de jugador (carta viva): foto, formato, términos y datos opcionales.
-- Lo mínimo para pedir cupo vive en profiles + profile_contacts (WhatsApp).
-- Campos biométricos/preferencias van en profiles porque salen en la carta pública;
-- la política de privacidad declara el tratamiento.

alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists preferred_format text,
  add column if not exists secondary_position text,
  add column if not exists preferred_foot text,
  add column if not exists birth_date date,
  add column if not exists gender text,
  add column if not exists height_cm smallint,
  add column if not exists weight_kg smallint,
  add column if not exists neighborhood text,
  add column if not exists preferred_days text[] not null default '{}',
  add column if not exists preferred_time_slots text[] not null default '{}',
  add column if not exists plays_for_pay boolean not null default false,
  add column if not exists terms_accepted_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_preferred_format_chk;
alter table public.profiles
  add constraint profiles_preferred_format_chk
  check (
    preferred_format is null
    or preferred_format in ('2v2', '3v3', '4v4', '5v5', '6v6', '7v7', '8v8', '11v11')
  );

alter table public.profiles
  drop constraint if exists profiles_secondary_position_chk;
alter table public.profiles
  add constraint profiles_secondary_position_chk
  check (
    secondary_position is null
    or secondary_position in (
      'any', 'gk', 'def', 'mid', 'fwd', 'cierre', 'ala', 'pivot',
      'base', 'escolta', 'ala_pivot', 'armador', 'central', 'opuesto',
      'receptor', 'libero', 'drive', 'reves'
    )
  );

alter table public.profiles
  drop constraint if exists profiles_preferred_foot_chk;
alter table public.profiles
  add constraint profiles_preferred_foot_chk
  check (preferred_foot is null or preferred_foot in ('right', 'left', 'both'));

alter table public.profiles
  drop constraint if exists profiles_gender_chk;
alter table public.profiles
  add constraint profiles_gender_chk
  check (gender is null or gender in ('woman', 'man', 'other', 'undisclosed'));

alter table public.profiles
  drop constraint if exists profiles_height_cm_chk;
alter table public.profiles
  add constraint profiles_height_cm_chk
  check (height_cm is null or (height_cm between 120 and 230));

alter table public.profiles
  drop constraint if exists profiles_weight_kg_chk;
alter table public.profiles
  add constraint profiles_weight_kg_chk
  check (weight_kg is null or (weight_kg between 35 and 180));

alter table public.profiles
  drop constraint if exists profiles_neighborhood_chk;
alter table public.profiles
  add constraint profiles_neighborhood_chk
  check (neighborhood is null or char_length(neighborhood) between 1 and 80);

alter table public.profiles
  drop constraint if exists profiles_preferred_days_chk;
alter table public.profiles
  add constraint profiles_preferred_days_chk
  check (preferred_days <@ array['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']::text[]);

alter table public.profiles
  drop constraint if exists profiles_preferred_time_slots_chk;
alter table public.profiles
  add constraint profiles_preferred_time_slots_chk
  check (preferred_time_slots <@ array['manana', 'tarde', 'noche']::text[]);

alter table public.profiles
  drop constraint if exists profiles_birth_date_chk;
alter table public.profiles
  add constraint profiles_birth_date_chk
  check (birth_date is null or birth_date >= date '1920-01-01');

alter table public.profiles
  drop constraint if exists profiles_avatar_path_chk;
alter table public.profiles
  add constraint profiles_avatar_path_chk
  check (
    avatar_path is null
    or (
      avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
    )
  );

comment on column public.profiles.avatar_path is 'Objeto en bucket profile-avatars: {user_id}/{uuid}.ext';
comment on column public.profiles.terms_accepted_at is 'Aceptación de términos y privacidad para usar la ficha.';

-- Storage: fotos de perfil públicas (la carta se ve en pedidos de cupo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_avatars_select on storage.objects;
create policy profile_avatars_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'profile-avatars');

drop policy if exists profile_avatars_insert on storage.objects;
create policy profile_avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
  );

drop policy if exists profile_avatars_update on storage.objects;
create policy profile_avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
  );

drop policy if exists profile_avatars_delete on storage.objects;
create policy profile_avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
  );
