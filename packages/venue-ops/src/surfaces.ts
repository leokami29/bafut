/**
 * Manifest de superficies: BaFut web vs BaFut_Admin (app aparte).
 * Usado por proxy de web para redirect 308 hacia Admin.
 */

export type BafutSurface = "web" | "ops" | "all";

export function parseBafutSurface(raw: string | undefined | null): BafutSurface {
  const v = (raw ?? "all").trim().toLowerCase();
  if (v === "web" || v === "public") return "web";
  if (v === "ops" || v === "admin") return "ops";
  return "all";
}

/** Prefijos de ruta que pertenecen a la app ops. */
export const OPS_PATH_PREFIXES = [
  "/admin",
  "/api/cron",
] as const;

export function isOpsVenueAdminPath(pathname: string): boolean {
  return /^\/canchas\/[^/]+\/admin(\/|$)/.test(pathname);
}

export function isOpsPath(pathname: string): boolean {
  if (OPS_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  return isOpsVenueAdminPath(pathname);
}

export function isPathAllowedForSurface(
  pathname: string,
  surface: BafutSurface,
): boolean {
  if (surface === "all") return true;
  const ops = isOpsPath(pathname);
  if (surface === "ops") return ops;
  return !ops;
}

/** URL absoluta del panel ops (sin trailing slash). */
export function resolveOpsOrigin(env: {
  NEXT_PUBLIC_OPS_URL?: string | null;
  OPS_APP_URL?: string | null;
}): string {
  const raw = (env.NEXT_PUBLIC_OPS_URL || env.OPS_APP_URL || "").trim().replace(/\/$/, "");
  return raw || "http://localhost:3006";
}

export function resolveWebOrigin(env: {
  NEXT_PUBLIC_SITE_URL?: string | null;
  NEXT_PUBLIC_APP_URL?: string | null;
}): string {
  const raw = (env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/$/, "");
  return raw || "http://localhost:3005";
}

export function rewriteAdminPathToOps(
  pathname: string,
  search: string,
  opsOrigin: string,
): string {
  return `${opsOrigin}${pathname}${search}`;
}
