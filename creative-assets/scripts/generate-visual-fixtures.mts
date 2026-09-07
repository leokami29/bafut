/**
 * Genera fixtures visuales sintÃ©ticos deterministas (fixtures/visual/*.png).
 * Ejecutar: npx tsx creative-assets/scripts/generate-visual-fixtures.mts
 */
import sharp from "sharp";
import type { Sharp } from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve(process.cwd(), "creative-assets", "fixtures", "visual");
const W = 400, H = 500;

async function save(name: string, build: Sharp, tint?: string): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const final = tint ? build.tint(tint) : build;
  await final.png().toFile(path.join(OUT, `${name}.png`));
  console.log("fixture:", name);
}

async function main() {
  // high-contrast: bloques blanco/negro
  const blocks = `<svg width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#000"/>
    <rect x="0" y="0" width="${W / 2}" height="${H / 2}" fill="#fff"/>
    <rect x="${W / 2}" y="${H / 2}" width="${W / 2}" height="${H / 2}" fill="#fff"/>
  </svg>`;
  await save("high-contrast", sharp(Buffer.from(blocks)));

  // low-contrast: gris uniforme con leve variaciÃ³n
  await save("low-contrast", sharp({ create: { width: W, height: H, channels: 3, background: { r: 120, g: 120, b: 120 }, noise: { type: "gaussian", mean: 118, sigma: 4 } } }));

  // dense: ruido gaussiano fuerte coloreado (saturación variable → densidad alta real)
  await save("dense", sharp({ create: { width: W, height: H, channels: 3, background: { r: 0, g: 0, b: 0 }, noise: { type: "gaussian", mean: 128, sigma: 100 } } }), "#C42A16");

  // sparse: blanco plano
  await save("sparse", sharp({ create: { width: W, height: H, channels: 3, background: { r: 255, g: 255, b: 255 } } }));

  // balanced: cÃ­rculo central sobre fondo plano
  const balanced = `<svg width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#e8e8e8"/>
    <circle cx="${W / 2}" cy="${H / 2}" r="120" fill="#333"/>
    <circle cx="${W / 2}" cy="${H / 2}" r="60" fill="#0C6B4C"/>
  </svg>`;
  await save("balanced", sharp(Buffer.from(balanced)));

  // left-heavy: ruido denso en la mitad izquierda, plano a la derecha
  const noiseLeft = await sharp({ create: { width: W / 2, height: H, channels: 3, background: { r: 0, g: 0, b: 0 }, noise: { type: "gaussian", mean: 100, sigma: 60 } } }).png().toBuffer();
  await save("left-heavy", sharp({ create: { width: W, height: H, channels: 3, background: { r: 240, g: 240, b: 240 } } }).composite([{ input: noiseLeft, left: 0, top: 0 }]));

  // right-heavy: espejo del anterior
  const noiseRight = await sharp({ create: { width: W / 2, height: H, channels: 3, background: { r: 0, g: 0, b: 0 }, noise: { type: "gaussian", mean: 100, sigma: 60 } } }).png().toBuffer();
  await save("right-heavy", sharp({ create: { width: W, height: H, channels: 3, background: { r: 240, g: 240, b: 240 } } }).composite([{ input: noiseRight, left: W / 2, top: 0 }]));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
