/** Suscripción activa + plan premium (misma regla que el directorio y admin). */
export function isActivePremiumSubscription(sub: {
  status: string;
  plan: string;
  expires_at: string;
}) {
  return (
    sub.status === "active" &&
    sub.plan === "premium" &&
    new Date(sub.expires_at).getTime() > Date.now()
  );
}

export function venueHasActivePremium(
  subscriptions: Array<{ status: string; plan: string; expires_at: string }> | null | undefined,
) {
  return (subscriptions ?? []).some(isActivePremiumSubscription);
}
