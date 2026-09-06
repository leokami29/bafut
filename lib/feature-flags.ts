import { createClient } from "@/lib/supabase/server";

export const FEATURE_FLAG_KEYS = [
  "premium_paywall",
  "push_alerts",
  "directory_premium_boost",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

const ENV_BY_KEY: Record<FeatureFlagKey, string> = {
  premium_paywall: "FEATURE_PREMIUM_PAYWALL",
  push_alerts: "FEATURE_PUSH_ALERTS",
  directory_premium_boost: "FEATURE_DIRECTORY_PREMIUM_BOOST",
};

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
 * 3) Default true.
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
  return true;
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
