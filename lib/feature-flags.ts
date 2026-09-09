import { createClient } from "@/lib/supabase/server";

export const FEATURE_FLAG_KEYS = [
  "premium_paywall",
  "push_alerts",
  "directory_premium_boost",
  "venue_booking",
  "venue_tournaments",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export const FEATURE_FLAG_ENV: Record<FeatureFlagKey, string> = {
  premium_paywall: "FEATURE_PREMIUM_PAYWALL",
  push_alerts: "FEATURE_PUSH_ALERTS",
  directory_premium_boost: "FEATURE_DIRECTORY_PREMIUM_BOOST",
  venue_booking: "FEATURE_VENUE_BOOKING",
  venue_tournaments: "FEATURE_VENUE_TOURNAMENTS",
};

const ENV_BY_KEY = FEATURE_FLAG_ENV;

/**
 * Default si no hay env ni fila DB.
 * Excepción: `venue_booking` y `venue_tournaments` arrancan OFF (kill-switch).
 * Torneos: además del flag, cada cancha necesita Premium activo
 * (`venueHasActivePremium` / `canManageVenueTournaments`).
 */
const DEFAULT_BY_KEY: Record<FeatureFlagKey, boolean> = {
  premium_paywall: true,
  push_alerts: true,
  directory_premium_boost: true,
  venue_booking: false,
  venue_tournaments: false,
};

/** Default efectivo si no hay env ni fila DB (tests / docs). */
export function featureFlagDefault(key: FeatureFlagKey): boolean {
  return DEFAULT_BY_KEY[key];
}

/** Parsea FEATURE_* env: 0/false/off/no → false; 1/true/on/yes → true; vacío → null. */
export function parseFeatureEnv(raw: string | undefined): boolean | null {
  if (raw == null) return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (["0", "false", "off", "no", "disabled"].includes(v)) return false;
  if (["1", "true", "on", "yes", "enabled"].includes(v)) return true;
  return null;
}

/**
 * Kill-switch:
 * 1) Env FEATURE_* si está seteado (fuerza on/off; requiere restart).
 * 2) Fila DB `feature_flags` (toggle sin redeploy).
 * 3) Default por key (casi siempre true; venue_booking / venue_tournaments false).
 */
export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const fromEnv = parseFeatureEnv(process.env[ENV_BY_KEY[key]]);
  if (fromEnv !== null) return fromEnv;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", key)
      .maybeSingle();
    if (data && typeof data.enabled === "boolean") return data.enabled;
  } catch {
    // Si la tabla aún no existe o falla la query, no tumbar la app.
  }
  return DEFAULT_BY_KEY[key];
}

export async function getFeatureFlags(
  keys: readonly FeatureFlagKey[] = FEATURE_FLAG_KEYS,
): Promise<Record<FeatureFlagKey, boolean>> {
  const result = {} as Record<FeatureFlagKey, boolean>;
  await Promise.all(
    keys.map(async (key) => {
      result[key] = await isFeatureEnabled(key);
    }),
  );
  return result;
}
