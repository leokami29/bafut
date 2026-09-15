/**
 * URL absoluta del panel Admin (app aparte: BaFut_Admin).
 * BaFut web solo redirige / enlaza; no sirve paneles.
 */
export function resolveAdminAppOrigin(env: {
  NEXT_PUBLIC_OPS_URL?: string | null;
  NEXT_PUBLIC_ADMIN_URL?: string | null;
  OPS_APP_URL?: string | null;
} = {
  NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL,
  NEXT_PUBLIC_OPS_URL: process.env.NEXT_PUBLIC_OPS_URL,
  OPS_APP_URL: process.env.OPS_APP_URL,
}): string {
  const raw = (
    env.NEXT_PUBLIC_ADMIN_URL ||
    env.NEXT_PUBLIC_OPS_URL ||
    env.OPS_APP_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  return raw || "http://localhost:3006";
}

/** Path del panel (ej. `/canchas/foo/admin`) → URL absoluta en BaFut_Admin. */
export function adminAppUrl(path: string): string {
  const origin = resolveAdminAppOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}
