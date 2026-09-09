/** Traduce errores técnicos de RPC Premium a copy usable en la consola. */
export function friendlyPremiumAdminError(message: string): string {
  const normalized = message.trim();
  const map: Record<string, string> = {
    "new_expires_at debe ser posterior al expires_at actual":
      "La nueva fecha de fin debe ser posterior al vencimiento actual. Elegí un día más tarde.",
    "Extensión máxima 366 días":
      "La extensión no puede superar 366 días desde el vencimiento actual (o desde hoy si ya venció).",
    "Solo se extiende una suscripción active":
      "Solo se puede extender una suscripción activa.",
    "Solo se extiende plan premium": "Solo aplica a plan Premium.",
    "Suscripción no encontrada": "No encontramos esa suscripción.",
    "Solo billing/super pueden extender Premium":
      "Sin permiso: necesitás rol billing o super.",
    "Solo billing/super pueden otorgar Premium":
      "Sin permiso: necesitás rol billing o super.",
    "Solo billing/super pueden cancelar Premium":
      "Sin permiso: necesitás rol billing o super.",
    "No autenticado": "Sesión vencida. Volvé a iniciar sesión.",
    "amount_cop no válido": "El monto en COP no es válido.",
    "Demasiadas operaciones de suscripción. Esperá un rato.":
      "Demasiadas operaciones seguidas. Esperá un rato e intentá de nuevo.",
  };
  if (map[normalized]) return map[normalized];
  for (const [key, value] of Object.entries(map)) {
    if (normalized.includes(key)) return value;
  }
  return normalized;
}
