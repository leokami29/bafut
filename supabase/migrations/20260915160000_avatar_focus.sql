-- Recorte de foto de ficha: qué parte de la imagen se ve en la carta.
alter table public.profiles
  add column if not exists avatar_focus_x numeric(5, 2) not null default 50,
  add column if not exists avatar_focus_y numeric(5, 2) not null default 22,
  add column if not exists avatar_zoom numeric(4, 2) not null default 1;

alter table public.profiles drop constraint if exists profiles_avatar_focus_x_chk;
alter table public.profiles
  add constraint profiles_avatar_focus_x_chk check (avatar_focus_x between 0 and 100);

alter table public.profiles drop constraint if exists profiles_avatar_focus_y_chk;
alter table public.profiles
  add constraint profiles_avatar_focus_y_chk check (avatar_focus_y between 0 and 100);

alter table public.profiles drop constraint if exists profiles_avatar_zoom_chk;
alter table public.profiles
  add constraint profiles_avatar_zoom_chk check (avatar_zoom between 1 and 2.5);

comment on column public.profiles.avatar_focus_x is 'object-position X (0-100) de la foto en la carta';
comment on column public.profiles.avatar_focus_y is 'object-position Y (0-100) de la foto en la carta';
comment on column public.profiles.avatar_zoom is 'Escala 1-2.5 del recorte de la foto';
