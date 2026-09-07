import { CompositionPlan, ImageLayerSpec, TextLayerSpec, ShapeLayerSpec, OverlayLayerSpec, BrandStyles } from "./types";
import { layerRect, defaultFontSize } from "./layout";
import { resolveColor, resolveFont } from "./brand";

/**
 * PenpotAdapter: abstracción entre el motor de composición y Penpot.
 *
 * El MCP de Penpot NO es invocable desde Node/CLI: se usa a través del agente
 * (penpot_execute_code + penpot_export_shape). Por eso el adapter genera un
 * SCRIPT determinista con el plugin API REAL de Penpot (createBoard,
 * createText, createRectangle, uploadMediaData, gradientes, shadows, z-order),
 * que el agente ejecuta con penpot_execute_code y luego exporta con
 * penpot_export_shape. NO se inventan herramientas.
 *
 * Solo se usan capacidades verificadas del plugin API:
 * - penpot.createBoard / createRectangle / createEllipse / createText
 * - penpot.uploadMediaData(name, Uint8Array) → ImageData (fills con fillImage)
 * - shape.fills con fillColor / fillColorGradient (type linear/radial + stops)
 * - shape.shadows ({ style: "drop-shadow", color: {color, opacity}, blur, ... })
 * - font.applyToText(text, variant), text.fontSize/align/growType
 * - penpotUtils.setParentXY para posicionar dentro del board
 */

export interface PenpotImageAsset {
  /** id del AssetPlanItem (referencia del plan). */
  key: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  data: Buffer;
}

export interface CompositionScript {
  script: string;
  /** Board name para localizar/verificar en Penpot. */
  boardName: string;
  /** Resumen de pasos que el agente debe ejecutar. */
  steps: string[];
}

export interface PenpotAdapter {
  readonly name: string;
  /** Genera la representación ejecutable/registrible de la composición. */
  emit(plan: CompositionPlan, brand: BrandStyles | null, images: PenpotImageAsset[]): CompositionScript;
}

/** Adapter de pruebas: registra las operaciones sin tocar Penpot. */
export class MockPenpotAdapter implements PenpotAdapter {
  readonly name = "mock";
  ops: Array<{ op: string; args: Record<string, unknown> }> = [];

  emit(plan: CompositionPlan, brand: BrandStyles | null, images: PenpotImageAsset[]): CompositionScript {
    this.ops = [];
    this.ops.push({ op: "createCanvas", args: { width: plan.canvas.width, height: plan.canvas.height } });
    for (const img of images) this.ops.push({ op: "uploadImage", args: { key: img.key, bytes: img.data.length } });
    for (const layer of plan.layers) {
      const rect = layerRect(plan, layer);
      this.ops.push({ op: `add_${layer.type}`, args: { role: layer.role, rect } });
    }
    this.ops.push({ op: "export", args: { boardName: boardNameFor(plan) } });
    return {
      script: "// mock",
      boardName: boardNameFor(plan),
      steps: this.ops.map((o) => `${o.op} ${JSON.stringify(o.args)}`),
    };
  }
}

export function boardNameFor(plan: CompositionPlan): string {
  return `Campaign ${plan.canvas.width}x${plan.canvas.height}`;
}

/** Adapter real: genera el script para penpot_execute_code. */
export class ScriptedPenpotAdapter implements PenpotAdapter {
  readonly name = "scripted";

  emit(plan: CompositionPlan, brand: BrandStyles | null, images: PenpotImageAsset[]): CompositionScript {
    const boardName = `BaFut Campaign ${plan.canvas.width}x${plan.canvas.height}`;
    const lines: string[] = [];
    const w = plan.canvas.width;
    const h = plan.canvas.height;

    lines.push(`// Generado por Creative Assets (Fase 5) — ejecutar con penpot_execute_code`);
    lines.push(`const board = penpot.createBoard();`);
    lines.push(`board.name = ${JSON.stringify(boardName)};`);
    lines.push(`board.x = 100; board.y = 100; board.resize(${w}, ${h});`);
    const bg = plan.backgroundColor ?? brand?.colors["turf-deep"] ?? "#073828";
    lines.push(`board.fills = [{ fillColor: ${JSON.stringify(bg)}, fillOpacity: 1 }];`);

    // 1. Subir imágenes y mapearlas por key
    lines.push(`const IMG = {};`);
    for (const img of images) {
      const b64 = img.data.toString("base64");
      lines.push(`{`);
      lines.push(`  const bytes = Uint8Array.from(atob(${JSON.stringify(b64)}), c => c.charCodeAt(0));`);
      lines.push(`  const imgData = await penpot.uploadMediaData(${JSON.stringify(img.name)}, bytes);`);
      lines.push(`  IMG[${JSON.stringify(img.key)}] = { id: imgData.id, w: ${img.width}, h: ${img.height} };`);
      lines.push(`}`);
    }

    // 2. Capas en orden (append = z-order; último arriba)
    let idx = 0;
    for (const layer of plan.layers) {
      const rect = layerRect(plan, layer);
      if (layer.visible === false) continue;
      switch (layer.type) {
        case "image":
          lines.push(...imageLayerCode(layer, rect, idx));
          break;
        case "text":
          lines.push(...textLayerCode(layer, rect, brand, idx, h));
          break;
        case "shape":
          lines.push(...shapeLayerCode(layer, rect, idx));
          break;
        case "overlay":
          lines.push(...overlayLayerCode(layer, rect, idx));
          break;
      }
      if (layer.opacity !== undefined) {
        lines.push(`LY${idx}.opacity = ${layer.opacity};`);
      }
      idx++;
    }

    lines.push(`return { boardId: board.id, name: board.name, layers: board.children.length };`);

    const steps = [
      "Ejecutar el script con penpot_execute_code (asegúrate de que Penpot esté abierto).",
      `Con el boardId devuelto, exportar la composición con penpot_export_shape (formato png, scale 2).`,
      "Registrar el resultado en campaigns/<id>/ (status: composed/exported).",
    ];
    return { script: lines.join("\n"), boardName, steps };
  }
}

function imageLayerCode(layer: ImageLayerSpec, rect: Rect, idx: number): string[] {
  const fit = layer.fit ?? "cover";
  return [
    `{`,
    `  const img = penpot.createRectangle();`,
    `  img.name = ${JSON.stringify(`image:${layer.role}`)};`,
    `  img.resize(${rect.width}, ${rect.height});`,
    `  board.appendChild(img);`,
    `  penpotUtils.setParentXY(img, ${rect.x}, ${rect.y});`,
    `  img.fills = [{ fillImage: { id: IMG[${JSON.stringify(layer.asset)}].id, width: IMG[${JSON.stringify(layer.asset)}].w, height: IMG[${JSON.stringify(layer.asset)}].h, keepAspectRatio: ${fit === "contain"}, mtype: "image/png" } }];`,
    layer.radius ? `  img.borderRadius = ${layer.radius};` : "",
    layer.shadow
      ? `  img.shadows = [{ style: "drop-shadow", color: { color: ${JSON.stringify(layer.shadow.color)}, opacity: ${layer.shadow.opacity} }, blur: ${layer.shadow.blur}, offsetX: ${layer.shadow.offsetX ?? 0}, offsetY: ${layer.shadow.offsetY ?? 8}, spread: 0 }];`
      : "",
    `  window["LY${idx}"] = img; var LY${idx} = img;`,
    `}`,
  ].filter(Boolean);
}

function textLayerCode(layer: TextLayerSpec, rect: Rect, brand: BrandStyles | null, idx: number, canvasH: number): string[] {
  const font = resolveFont(brand, layer);
  const size = layer.fontSize ?? defaultFontSize(layer.role, { height: canvasH });
  const color = resolveColor(brand, layer.color, layer.colorFromBrand) ?? brand?.colors["paper"] ?? "#FFFFFF";
  const weight = layer.fontWeight ?? font.weight;
  const family = font.family;
  return [
    `{`,
    `  const t = penpot.createText(${JSON.stringify(layer.content)});`,
    `  t.name = ${JSON.stringify(`text:${layer.role}`)};`,
    `  const f = penpot.fonts.findByName(${JSON.stringify(family)});`,
    `  if (f) { const v = f.variants.find(v => String(v.fontWeight) === ${JSON.stringify(weight)}) || f.variants[f.variants.length - 1]; f.applyToText(t, v); }`,
    `  t.fontSize = ${JSON.stringify(String(size))};`,
    `  t.growType = "auto-height"; t.resize(${rect.width}, 10);`,
    `  t.align = ${JSON.stringify(layer.align ?? (String(layer.position).includes("right") ? "right" : "left"))};`,
    `  t.fills = [{ fillColor: ${JSON.stringify(color)}, fillOpacity: 1 }];`,
    layer.letterSpacing !== undefined ? `  t.letterSpacing = ${layer.letterSpacing};` : "",
    layer.lineHeight !== undefined ? `  t.lineHeight = ${layer.lineHeight};` : "",
    `  board.appendChild(t);`,
    `  penpotUtils.setParentXY(t, ${rect.x}, ${rect.y});`,
    `  var LY${idx} = t;`,
    `}`,
  ].filter(Boolean);
}

function shapeLayerCode(layer: ShapeLayerSpec, rect: Rect, idx: number): string[] {
  const create = layer.shape === "ellipse" ? "createEllipse()" : "createRectangle()";
  const lines = [
    `{`,
    `  const s = penpot.${create};`,
    `  s.name = ${JSON.stringify(`shape:${layer.role}`)};`,
    `  s.resize(${layer.shape === "line" ? rect.width : Math.max(rect.width, 2)}, ${layer.shape === "line" ? 2 : Math.max(rect.height, 2)});`,
    `  board.appendChild(s);`,
    `  penpotUtils.setParentXY(s, ${rect.x}, ${rect.y});`,
  ];
  if (layer.fill) {
    lines.push(`  s.fills = [{ fillColor: ${JSON.stringify(layer.fill)}, fillOpacity: 1 }];`);
  } else {
    lines.push(`  s.fills = [];`);
  }
  if (layer.stroke) {
    lines.push(`  s.strokes = [{ strokeColor: ${JSON.stringify(layer.stroke.color)}, strokeWidth: ${layer.stroke.width}, strokeAlignment: "inner" }];`);
  }
  if (layer.radius !== undefined) {
    lines.push(`  s.borderRadius = ${layer.radius};`);
  }
  lines.push(`  var LY${idx} = s;`, `}`);
  return lines;
}

function overlayLayerCode(layer: OverlayLayerSpec, rect: Rect, idx: number): string[] {
  const lines = [
    `{`,
    `  const s = penpot.createRectangle();`,
    `  s.name = ${JSON.stringify(`overlay:${layer.role}`)};`,
    `  s.resize(${rect.width}, ${rect.height});`,
    `  board.appendChild(s);`,
    `  penpotUtils.setParentXY(s, ${rect.x}, ${rect.y});`,
  ];
  if (layer.gradient) {
    const d = layer.gradient.direction;
    const from = d === "up" ? [0, 1] : d === "down" ? [0, 0] : d === "left" ? [1, 0.5] : [0, 0.5];
    const to = d === "up" ? [0, 0] : d === "down" ? [0, 1] : d === "left" ? [0, 0.5] : [1, 0.5];
    const g = {
      type: "linear",
      startX: from[0] * rect.width,
      startY: from[1] * rect.height,
      endX: to[0] * rect.width,
      endY: to[1] * rect.height,
      width: Math.max(rect.width, rect.height),
      stops: [
        { color: layer.color, opacity: layer.gradient.opacity, offset: 0 },
        { color: layer.color, opacity: 0, offset: 1 },
      ],
    };
    lines.push(`  s.fills = [{ fillColorGradient: ${JSON.stringify(g)} }];`);
  } else {
    lines.push(`  s.fills = [{ fillColor: ${JSON.stringify(layer.color)}, fillOpacity: ${layer.opacity ?? 0.5} }];`);
  }
  lines.push(`  var LY${idx} = s;`, `}`);
  return lines;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
