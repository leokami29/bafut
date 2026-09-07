import { AssetMetadata } from "../assets/types";

/**
 * Contratos del motor de composición creativa (Fase 5).
 * BRIEF → CompositionPlan → AssetPlan → Search/Download/Process → PenpotAdapter → Export.
 */

// ---------- Brief ----------

export interface CreativeBriefFormat {
  width: number;
  height: number;
  /** Nombre del preset si aplica (ig-portrait, ig-square, story, landscape). */
  preset?: string;
}

export interface CreativeBrief {
  campaignId: string;
  brandId?: string;
  objective: string;
  format: CreativeBriefFormat;
  headline?: string;
  subheadline?: string;
  body?: string;
  callToAction?: string;
  ctaUrl?: string;
  visualStyle?: string;
  targetAudience?: string;
  requirements?: string[];
}

// ---------- Asset plan ----------

export type AssetRole = "background" | "hero" | "decorative" | "texture" | "foreground" | "logo";

export interface AssetPlanItem {
  /** Referencia interna dentro del plan ("hero-player", "stadium", ...). */
  id: string;
  role: AssetRole;
  /** Query para el SearchEngine (fase 2). */
  query?: string;
  /** Asset YA existente en el sistema (salta search/download). */
  sourceAssetId?: string;
  requiresBackgroundRemoval?: boolean;
  tags?: string[];
  /** Procesamiento adicional (pipeline JSON de fase 4, después del remove-bg). */
  processing?: ProcessingStepSpec[];
  minResolution?: { width: number; height: number };
}

export interface ProcessingStepSpec {
  type: string;
  options?: Record<string, unknown>;
}

// ---------- Layers ----------

export type SemanticPosition =
  | "top-left" | "top" | "top-right"
  | "left" | "center" | "right"
  | "bottom-left" | "bottom" | "bottom-right"
  | "full";

export interface BaseLayer {
  role: string;
  /** Orden explícito: el array define el z-order (último = arriba). */
  visible?: boolean;
  opacity?: number;
  /** Posición semántica (motor de layout) o rect absoluto (escape hatch). */
  position?: SemanticPosition;
  rect?: { x: number; y: number; width: number; height: number };
  /** Ajustes finos sobre la posición semántica, en px. */
  offset?: { x?: number; y?: number };
  /** Tamaño relativo al canvas (0-1) cuando la posición es semántica. */
  sizeHint?: { width?: number; height?: number };
  bleed?: boolean; // ignora safe area (fondos, texturas)
}

export interface ImageLayerSpec extends BaseLayer {
  type: "image";
  /** id del AssetPlanItem o assetId existente del sistema. */
  asset: string;
  fit?: "cover" | "contain";
  radius?: number;
  shadow?: { color: string; opacity: number; blur: number; offsetX?: number; offsetY?: number };
}

export interface TextLayerSpec extends BaseLayer {
  type: "text";
  content: string;
  /** Solo para sobreescribir la marca; si falta, usa brand.json. */
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  lineHeight?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
  color?: string;
  /** token de color de marca, p. ej. "flood" */
  colorFromBrand?: string;
}

export interface ShapeLayerSpec extends BaseLayer {
  type: "shape";
  shape: "rectangle" | "ellipse" | "line";
  fill?: string;
  radius?: number;
  stroke?: { color: string; width: number };
}

export interface OverlayLayerSpec extends BaseLayer {
  type: "overlay";
  color: string;
  /** Gradiente sobre el color base (dirección + opacidad de parada). */
  gradient?: {
    direction: "up" | "down" | "left" | "right";
    opacity: number; // opacidad de la parada fuerte
  };
}

export type LayerSpec = ImageLayerSpec | TextLayerSpec | ShapeLayerSpec | OverlayLayerSpec;

// ---------- Composition plan ----------

export interface CompositionPlan {
  canvas: CreativeBriefFormat;
  brandId?: string;
  backgroundColor?: string;
  layers: LayerSpec[];
  assets: AssetPlanItem[];
  /** Safe area en px (default: 6% del lado menor, mínimo 48px). */
  safeArea?: { top: number; right: number; bottom: number; left: number };
}

export interface CampaignManifest {
  brief: CreativeBrief;
  composition: CompositionPlan;
  /** Estado de la campaña en el sistema. */
  status: "draft" | "needs_assets" | "assets_ready" | "composed" | "exported";
  createdAt: string;
  /** Registrado por el agente tras componer en Penpot. */
  penpot?: { boardId?: string; exportedShapes?: string[] };
}

// ---------- Formatos ----------

export const FORMAT_PRESETS: Record<string, CreativeBriefFormat> = {
  "ig-portrait": { width: 1080, height: 1350, preset: "ig-portrait" },
  "ig-square": { width: 1080, height: 1080, preset: "ig-square" },
  story: { width: 1080, height: 1920, preset: "story" },
  landscape: { width: 1920, height: 1080, preset: "landscape" },
};

export const CANVAS_FORMATS = Object.values(FORMAT_PRESETS).map((f) => `${f.width}x${f.height}`);

// ---------- Brand (integración Fase 1) ----------

export interface BrandStyles {
  id: string;
  colors: Record<string, string>;
  fonts: { display: string; body: string; mono: string };
  tagline?: string;
  website?: string;
  logoAssetId?: string;
}

// ---------- Validación ----------

export function validateBrief(brief: CreativeBrief): string[] {
  const errors: string[] = [];
  if (!brief?.campaignId || typeof brief.campaignId !== "string" || !/^[a-z0-9-]+$/i.test(brief.campaignId)) {
    errors.push("campaignId es obligatorio (letras, números y guiones).");
  }
  if (!brief?.objective) errors.push("objective es obligatorio.");
  if (!brief?.format || !Number.isInteger(brief.format.width) || !Number.isInteger(brief.format.height) || brief.format.width < 64 || brief.format.height < 64) {
    errors.push("format.width/height deben ser enteros >= 64.");
  }
  return errors;
}

export function validatePlan(plan: CompositionPlan): string[] {
  const errors: string[] = [];
  if (!plan?.canvas || !Number.isInteger(plan.canvas.width) || !Number.isInteger(plan.canvas.height)) {
    errors.push("canvas.width/height inválidos.");
  }
  if (!Array.isArray(plan.layers) || plan.layers.length === 0) {
    errors.push("layers debe ser un array con al menos una capa.");
    return errors;
  }
  const assetIds = new Set(plan.assets.map((a) => a.id));
  const extraAssetIds = new Set<string>();
  for (const l of plan.layers) {
    if (l.type === "image") {
      if (!assetIds.has(l.asset) && !/^asset_[a-f0-9]{16}$/.test(l.asset)) {
        errors.push(`Capa imagen referencia asset desconocido: "${l.asset}"`);
      }
      extraAssetIds.add(l.asset);
    }
    if (l.type === "text" && !l.content?.trim()) {
      errors.push(`Capa texto sin contenido (rol: ${l.role}).`);
    }
    if (l.opacity !== undefined && (l.opacity < 0 || l.opacity > 1)) {
      errors.push(`opacity fuera de rango en capa ${l.role}.`);
    }
  }
  // assets declarados pero no usados: aviso, no error
  for (const a of plan.assets) {
    if (!extraAssetIds.has(a.id) && !a.role) errors.push(`Asset plan "${a.id}" sin rol.`);
  }
  return errors;
}

/** Assets referenciados por las capas, en orden (para ejecutar search/process). */
export function requiredAssetIds(plan: CompositionPlan): string[] {
  return plan.layers.filter((l): l is ImageLayerSpec => l.type === "image").map((l) => l.asset);
}

// ---------- Reconciliación con assets existentes ----------

export interface AssetResolution {
  planItem: AssetPlanItem;
  status: "missing" | "ready" | "needs_processing";
  /** Metadata del asset existente (si ya está en el sistema). */
  metadata?: AssetMetadata;
  /** Pasos de procesamiento pendientes para este asset. */
  pendingSteps: ProcessingStepSpec[];
}
