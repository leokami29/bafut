import { CompositionPlan, LayerSpec, SemanticPosition, ImageLayerSpec } from "./types";

/**
 * Layout engine: posición semántica → coordenadas (px), respetando safe areas.
 * Determinista y simple: rejilla de tercios + roles por defecto.
 * El escape hatch `layer.rect` (px absolutos) siempre gana.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function defaultSafeArea(canvas: { width: number; height: number }): { top: number; right: number; bottom: number; left: number } {
  const inset = Math.max(48, Math.round(Math.min(canvas.width, canvas.height) * 0.06));
  return { top: inset, right: inset, bottom: inset, left: inset };
}

/** Rect base según posición semántica dentro del área segura (rejilla 3x3). */
export function semanticRect(
  position: SemanticPosition,
  canvas: { width: number; height: number },
  safe: { top: number; right: number; bottom: number; left: number },
  sizeHint?: { width?: number; height?: number },
): Rect {
  const innerW = canvas.width - safe.left - safe.right;
  const innerH = canvas.height - safe.top - safe.bottom;
  const col = innerW / 3;
  const row = innerH / 3;

  let x = safe.left;
  let y = safe.top;
  let width = innerW;
  let height = innerH;

  switch (position as SemanticPosition) {
    case "full":
      // full-bleed completo (ignora safe area)
      return { x: 0, y: 0, width: canvas.width, height: canvas.height };
    case "top-left": x = safe.left; y = safe.top; width = col * 2; height = row; break;
    case "top": x = safe.left; y = safe.top; width = innerW; height = row; break;
    case "top-right": x = safe.left + innerW - col; y = safe.top; width = col; height = row; break;
    case "left": x = safe.left; y = safe.top; width = col; height = innerH; break;
    case "center": x = safe.left + col / 2; y = safe.top + row; width = col * 2; height = row; break;
    case "right": x = safe.left + innerW - col; y = safe.top; width = col; height = innerH; break;
    case "bottom-left": x = safe.left; y = safe.top + innerH - row; width = col * 2; height = row; break;
    case "bottom": x = safe.left; y = safe.top + innerH - row; width = innerW; height = row; break;
    case "bottom-right": x = safe.left + innerW - col; y = safe.top + innerH - row; width = col; height = row; break;
  }

  // sizeHint relativo al canvas, anclado a la celda según la posición
  if (sizeHint?.width !== undefined) {
    const w = Math.round(canvas.width * sizeHint.width);
    if (position.includes("right")) x = x + width - w;
    else if (!position.includes("left")) x = x + (width - w) / 2;
    width = w;
  }
  if (sizeHint?.height !== undefined) {
    const h = Math.round(canvas.height * sizeHint.height);
    if (position.includes("bottom") || position === "bottom") y = y + height - h;
    else if (position.includes("top")) y = y;
    else y = y + (height - h) / 2;
    height = h;
  }

  return {
    x: Math.round(Math.max(0, x + 0)),
    y: Math.round(Math.max(0, y)),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** Rect final de una capa (rect explícito gana; offset se aplica después). */
export function layerRect(plan: CompositionPlan, layer: LayerSpec): Rect {
  const safe = plan.safeArea ?? defaultSafeArea(plan.canvas);
  const base =
    layer.rect ??
    (layer.position
      ? semanticRect(layer.position, plan.canvas, safe, layer.sizeHint)
      : defaultRectForRole(layer, plan.canvas, safe));
  const off = layer.offset ?? {};
  return {
    x: Math.round(base.x + (off.x ?? 0)),
    y: Math.round(base.y + (off.y ?? 0)),
    width: base.width,
    height: base.height,
  };
}

/** Rect por defecto según rol (cuando no hay position ni rect). */
function defaultRectForRole(layer: LayerSpec, canvas: { width: number; height: number }, safe: { top: number; right: number; bottom: number; left: number }): Rect {
  const innerW = canvas.width - safe.left - safe.right;
  const innerH = canvas.height - safe.top - safe.bottom;
  switch (layer.role) {
    case "background":
    case "texture":
      return { x: 0, y: 0, width: canvas.width, height: canvas.height };
    case "hero":
      return semanticRect("right", canvas, safe, { width: 0.62, height: 0.85 });
    case "logo":
      return { ...semanticRect("top-right", canvas, safe), width: Math.round(canvas.width * 0.16), height: Math.round(canvas.width * 0.16) };
    case "headline":
      return semanticRect("top-left", canvas, safe, { width: 0.72 });
    case "subheadline": {
      const h = semanticRect("top-left", canvas, safe, { width: 0.6 });
      return { ...h, y: h.y + Math.round(canvas.height * 0.16) };
    }
    case "cta":
      return semanticRect("bottom-left", canvas, safe, { width: 0.7, height: 0.1 });
    default:
      return { x: safe.left, y: safe.top, width: innerW, height: innerH };
  }
}

/** Tamaño de fuente por defecto según rol (jerarquía visual determinista). */
export function defaultFontSize(role: string, canvas: { height: number }): number {
  switch (role) {
    case "headline": return Math.round(canvas.height * 0.085);
    case "subheadline": return Math.round(canvas.height * 0.042);
    case "cta": return Math.round(canvas.height * 0.032);
    case "logo": return Math.round(canvas.height * 0.03);
    default: return Math.round(canvas.height * 0.028);
  }
}

/** Orden canónico de z-index por rol (fallback si se altera el orden del array). */
export const DEFAULT_Z_ORDER: Record<string, number> = {
  background: 0,
  overlay: 1,
  texture: 2,
  decorative: 3,
  hero: 4,
  foreground: 5,
  headline: 6,
  subheadline: 7,
  cta: 8,
  logo: 9,
};

export function zIndexFor(layer: LayerSpec, index: number, layers: LayerSpec[]): number {
  const canonical = DEFAULT_Z_ORDER[layer.role];
  if (canonical !== undefined) {
    // las capas posteriores con el MISMO rol quedan por encima (index como desempate)
    return canonical * 100 + index;
  }
  // rol desconocido: por encima de lo canónico, en orden de aparición
  const maxCanonical = Math.max(...Object.values(DEFAULT_Z_ORDER));
  return (maxCanonical + 1) * 100 + index - layers.indexOf(layer);
}

/** Imágenes del plan: utilidades para el pipeline de assets. */
export function imageLayers(plan: CompositionPlan): ImageLayerSpec[] {
  return plan.layers.filter((l): l is ImageLayerSpec => l.type === "image");
}
