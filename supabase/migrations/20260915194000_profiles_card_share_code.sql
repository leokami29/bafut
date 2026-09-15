-- Código corto público para compartir la carta del jugador (/carta/{code}).
-- No expone user_id ni WhatsApp; análogo a matches.share_code.

alter table public.profiles
  add column if not exists card_share_code text;

update public.profiles
set card_share_code = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where card_share_code is null;

alter table public.profiles
  alter column card_share_code set default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  alter column card_share_code set not null;

create unique index if not exists profiles_card_share_code_uidx
  on public.profiles (card_share_code);

comment on column public.profiles.card_share_code is 'Slug público para /carta/{code} y OG de la carta.';
