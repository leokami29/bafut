/** UUID v1–v5 (formato canónico). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Share code de partido: 8 hex. */
const SHARE_CODE_RE = /^[a-f0-9]{8}$/;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isShareCode(value: string): boolean {
  return SHARE_CODE_RE.test(value);
}
