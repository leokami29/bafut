const ALLOWED =
  /^\/(p\/[a-z0-9-]+|partidos(?:\/nuevo)?|canchas(?:\/[a-z0-9-]+)?|perfil(?:\/partidos)?)(?:\?[^#]*)?$/i;

export function safeNextPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;

  let next = raw.trim();
  try {
    next = decodeURIComponent(next);
  } catch {
    return fallback;
  }

  next = next.trim();
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.includes("..")) {
    return fallback;
  }
  if (next.includes("://") || next.includes("@")) {
    return fallback;
  }

  // Collapse duplicate slashes without turning "//evil" into a protocol-relative URL.
  next = `/${next.replace(/^\/+/, "").replace(/\/+/g, "/")}`;

  return ALLOWED.test(next) ? next : fallback;
}
