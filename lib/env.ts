export function supabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

export function supabasePublishableKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return key;
}

/**
 * URL pública canónica (auth redirects, OG, shares).
 * - Prod Railway: NEXT_PUBLIC_SITE_URL=https://bafut.macuttech.com (build-time).
 * - Dev: http://localhost:3005 — nunca 8080 (ese es el puerto interno de Railway).
 */
export function siteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fromRailway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  const fromVercel = process.env.VERCEL_URL?.trim();

  const raw =
    fromEnv ||
    (fromRailway ? `https://${fromRailway}` : null) ||
    (fromVercel ? `https://${fromVercel}` : null) ||
    "http://localhost:3005";

  return normalizeSiteUrl(raw);
}

/** Corrige configs viejas (localhost:8080) y quita trailing slash. */
function normalizeSiteUrl(raw: string): string {
  let value = raw.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      // 8080 = puerto interno Railway / otra app; 3000 = default viejo de Supabase/Next.
      // BaFut local es siempre 3005.
      if (url.port === "8080" || url.port === "3000" || url.port === "") {
        return "http://localhost:3005";
      }
      url.protocol = "http:";
      return url.origin;
    }
    return url.origin;
  } catch {
    return "http://localhost:3005";
  }
}

/** True si el origin no es el site canónico (p. ej. https://localhost:8080). */
export function isNonCanonicalOrigin(origin: string): boolean {
  try {
    return new URL(origin).origin !== new URL(siteUrl()).origin;
  } catch {
    return true;
  }
}
