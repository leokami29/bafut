-- Copy visible: Premium -> Exclusivo (flags). El key/plan interno sigue siendo premium.
update public.feature_flags
set description = 'Mostrar paywall / solicitud Exclusivo a dueños'
where key = 'premium_paywall'
  and description ilike '%premium%';

update public.feature_flags
set description = 'Priorizar canchas exclusivas en el directorio'
where key = 'directory_premium_boost'
  and description ilike '%premium%';

update public.feature_flags
set description = 'Torneos exclusivos por cancha (kill-switch global; además requiere plan Exclusivo activo)'
where key = 'venue_tournaments'
  and description ilike '%premium%';
