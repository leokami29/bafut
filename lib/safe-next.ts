const ALLOWED = /^\/(p\/[a-z0-9-]+|partidos|canchas|perfil)(\/|$|\?)/i;

export function safeNextPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  const next = raw.trim();
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  if (next.includes("://")) {
    return fallback;
  }
  return ALLOWED.test(next) ? next : fallback;
}
