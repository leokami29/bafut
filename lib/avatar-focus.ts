import type { CSSProperties } from "react";

export type AvatarFocus = {
  x: number;
  y: number;
  zoom: number;
};

/** Centro-arriba: cara típica de foto de cuerpo. */
export const DEFAULT_AVATAR_FOCUS: AvatarFocus = { x: 50, y: 22, zoom: 1 };

const X_MIN = 0;
const X_MAX = 100;
const Y_MIN = 0;
const Y_MAX = 100;
export const AVATAR_ZOOM_MIN = 1;
/** Alineado con profiles_avatar_zoom_chk (1–2.5). */
export const AVATAR_ZOOM_MAX = 2.5;

const ZOOM_MIN = AVATAR_ZOOM_MIN;
const ZOOM_MAX = AVATAR_ZOOM_MAX;

function clamp(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function round(n: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function clampAvatarFocus(input?: Partial<AvatarFocus> | null): AvatarFocus {
  return {
    x: round(clamp(Number(input?.x), X_MIN, X_MAX, DEFAULT_AVATAR_FOCUS.x), 1),
    y: round(clamp(Number(input?.y), Y_MIN, Y_MAX, DEFAULT_AVATAR_FOCUS.y), 1),
    zoom: round(clamp(Number(input?.zoom), ZOOM_MIN, ZOOM_MAX, DEFAULT_AVATAR_FOCUS.zoom), 2),
  };
}

export function avatarFocusFromProfile(profile: {
  avatar_focus_x?: number | string | null;
  avatar_focus_y?: number | string | null;
  avatar_zoom?: number | string | null;
}): AvatarFocus {
  return clampAvatarFocus({
    x: profile.avatar_focus_x == null ? DEFAULT_AVATAR_FOCUS.x : Number(profile.avatar_focus_x),
    y: profile.avatar_focus_y == null ? DEFAULT_AVATAR_FOCUS.y : Number(profile.avatar_focus_y),
    zoom: profile.avatar_zoom == null ? DEFAULT_AVATAR_FOCUS.zoom : Number(profile.avatar_zoom),
  });
}

export function avatarFocusStyle(focus: AvatarFocus): CSSProperties {
  const next = clampAvatarFocus(focus);
  return {
    ["--avatar-x" as string]: `${next.x}%`,
    ["--avatar-y" as string]: `${next.y}%`,
    ["--avatar-zoom" as string]: String(next.zoom),
  };
}

/** Arrastrar a la derecha muestra más la izquierda de la foto (la imagen sigue el dedo). */
export function panAvatarFocus(
  start: AvatarFocus,
  dxPx: number,
  dyPx: number,
  viewport: { width: number; height: number },
): AvatarFocus {
  const width = Math.max(viewport.width, 1);
  const height = Math.max(viewport.height, 1);
  const zoom = Math.max(start.zoom, 1);
  return clampAvatarFocus({
    x: start.x - (dxPx / width) * (100 / zoom),
    y: start.y - (dyPx / height) * (100 / zoom),
    zoom: start.zoom,
  });
}

export function parseAvatarFocusFields(formData: FormData): AvatarFocus {
  function read(name: string, fallback: number) {
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }
  return clampAvatarFocus({
    x: read("avatar_focus_x", DEFAULT_AVATAR_FOCUS.x),
    y: read("avatar_focus_y", DEFAULT_AVATAR_FOCUS.y),
    zoom: read("avatar_zoom", DEFAULT_AVATAR_FOCUS.zoom),
  });
}
