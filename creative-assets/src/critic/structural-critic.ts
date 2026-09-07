import { CompositionPlan, ImageLayerSpec, TextLayerSpec, LayerSpec } from "../composition/types";
import { defaultSafeArea, layerRect, Rect, defaultFontSize } from "../composition/layout";
import { BrandStyles } from "../composition/types";
import { ReferenceProfile } from "../visual/types";
import { CriticIssue, CriticInput, CritiqueReport, Severity } from "./types";

/**
 * StructuralCritic: issues verificables desde el CompositionPlan.
 * Reutiliza layout.layerRect / defaultSafeArea / defaultFontSize — sin duplicar lógica.
 */

export function critiqueStructure(plan: CompositionPlan, brand: BrandStyles | null, profile: ReferenceProfile | null | undefined): { issues: CriticIssue[]; strengths: string[] } {
  const issues: CriticIssue[] = [];
  const strengths: string[] = [];
  const safe = plan.safeArea ?? defaultSafeArea(plan.canvas);
  const canvasW = plan.canvas.width;
  const canvasH = plan.canvas.height;

  const byRole = (role: string) => plan.layers.filter((l) => l.role === role);
  const textLayers = plan.layers.filter((l): l is TextLayerSpec => l.type === "text");
  const imageLayers = plan.layers.filter((l): l is ImageLayerSpec => l.type === "image");

  // ---- contenido requerido ----
  if (byRole("headline").length === 0) {
    issues.push(missing("headline", "headline missing: the piece has no dominant title", "critical"));
  } else {
    strengths.push("headline present");
  }
  if (byRole("cta").length === 0) issues.push(missing("cta", "CTA missing: the piece has no call to action", "high"));
  if (byRole("logo").length === 0) issues.push(missing("logo", "logo missing: the brand mark is not present", "low"));
  if (imageLayers.length === 0) {
    issues.push({ id: "missing-background", severity: "high", category: "missing_content", message: "no image layers: the piece is typography-only", suggestion: "Add a photographic background or hero asset.", affectedLayerIds: [] });
  } else {
    strengths.push("photographic content present");
  }

  // ---- safe areas (rect real del layout) ----
  for (const layer of plan.layers) {
    if (layer.bleed) continue;
    const rect = layerRect(plan, layer);
    const outside =
      rect.x < safe.left - 1 || rect.y < safe.top - 1 ||
      rect.x + rect.width > canvasW - safe.right + 1 || rect.y + rect.height > canvasH - safe.bottom + 1;
    if (outside) {
      const severity: Severity = layer.role === "cta" || layer.role === "headline" ? "high" : "medium";
      issues.push({
        id: `safe-area-${layer.role}`,
        severity,
        category: "safe_area",
        message: `${layer.role} extends outside the safe area (${safe.left},${safe.top} ${canvasW - safe.right}x${canvasH - safe.bottom}).`,
        suggestion: `Move ${layer.role} inside the safe area.`,
        affectedLayerIds: [layer.role],
        action: { action: "move_layer", targetLayerId: layer.role, suggestedPosition: layer.role === "cta" ? "bottom-left" : "top-left" },
      });
    }
  }
  if (issues.every((i) => i.category !== "safe_area")) strengths.push("all content inside safe area");

  // ---- jerarquía tipográfica (defaultFontSize del layout si no hay override) ----
  const fontSize = (l: TextLayerSpec) => l.fontSize ?? defaultFontSize(l.role, plan.canvas);
  const headline = byRole("headline")[0] as TextLayerSpec | undefined;
  const sub = byRole("subheadline")[0] as TextLayerSpec | undefined;
  const cta = byRole("cta")[0] as TextLayerSpec | undefined;
  const body = byRole("body")[0] as TextLayerSpec | undefined;

  if (headline && cta && fontSize(headline) < fontSize(cta) * 1.4) {
    issues.push({
      id: "hierarchy-headline-cta",
      severity: "high",
      category: "hierarchy",
      message: "headline is not sufficiently larger than the CTA (weak hierarchy).",
      suggestion: "Increase headline prominence.",
      affectedLayerIds: ["headline", "cta"],
      action: { action: "resize_layer", targetLayerId: "headline", direction: "increase", relativeAmount: 1.2 },
    });
  }
  if (headline && sub && fontSize(sub) >= fontSize(headline) * 0.9) {
    issues.push({
      id: "hierarchy-headline-sub",
      severity: "medium",
      category: "typography",
      message: "subheadline is too close in size to the headline.",
      suggestion: "Reduce subheadline size to create hierarchy.",
      affectedLayerIds: ["headline", "subheadline"],
      action: { action: "resize_layer", targetLayerId: "subheadline", direction: "decrease", relativeAmount: 0.75 },
    });
  }
  if (body && headline && fontSize(body) > fontSize(headline)) {
    issues.push({
      id: "hierarchy-body-headline",
      severity: "high",
      category: "typography",
      message: "body text is larger than the headline.",
      suggestion: "Reduce body size below headline.",
      affectedLayerIds: ["body", "headline"],
    });
  }
  const distinctSizes = new Set(textLayers.map((l) => fontSize(l))).size;
  if (textLayers.length >= 3 && distinctSizes > 4) {
    issues.push({
      id: "typography-too-many-sizes",
      severity: "low",
      category: "typography",
      message: `too many distinct text sizes (${distinctSizes}).`,
      suggestion: "Consolidate typography scale.",
      affectedLayerIds: textLayers.map((l) => l.role),
    });
  }
  if (headline && cta && fontSize(headline) >= fontSize(cta) * 1.6) strengths.push("clear headline-to-CTA hierarchy");

  // ---- solapamientos (bounding boxes reales; texto con alto efectivo) ----
  const important = plan.layers.filter((l) => ["headline", "subheadline", "cta", "hero", "logo", "decorative"].includes(l.role));
  for (let i = 0; i < important.length; i++) {
    for (let j = i + 1; j < important.length; j++) {
      const a = important[i];
      const b = important[j];
      const rectA = effectiveRect(plan, a);
      const rectB = effectiveRect(plan, b);
      const overlap = intersectArea(rectA, rectB);
      if (overlap <= 0) continue;
      // el logo SIEMPRE va sobre la fotografía: aceptable por diseño
      if ([a.role, b.role].includes("logo") && [a.role, b.role].includes("hero")) continue;
      const verdict = classifyOverlap(a, b, rectA, rectB);
      if (verdict === "acceptable") continue;
      issues.push({
        id: `overlap-${a.role}-${b.role}`,
        severity: verdict === "problem" ? "high" : "medium",
        category: "overlap",
        message: `${a.role} overlaps ${b.role} (${Math.round(overlap * 100)}% of the smaller box).`,
        suggestion: verdict === "problem" ? `Separate ${a.role} and ${b.role} or reduce one of them.` : `Review overlap between ${a.role} and ${b.role}.`,
        affectedLayerIds: [a.role, b.role],
      });
    }
  }

  // ---- hero cubriendo CTA ----
  const hero = byRole("hero")[0];
  if (hero && cta) {
    const heroRect = layerRect(plan, hero);
    const ctaRect = layerRect(plan, cta);
    const coverage = intersectArea(heroRect, ctaRect) / Math.max(1, (ctaRect.width * ctaRect.height));
    if (coverage > 0.5) {
      issues.push({
        id: "overlap-hero-cta",
        severity: "high",
        category: "readability",
        message: `hero covers ${Math.round(coverage * 100)}% of the CTA.`,
        suggestion: "Move the CTA or shrink the hero to keep the CTA legible.",
        affectedLayerIds: ["hero", "cta"],
        action: { action: "move_layer", targetLayerId: "cta", suggestedPosition: "bottom-left" },
      });
    }
  }

  // ---- orden de capas ----
  const bgIndex = plan.layers.findIndex((l) => l.role === "background");
  if (bgIndex > 0) {
    issues.push({
      id: "order-background",
      severity: "medium",
      category: "composition",
      message: "background layer is not first (z-order invalid).",
      suggestion: "Move the background to the bottom of the layer stack.",
      affectedLayerIds: ["background"],
    });
  }
  const dominantImages = imageLayers.filter((l) => l.role === "hero" || l.role === "background").length;
  if (dominantImages > 2) {
    issues.push({
      id: "composition-too-many-dominant",
      severity: "medium",
      category: "composition",
      message: `too many dominant elements (${dominantImages} hero/background layers).`,
      suggestion: "Keep one hero and one background.",
      affectedLayerIds: imageLayers.map((l) => l.role),
    });
  }

  // ---- consistencia de marca (solo evidencia estructural) ----
  if (brand) {
    for (const l of textLayers) {
      if (l.colorFromBrand && !brand.colors[l.colorFromBrand]) {
        issues.push({
          id: `brand-token-${l.role}`,
          severity: "medium",
          category: "brand_consistency",
          message: `colorFromBrand "${l.colorFromBrand}" is not a token of brand "${brand.id}".`,
          suggestion: `Use an existing token (available: ${Object.keys(brand.colors).join(", ")}).`,
          affectedLayerIds: [l.role],
        });
      }
      if (l.fontFamily && ![brand.fonts.display, brand.fonts.body, brand.fonts.mono].includes(l.fontFamily)) {
        issues.push({
          id: `brand-font-${l.role}`,
          severity: "low",
          category: "brand_consistency",
          message: `font "${l.fontFamily}" is not part of brand "${brand.id}".`,
          suggestion: `Use brand fonts (display: ${brand.fonts.display}, body: ${brand.fonts.body}, mono: ${brand.fonts.mono}).`,
          affectedLayerIds: [l.role],
        });
      }
    }
    if (!issues.some((i) => i.category === "brand_consistency")) strengths.push("typography and colors consistent with brand");
  }

  // ---- consistencia con perfil de referencia (solo datos presentes) ----
  if (profile) {
    if (profile.preferredSubjectPlacement && profile.preferredSubjectPlacement !== "unknown") {
      const heroLayer = byRole("hero")[0];
      const heroPos = heroLayer?.position ?? (heroLayer && !heroLayer.rect ? "right" : undefined);
      if (heroPos && !heroPos.includes(profile.preferredSubjectPlacement)) {
        issues.push({
          id: "reference-hero-placement",
          severity: "medium",
          category: "reference_consistency",
          message: `reference profile prefers subject on ${profile.preferredSubjectPlacement}, plan places hero at "${heroPos}".`,
          suggestion: `Move hero to ${profile.preferredSubjectPlacement} or justify the exception.`,
          affectedLayerIds: ["hero"],
          action: { action: "move_layer", targetLayerId: "hero", suggestedPosition: profile.preferredSubjectPlacement === "left" ? "left" : "right" },
        });
      }
    }
    if (profile.overlayUsage?.gradient === false) {
      const overlays = plan.layers.filter((l) => l.type === "overlay");
      if (overlays.length > 1) {
        issues.push({
          id: "reference-overlays",
          severity: "low",
          category: "reference_consistency",
          message: "reference profile prefers minimal overlays but the plan has several.",
          suggestion: "Reduce overlays to match the brand reference.",
          affectedLayerIds: overlays.map((l) => l.role),
        });
      }
    }
  }

  return { issues, strengths };
}

function missing(role: string, message: string, severity: Severity): CriticIssue {
  return {
    id: `missing-${role}`,
    severity,
    category: "missing_content",
    message,
    suggestion: `Add a ${role} layer to the plan.`,
    affectedLayerIds: [role],
  };
}

function intersectArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Alto efectivo del texto: los boxes semánticos son celdas de 1/3; el texto real abraza su contenido. */
function effectiveRect(plan: CompositionPlan, layer: LayerSpec): Rect {
  const rect = layerRect(plan, layer);
  if (layer.type !== "text") return rect;
  const fs = layer.fontSize ?? defaultFontSize(layer.role, plan.canvas);
  const effHeight = Math.min(rect.height, Math.round(fs * 1.15));
  return { ...rect, height: effHeight };
}

function classifyOverlap(a: LayerSpec, b: LayerSpec, rectA: Rect, rectB: Rect): "acceptable" | "warning" | "problem" {
  const smaller = Math.min(rectA.width * rectA.height, rectB.width * rectB.height) || 1;
  const ratio = intersectArea(rectA, rectB) / smaller;
  if (ratio < 0.15) return "acceptable";
  const roles = [a.role, b.role].sort();
  // en flyers es normal texto sobre la foto (cutouts no llenan su bbox): solo
  // solapamientos severos (>50% de la caja menor) son "problem"
  if (roles[0] === "cta" && (roles[1] === "decorative" || roles[1] === "hero")) return ratio > 0.5 ? "problem" : "warning";
  if (roles.includes("headline") && roles.includes("hero")) return ratio > 0.5 ? "problem" : "warning";
  if (roles.includes("cta") && roles.includes("headline")) return "problem";
  return ratio > 0.5 ? "problem" : "warning";
}

/** Scoring por categorías: solo evidencia; unknown se excluye. */
export function scoreReport(plan: CompositionPlan, issues: CriticIssue[], strengths: string[], opts: { hasBrand?: boolean; hasProfile?: boolean } = {}): Pick<CritiqueReport, "overallScore" | "status" | "categories" | "nextActions"> {
  const countIssue = (category: string) => issues.filter((i) => i.category === category).length;

  const categories: CritiqueReport["categories"] = {};
  const penalize = (category: string, max: number, source: CritiqueReport["categories"][string]["source"], penaltyPerIssue = 20) => {
    const n = countIssue(category);
    categories[category] = { score: Math.max(0, max - n * penaltyPerIssue), max, source };
  };

  penalize("safe_area", 100, "structural", 35);
  penalize("hierarchy", 100, "structural", 40);
  penalize("typography", 100, "structural", 25);
  penalize("overlap", 100, "structural", 30);
  penalize("composition", 100, "structural", 35);
  penalize("missing_content", 100, "structural", 30);
  // readability estructural: SOLO con evidencia (hero cubriendo CTA); el render
  // (fase 9) la completa con contraste. Sin evidencia → unknown (max 0).
  const readabilityIssues = issues.filter((i) => i.category === "readability");
  categories["readability"] = readabilityIssues.length
    ? { score: Math.max(0, 100 - readabilityIssues.length * 50), max: 100, source: "structural" }
    : { score: 0, max: 0, source: "unknown" };
  // alignment estructural no existe (requiere render) → unknown
  categories["alignment"] = { score: 0, max: 0, source: "unknown" };
  // solo con evidencia: sin marca/perfil, la categoría es unknown (max 0)
  if (opts.hasBrand) penalize("brand_consistency", 100, "brand", 30);
  else categories["brand_consistency"] = { score: 0, max: 0, source: "unknown" };
  if (opts.hasProfile) penalize("reference_consistency", 100, "reference", 25);
  else categories["reference_consistency"] = { score: 0, max: 0, source: "unknown" };
  // asset_quality y alignment requieren render/análisis real → unknown
  categories["asset_quality"] = { score: 0, max: 0, source: "unknown" };
  categories["alignment"] = { score: 0, max: 0, source: "unknown" };

  const evidenced = Object.values(categories).filter((c) => c.max > 0);
  const overallScore = Math.round(evidenced.reduce((s, c) => s + (c.score / c.max) * 100, 0) / (evidenced.length || 1));

  const status: CritiqueReport["status"] =
    issues.some((i) => i.severity === "critical") ? "critical" : issues.some((i) => i.severity === "high") ? "needs_revision" : "ready";

  const nextActions = issues
    .filter((i) => i.severity === "critical" || i.severity === "high")
    .map((i) => i.suggestion ?? `Resolve issue ${i.id}`);

  void plan; void strengths;
  return { overallScore, status, categories, nextActions };
}

export function severityRank(s: Severity): number {
  return { info: 0, low: 1, medium: 2, high: 3, critical: 4 }[s];
}
void severityRank;

export type { CriticInput };
