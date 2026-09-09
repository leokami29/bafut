import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const token = 'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2R0NNIn0.WaXcAhqTeTy-Mto6kK-Xve1xpdJBAj-BKsqt_H5xeEWzZaVGkREkcg.yRsxIMOB4G_hc7ZJ.-7hltaVLLWKt1tkKxTe9VnoBsoNWou5Kz08wBUD7uA8P2AV13GkMmRecdj6npaa9xWi15RivZKCTSRzxbpcTcDi67X752Ue9oTqbD56g3DQ7Eq-ngj2sh3Tc4j_AA7NCtVtGdlazIPr_HTt-bxxMvl9oXIeBc1pMn1wNaNvo4R5ZcYRSwql74nCx1je4FQj-QupnyG_L6Iqu.8J3swlj82qVps5Z4yeOvyg';
const fileId = 'c828d3cf-7d4e-8145-8008-998ad79484f1';
const pageId = 'c828d3cf-7d4e-8145-8008-998ad79484f2';

const outputDir = path.join(process.cwd(), 'creative-assets', 'campaigns', 'bafut-guia-comunidad', 'output');
const brainDir = 'C:\\Users\\Leonel Polanco F\\.gemini\\antigravity\\brain\\d3deda47-31a9-46a7-b848-ae9dd8faa78e';
fs.mkdirSync(outputDir, { recursive: true });

function makeFrame(id: string, parentId: string, frameId: string, name: string, x: number, y: number, w: number, h: number, fillColor: string | null, fillOpacity = 1, strokeColor: string | null = null, strokeOpacity = 1, strokeWidth = 1, rx = 0) {
  const fills = fillColor ? [{ fillColor, fillOpacity }] : [];
  const strokes = strokeColor ? [{ strokeColor, strokeOpacity, strokeWidth, strokeAlignment: 'inner' }] : [];
  return {
    id,
    name,
    type: 'frame',
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    selrect: { x, y, width: w, height: h, x1: x, y1: y, x2: x + w, y2: y + h },
    points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }],
    transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    transformInverse: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    parentId,
    frameId,
    flipX: false,
    flipY: false,
    hideFillOnExport: false,
    r1: rx,
    r2: rx,
    r3: rx,
    r4: rx,
    proportionLock: false,
    proportion: w / h,
    strokes,
    fills,
    shapes: []
  };
}

function makeRect(id: string, parentId: string, frameId: string, name: string, x: number, y: number, w: number, h: number, fillColor: string | null, fillOpacity = 1, strokeColor: string | null = null, strokeOpacity = 1, strokeWidth = 1, rx = 0) {
  const fills = fillColor ? [{ fillColor, fillOpacity }] : [];
  const strokes = strokeColor ? [{ strokeColor, strokeOpacity, strokeWidth, strokeAlignment: 'inner' }] : [];
  return {
    id,
    name,
    type: 'rect',
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    selrect: { x, y, width: w, height: h, x1: x, y1: y, x2: x + w, y2: y + h },
    points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }],
    transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    transformInverse: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    parentId,
    frameId,
    flipX: false,
    flipY: false,
    rx,
    ry: rx,
    proportionLock: false,
    proportion: w / h,
    strokes,
    fills
  };
}

function makeCircle(id: string, parentId: string, frameId: string, name: string, x: number, y: number, diameter: number, strokeColor: string, strokeOpacity = 1, strokeWidth = 2, fillColor: string | null = null, fillOpacity = 1) {
  const fills = fillColor ? [{ fillColor, fillOpacity }] : [];
  return {
    id,
    name,
    type: 'circle',
    x,
    y,
    width: diameter,
    height: diameter,
    rotation: 0,
    selrect: { x, y, width: diameter, height: diameter, x1: x, y1: y, x2: x + diameter, y2: y + diameter },
    points: [{ x, y }, { x: x + diameter, y }, { x: x + diameter, y: y + diameter }, { x, y: y + diameter }],
    transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    transformInverse: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    parentId,
    frameId,
    flipX: false,
    flipY: false,
    proportionLock: true,
    proportion: 1,
    strokes: [{ strokeColor, strokeOpacity, strokeWidth }],
    fills
  };
}

function makeText(id: string, parentId: string, frameId: string, name: string, x: number, y: number, w: number, h: number, text: string, fontType: 'display' | 'body' | 'mono', fontSize: number, fontWeight = '500', fillColor = '#DFF3E6', textAlign = 'left', letterSpacing = '0') {
  let fontFamily = 'Outfit';
  let fontId = 'gfont-outfit';
  let fontVariantId = fontWeight;

  if (fontType === 'display') {
    fontFamily = 'Barlow Condensed';
    fontId = 'gfont-barlow-condensed';
    fontVariantId = fontWeight === '900' ? '800' : fontWeight;
  } else if (fontType === 'mono') {
    fontFamily = 'IBM Plex Mono';
    fontId = 'gfont-ibm-plex-mono';
    fontVariantId = fontWeight;
  }

  return {
    id,
    name,
    type: 'text',
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    selrect: { x, y, width: w, height: h, x1: x, y1: y, x2: x + w, y2: y + h },
    points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }],
    transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    transformInverse: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    parentId,
    frameId,
    flipX: null,
    flipY: null,
    growType: 'auto-height',
    content: {
      type: 'root',
      children: [
        {
          type: 'paragraph-set',
          children: [
            {
              type: 'paragraph',
              lineHeight: '1.15',
              fontStyle: 'normal',
              textAlign,
              fontFamily,
              fontId,
              fontVariantId,
              fontSize: String(fontSize),
              fontWeight,
              letterSpacing,
              fills: [{ fillColor, fillOpacity: 1 }],
              children: [
                {
                  lineHeight: '1.15',
                  fontStyle: 'normal',
                  textAlign,
                  fontFamily,
                  fontId,
                  fontVariantId,
                  fontSize: String(fontSize),
                  fontWeight,
                  letterSpacing,
                  fills: [{ fillColor, fillOpacity: 1 }],
                  text
                }
              ]
            }
          ]
        }
      ]
    },
    positionData: [
      {
        x,
        y: y + fontSize,
        width: w,
        height: h,
        x1: 0,
        y1: 0,
        x2: w,
        y2: h,
        fontStyle: 'normal',
        fontSize: `${fontSize}px`,
        fontWeight,
        letterSpacing,
        fills: [{ fillColor, fillOpacity: 1 }],
        fontFamily,
        text
      }
    ]
  };
}

async function run() {
  console.log('Fetching Penpot file...');
  const resFile = await fetch('https://design.penpot.app/api/rpc/command/get-file', {
    method: 'POST',
    headers: { 'Authorization': 'Token ' + token, 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: fileId })
  });
  const file = await resFile.json();
  const page = file.data.pagesIndex[pageId];
  const objects = page.objects;

  // Find existing draft/pro boards to clean
  const oldBoardIds = Object.values(objects)
    .filter((o: any) => o.name && (
      o.name.includes('Reclama tu Cancha') ||
      o.name.includes('Publica tu Hueco') ||
      o.name.includes('Reserva tu Turno') ||
      o.name.includes('Pros y Límites')
    ))
    .map((b: any) => b.id);

  function getDescendantIds(rootId: string): string[] {
    const list = [rootId];
    const kids = Object.values(objects).filter((o: any) => o.parentId === rootId);
    kids.forEach((k: any) => {
      list.push(...getDescendantIds(k.id));
    });
    return list;
  }

  const allToDelete: string[] = [];
  oldBoardIds.forEach((bId: string) => {
    allToDelete.push(...getDescendantIds(bId));
  });

  console.log(`Deleting ${allToDelete.length} obsolete objects from Penpot...`);
  const delChanges = allToDelete.map(id => ({
    type: 'del-obj',
    id,
    'page-id': pageId
  }));

  const newObjs: any[] = [];

  function buildCleanBoard(spec: {
    name: string;
    x: number;
    y: number;
    badge: string;
    h1: string;
    h2: string;
    sub: string;
    cta: string;
    meta: string;
    cardBuilder: (boardId: string, bx: number, by: number) => any[];
  }) {
    const boardId = randomUUID();
    const bx = spec.x;
    const by = spec.y;
    const bw = 1080;
    const bh = 1080;

    // 1. Board Frame (Turf Deep)
    const board = makeFrame(boardId, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', spec.name, bx, by, bw, bh, '#073828', 1, null, 0, 0, 0);
    newObjs.push(board);

    // 2. Pitch lines decoration (chalk)
    const pitchBorder = makeRect(randomUUID(), boardId, boardId, 'Pitch Border', bx + 40, by + 40, bw - 80, bh - 80, null, 0, '#D9F2A5', 0.18, 3, 28);
    const pitchCircle = makeCircle(randomUUID(), boardId, boardId, 'Pitch Circle', bx + 360, by + 360, 360, '#D9F2A5', 0.12, 3);
    newObjs.push(pitchBorder, pitchCircle);

    // 3. Header: Badge in IBM Plex Mono + Wordmark in Barlow Condensed
    const badgeW = 390;
    const badgeBg = makeRect(randomUUID(), boardId, boardId, 'Badge BG', bx + 60, by + 60, badgeW, 42, '#0A4F38', 0.9, '#D9F2A5', 0.35, 1.5, 8);
    const badgeTxt = makeText(randomUUID(), boardId, boardId, 'Badge Text', bx + 60, by + 72, badgeW, 20, spec.badge, 'mono', 15, '600', '#D9F2A5', 'center', '2');
    const wordmark = makeText(randomUUID(), boardId, boardId, 'Wordmark', bx + bw - 220, by + 60, 160, 44, 'BAFUT', 'display', 46, '900', '#FFD25A', 'right', '1');
    newObjs.push(badgeBg, badgeTxt, wordmark);

    // 4. Hero Typography (Barlow Condensed 900 + Outfit 500)
    const h1Txt = makeText(randomUUID(), boardId, boardId, 'H1 Headline', bx + 60, by + 128, bw - 120, 68, spec.h1, 'display', 68, '900', '#DFF3E6', 'left', '1');
    const h2Txt = makeText(randomUUID(), boardId, boardId, 'H2 Headline', bx + 60, by + 202, bw - 120, 52, spec.h2, 'display', 52, '900', '#FFD25A', 'left', '1');
    const subTxt = makeText(randomUUID(), boardId, boardId, 'Subheadline', bx + 60, by + 266, bw - 140, 54, spec.sub, 'body', 22, '500', '#C8E6D4', 'left');
    newObjs.push(h1Txt, h2Txt, subTxt);

    // 5. Card Central Visual
    const cardShapes = spec.cardBuilder(boardId, bx, by);
    newObjs.push(...cardShapes);

    // 6. Bottom CTA Button (Barlow Condensed 900) + Footer (IBM Plex Mono)
    const ctaW = bw - 120;
    const ctaBg = makeRect(randomUUID(), boardId, boardId, 'CTA BG', bx + 60, by + bh - 160, ctaW, 76, '#FFD25A', 1, null, 0, 0, 14);
    const ctaTxt = makeText(randomUUID(), boardId, boardId, 'CTA Text', bx + 60, by + bh - 138, ctaW, 32, spec.cta, 'display', 32, '900', '#073828', 'center', '1');
    const metaTxt = makeText(randomUUID(), boardId, boardId, 'Meta Footer', bx + 60, by + bh - 60, ctaW, 20, spec.meta, 'mono', 15, '600', '#D9F2A5', 'center', '2');
    newObjs.push(ctaBg, ctaTxt, metaTxt);
  }

  // --- 1. RECLAMA TU CANCHA ---
  buildCleanBoard({
    name: 'BaFut · 1. Reclama tu Cancha (PRO) · 1080x1080',
    x: 100,
    y: 2500,
    badge: 'DUEÑOS Y ADMINISTRADORES',
    h1: 'LA CANCHA ES TUYA.',
    h2: 'EL CONTROL TAMBIÉN.',
    sub: 'Actualiza tarifas por deporte, cubre franjas libres y recibe pagos directos a tu cuenta.',
    cta: 'RECLAMA TU SEDE GRATIS → bafut.macuttech.com/canchas',
    meta: 'BARRANQUILLA · 0% COMISIÓN EN PARTIDOS · CONTROL TOTAL',
    cardBuilder: (boardId, bx, by) => {
      const cx = bx + 60;
      const cy = by + 345;
      const cw = 960;
      const ch = 540;

      const cardBg = makeRect(randomUUID(), boardId, boardId, 'Card Sede Verificada', cx, cy, cw, ch, '#0C6B4C', 0.85, '#D9F2A5', 0.3, 2, 20);
      
      const tagBg = makeRect(randomUUID(), boardId, boardId, 'Tag Verificada', cx + 30, cy + 24, 220, 34, '#FFD25A', 1, null, 0, 0, 6);
      const tagTxt = makeText(randomUUID(), boardId, boardId, 'Tag Text', cx + 30, cy + 32, 220, 18, 'SEDE VERIFICADA', 'display', 19, '900', '#073828', 'center', '1');
      const venueName = makeText(randomUUID(), boardId, boardId, 'Venue Title', cx + 270, cy + 28, 600, 30, 'CANCHA SINTÉTICA EL CAMPÍN · BARRANQUILLA', 'display', 26, '800', '#DFF3E6');
      
      const colW = 280;
      // Col 1
      const col1 = makeRect(randomUUID(), boardId, boardId, 'Col 1 BG', cx + 30, cy + 80, colW, 420, '#073828', 0.75, '#D9F2A5', 0.25, 1.5, 12);
      const col1Num = makeText(randomUUID(), boardId, boardId, 'Col 1 Num', cx + 45, cy + 100, 70, 48, '01', 'display', 54, '900', '#FFD25A');
      const col1Title = makeText(randomUUID(), boardId, boardId, 'Col 1 Title', cx + 45, cy + 165, 250, 32, 'VALIDA TU NIT', 'display', 28, '800', '#DFF3E6');
      const col1Desc = makeText(randomUUID(), boardId, boardId, 'Col 1 Desc', cx + 45, cy + 210, 250, 120, 'Busca tu sede en el directorio y valida tu contacto oficial para evitar suplantaciones.', 'body', 18, '400', '#C8E6D4');

      // Col 2
      const col2 = makeRect(randomUUID(), boardId, boardId, 'Col 2 BG', cx + 340, cy + 80, colW, 420, '#073828', 0.75, '#D9F2A5', 0.25, 1.5, 12);
      const col2Num = makeText(randomUUID(), boardId, boardId, 'Col 2 Num', cx + 355, cy + 100, 70, 48, '02', 'display', 54, '900', '#FFD25A');
      const col2Title = makeText(randomUUID(), boardId, boardId, 'Col 2 Title', cx + 355, cy + 165, 250, 32, 'TARIFAS EN VIVO', 'display', 28, '800', '#DFF3E6');
      const col2Desc = makeText(randomUUID(), boardId, boardId, 'Col 2 Desc', cx + 355, cy + 210, 250, 120, 'Configura tus precios por hora y deporte: Fútbol 5/7, Futsal, Pádel y Básquetbol.', 'body', 18, '400', '#C8E6D4');

      // Col 3
      const col3 = makeRect(randomUUID(), boardId, boardId, 'Col 3 BG', cx + 650, cy + 80, colW, 420, '#073828', 0.75, '#D9F2A5', 0.25, 1.5, 12);
      const col3Num = makeText(randomUUID(), boardId, boardId, 'Col 3 Num', cx + 665, cy + 100, 70, 48, '03', 'display', 54, '900', '#FFD25A');
      const col3Title = makeText(randomUUID(), boardId, boardId, 'Col 3 Title', cx + 665, cy + 165, 250, 32, '0% COMISIÓN', 'display', 28, '800', '#FFD25A');
      const col3Desc = makeText(randomUUID(), boardId, boardId, 'Col 3 Desc', cx + 665, cy + 210, 250, 120, 'Tus clientes te transfieren directo a tu cuenta. BaFut no retiene ni intermedia tu dinero.', 'body', 18, '400', '#C8E6D4');

      return [cardBg, tagBg, tagTxt, venueName, col1, col1Num, col1Title, col1Desc, col2, col2Num, col2Title, col2Desc, col3, col3Num, col3Title, col3Desc];
    }
  });

  // --- 2. PUBLICA TU HUECO ---
  buildCleanBoard({
    name: 'BaFut · 2. Publica tu Hueco (PRO) · 1080x1080',
    x: 1280,
    y: 2500,
    badge: 'ORGANIZADORES Y JUGADORES',
    h1: '¿SE CAYÓ EL ARQUERO?',
    h2: 'PUBLICA EL HUECO EN 30s.',
    sub: 'No canceles la pateada. Marca la posición en el pizarrón táctico y comparte el link por WhatsApp.',
    cta: 'PUBLICAR PARTIDO AHORA → bafut.macuttech.com/partidos/nuevo',
    meta: 'GRATIS · SIN REGISTRO OBLIGATORIO · RADAR EN VIVO',
    cardBuilder: (boardId, bx, by) => {
      const cx = bx + 60;
      const cy = by + 345;
      const cw = 960;
      const ch = 540;

      const cardBg = makeRect(randomUUID(), boardId, boardId, 'Card Pizarrón Táctico', cx, cy, cw, ch, '#0A4F38', 0.9, '#D9F2A5', 0.4, 2, 20);
      
      const pitchMini = makeRect(randomUUID(), boardId, boardId, 'Pitch Mini', cx + 30, cy + 30, 420, 480, '#073828', 0.95, '#D9F2A5', 0.35, 2, 12);
      const pitchCenterCircle = makeCircle(randomUUID(), boardId, boardId, 'Pitch Center', cx + 180, cy + 210, 120, '#D9F2A5', 0.25, 2);

      // Pins on field
      const pin1 = makeCircle(randomUUID(), boardId, boardId, 'Pin GK', cx + 210, cy + 60, 56, '#FFD25A', 1, 3, '#C42A16', 1);
      const pin1Txt = makeText(randomUUID(), boardId, boardId, 'Pin GK Txt', cx + 210, cy + 74, 56, 24, 'GK', 'display', 24, '900', '#FFFFFF', 'center');
      const pin1Alert = makeRect(randomUUID(), boardId, boardId, 'Alert GK', cx + 110, cy + 130, 260, 32, '#FFD25A', 1, null, 0, 0, 6);
      const pin1AlertTxt = makeText(randomUUID(), boardId, boardId, 'Alert GK Txt', cx + 110, cy + 137, 260, 18, 'FALTA ARQUERO A LAS 8:00 PM', 'display', 18, '900', '#073828', 'center', '1');

      const pin2 = makeCircle(randomUUID(), boardId, boardId, 'Pin DEF 1', cx + 110, cy + 220, 48, '#D9F2A5', 0.8, 2, '#0C6B4C', 1);
      const pin2Txt = makeText(randomUUID(), boardId, boardId, 'Pin DEF 1 Txt', cx + 110, cy + 233, 48, 20, 'DF', 'display', 20, '800', '#DFF3E6', 'center');
      const pin3 = makeCircle(randomUUID(), boardId, boardId, 'Pin DEF 2', cx + 320, cy + 220, 48, '#D9F2A5', 0.8, 2, '#0C6B4C', 1);
      const pin3Txt = makeText(randomUUID(), boardId, boardId, 'Pin DEF 2 Txt', cx + 320, cy + 233, 48, 20, 'DF', 'display', 20, '800', '#DFF3E6', 'center');

      const pin4 = makeCircle(randomUUID(), boardId, boardId, 'Pin FWD 1', cx + 160, cy + 370, 48, '#D9F2A5', 0.8, 2, '#0C6B4C', 1);
      const pin4Txt = makeText(randomUUID(), boardId, boardId, 'Pin FWD 1 Txt', cx + 160, cy + 383, 48, 20, 'DEL', 'display', 20, '800', '#DFF3E6', 'center');
      const pin5 = makeCircle(randomUUID(), boardId, boardId, 'Pin FWD 2', cx + 270, cy + 370, 48, '#D9F2A5', 0.8, 2, '#0C6B4C', 1);
      const pin5Txt = makeText(randomUUID(), boardId, boardId, 'Pin FWD 2 Txt', cx + 270, cy + 383, 48, 20, 'DEL', 'display', 20, '800', '#DFF3E6', 'center');

      // Right Steps
      const rightPanel = makeRect(randomUUID(), boardId, boardId, 'Right Panel', cx + 480, cy + 30, 450, 480, '#073828', 0.85, '#D9F2A5', 0.25, 1.5, 12);
      const step1T = makeText(randomUUID(), boardId, boardId, 'Step 1 T', cx + 510, cy + 60, 400, 32, '1. UBICA LA POSICIÓN', 'display', 26, '900', '#FFD25A');
      const step1D = makeText(randomUUID(), boardId, boardId, 'Step 1 D', cx + 510, cy + 96, 400, 50, 'Elige tu cancha en Barranquilla, hora y marca quién falta en la formación.', 'body', 18, '400', '#C8E6D4');

      const step2T = makeText(randomUUID(), boardId, boardId, 'Step 2 T', cx + 510, cy + 180, 400, 32, '2. COPIA EL LINK CORTO', 'display', 26, '900', '#FFD25A');
      const step2D = makeText(randomUUID(), boardId, boardId, 'Step 2 D', cx + 510, cy + 216, 400, 50, 'Tu enlace bafut.macuttech.com/p/xxx vuela directo en tus grupos de WhatsApp.', 'body', 18, '400', '#C8E6D4');

      const step3T = makeText(randomUUID(), boardId, boardId, 'Step 3 T', cx + 510, cy + 300, 400, 32, '3. CONFIRMA CON 1 TOQUE', 'display', 26, '900', '#FFD25A');
      const step3D = makeText(randomUUID(), boardId, boardId, 'Step 3 D', cx + 510, cy + 336, 400, 50, 'Los jugadores piden el cupo desde su móvil y tú decides quién entra.', 'body', 18, '400', '#C8E6D4');

      const bannerLink = makeRect(randomUUID(), boardId, boardId, 'Banner Link', cx + 510, cy + 420, 390, 60, '#0C6B4C', 1, '#D9F2A5', 0.5, 2, 10);
      const bannerLinkTxt = makeText(randomUUID(), boardId, boardId, 'Banner Link Txt', cx + 510, cy + 438, 390, 24, 'WHATSAPP COMPATIBLE · ENLACE DIRECTO', 'mono', 15, '600', '#FFD25A', 'center', '1');

      return [cardBg, pitchMini, pitchCenterCircle, pin1, pin1Txt, pin1Alert, pin1AlertTxt, pin2, pin2Txt, pin3, pin3Txt, pin4, pin4Txt, pin5, pin5Txt, rightPanel, step1T, step1D, step2T, step2D, step3T, step3D, bannerLink, bannerLinkTxt];
    }
  });

  // --- 3. RESERVA TU TURNO ---
  buildCleanBoard({
    name: 'BaFut · 3. Reserva tu Turno (PRO) · 1080x1080',
    x: 100,
    y: 3700,
    badge: 'ALQUILER DE HORARIOS Y SEDES',
    h1: 'APARTA TU FRANJA.',
    h2: 'SIN INTERMEDIARIOS.',
    sub: 'Consulta disponibilidad en tiempo real, abona directo a la sede y asegura tu horario.',
    cta: 'BUSCAR CANCHAS DISPONIBLES → bafut.macuttech.com',
    meta: 'PAGO DIRECTO AL DUEÑO · CERO CUSTODIA · TOTAL TRANSPARENCIA',
    cardBuilder: (boardId, bx, by) => {
      const cx = bx + 60;
      const cy = by + 345;
      const cw = 960;
      const ch = 540;

      const cardBg = makeRect(randomUUID(), boardId, boardId, 'Card Ticket Reserva', cx, cy, cw, ch, '#0C6B4C', 0.85, '#D9F2A5', 0.35, 2, 20);

      // Left Ticket Stub
      const ticketStub = makeRect(randomUUID(), boardId, boardId, 'Ticket Stub', cx + 30, cy + 30, 380, 480, '#073828', 0.9, '#D9F2A5', 0.3, 2, 12);
      const ticketHead = makeText(randomUUID(), boardId, boardId, 'Ticket Head', cx + 50, cy + 60, 340, 24, 'PASE DE TURNO OFICIAL', 'mono', 16, '700', '#D9F2A5', 'center', '2');
      const ticketVenue = makeText(randomUUID(), boardId, boardId, 'Ticket Venue', cx + 50, cy + 100, 340, 36, 'CANCHA SINTÉTICA #2', 'display', 32, '900', '#DFF3E6', 'center');
      const ticketSport = makeText(randomUUID(), boardId, boardId, 'Ticket Sport', cx + 50, cy + 140, 340, 24, 'FÚTBOL 5 · BARRANQUILLA', 'mono', 16, '500', '#C8E6D4', 'center');
      
      const timeBox = makeRect(randomUUID(), boardId, boardId, 'Time Box', cx + 55, cy + 190, 330, 100, '#0A4F38', 1, '#FFD25A', 0.6, 2, 10);
      const timeLabel = makeText(randomUUID(), boardId, boardId, 'Time Label', cx + 55, cy + 205, 330, 20, 'HORARIO SELECCIONADO', 'mono', 14, '600', '#FFD25A', 'center', '1');
      const timeValue = makeText(randomUUID(), boardId, boardId, 'Time Value', cx + 55, cy + 235, 330, 44, '8:00 PM - 9:00 PM', 'display', 40, '900', '#DFF3E6', 'center');

      const badgeConfirmed = makeRect(randomUUID(), boardId, boardId, 'Badge Confirmed', cx + 70, cy + 320, 300, 40, '#FFD25A', 1, null, 0, 0, 8);
      const badgeConfirmedTxt = makeText(randomUUID(), boardId, boardId, 'Badge Confirmed Txt', cx + 70, cy + 330, 300, 20, 'BLOQUEO INMEDIATO', 'display', 20, '900', '#073828', 'center', '1');
      const priceText = makeText(randomUUID(), boardId, boardId, 'Price Text', cx + 50, cy + 390, 340, 28, 'VALOR: $90.000 COP', 'display', 30, '800', '#DFF3E6', 'center');
      const priceNote = makeText(randomUUID(), boardId, boardId, 'Price Note', cx + 50, cy + 430, 340, 40, 'Abono 50% directo al dueño vía Nequi', 'body', 16, '400', '#C8E6D4', 'center');

      // Right Steps
      const rightSteps = makeRect(randomUUID(), boardId, boardId, 'Right Steps', cx + 440, cy + 30, 490, 480, '#073828', 0.85, '#D9F2A5', 0.25, 1.5, 12);
      const r1T = makeText(randomUUID(), boardId, boardId, 'R1 T', cx + 470, cy + 60, 430, 32, '1. SELECCIONA TU FRANJA', 'display', 28, '900', '#FFD25A');
      const r1D = makeText(randomUUID(), boardId, boardId, 'R1 D', cx + 470, cy + 96, 430, 50, 'Elige la hora y el sistema calcula la tarifa exacta según el deporte y horario.', 'body', 18, '400', '#C8E6D4');

      const r2T = makeText(randomUUID(), boardId, boardId, 'R2 T', cx + 470, cy + 180, 430, 32, '2. TRANSFIERE EL ANTICIPO', 'display', 28, '900', '#FFD25A');
      const r2D = makeText(randomUUID(), boardId, boardId, 'R2 D', cx + 470, cy + 216, 430, 50, 'Envía el abono a la cuenta de la cancha (Nequi / Bancolombia) y sube tu soporte.', 'body', 18, '400', '#C8E6D4');

      const r3T = makeText(randomUUID(), boardId, boardId, 'R3 T', cx + 470, cy + 300, 430, 32, '3. EL DUEÑO VALIDA Y JUEGAS', 'display', 28, '900', '#FFD25A');
      const r3D = makeText(randomUUID(), boardId, boardId, 'R3 D', cx + 470, cy + 336, 430, 50, 'El dueño aprueba el comprobante y el horario queda protegido en el radar.', 'body', 18, '400', '#C8E6D4');

      const noteBox = makeRect(randomUUID(), boardId, boardId, 'Note Box', cx + 470, cy + 420, 430, 60, '#0A4F38', 1, '#D9F2A5', 0.4, 1.5, 10);
      const noteTxt = makeText(randomUUID(), boardId, boardId, 'Note Txt', cx + 470, cy + 438, 430, 24, 'CERO COMISIÓN BANCARIA BAFUT', 'mono', 16, '600', '#FFD25A', 'center', '1');

      return [cardBg, ticketStub, ticketHead, ticketVenue, ticketSport, timeBox, timeLabel, timeValue, badgeConfirmed, badgeConfirmedTxt, priceText, priceNote, rightSteps, r1T, r1D, r2T, r2D, r3T, r3D, noteBox, noteTxt];
    }
  });

  // --- 4. PROS Y LÍMITES ---
  buildCleanBoard({
    name: 'BaFut · 4. Pros y Límites (PRO) · 1080x1080',
    x: 1280,
    y: 3700,
    badge: 'TRANSPARENCIA TOTAL',
    h1: 'PUNTOS CLAROS.',
    h2: 'PATEADAS BLINDADAS.',
    sub: 'BaFut es el radar deportivo de Barranquilla: qué sí hacemos y qué dejamos en tus manos.',
    cta: 'ÚNETE AL RADAR DE BARRANQUILLA → bafut.macuttech.com',
    meta: 'HECHO EN BARRANQUILLA · COMUNIDAD DEPORTIVA REAL',
    cardBuilder: (boardId, bx, by) => {
      const cx = bx + 60;
      const cy = by + 345;
      const cw = 960;
      const ch = 540;

      const cardBg = makeRect(randomUUID(), boardId, boardId, 'Card Scoreboard', cx, cy, cw, ch, '#0A4F38', 0.9, '#D9F2A5', 0.35, 2, 20);

      // Left Column (PROS)
      const leftCol = makeRect(randomUUID(), boardId, boardId, 'Left Col BG', cx + 30, cy + 30, 435, 480, '#0C6B4C', 0.95, '#D9F2A5', 0.4, 2, 12);
      const leftTag = makeRect(randomUUID(), boardId, boardId, 'Left Tag', cx + 55, cy + 55, 200, 36, '#D9F2A5', 1, null, 0, 0, 6);
      const leftTagTxt = makeText(randomUUID(), boardId, boardId, 'Left Tag Txt', cx + 55, cy + 63, 200, 20, 'LO QUE SÍ TIENES', 'display', 20, '900', '#073828', 'center', '1');

      const pros = [
        '01 · Radar en vivo de huecos en la ciudad',
        '02 · Pizarrón táctico para armar nóminas',
        '03 · 0% comisión sobre partidos y huecos',
        '04 · Web App rápida sin descargas pesadas',
        '05 · Directorio multideporte (Fútbol, Pádel...)'
      ];
      const prosShapes: any[] = [];
      let py = cy + 120;
      pros.forEach((p, idx) => {
        prosShapes.push(makeText(randomUUID(), boardId, boardId, `Pro ${idx}`, cx + 55, py, 385, 45, p, 'body', 18, '500', '#DFF3E6'));
        py += 70;
      });

      // Right Column (LÍMITES)
      const rightCol = makeRect(randomUUID(), boardId, boardId, 'Right Col BG', cx + 495, cy + 30, 435, 480, '#073828', 0.95, '#FFD25A', 0.35, 2, 12);
      const rightTag = makeRect(randomUUID(), boardId, boardId, 'Right Tag', cx + 520, cy + 55, 200, 36, '#FFD25A', 1, null, 0, 0, 6);
      const rightTagTxt = makeText(randomUUID(), boardId, boardId, 'Right Tag Txt', cx + 520, cy + 63, 200, 20, 'LO QUE NO ES', 'display', 20, '900', '#073828', 'center', '1');

      const cons = [
        '01 · No es chat in-app (se apoya en WhatsApp)',
        '02 · No custodiamos dinero (pagas al dueño/host)',
        '03 · Reservas sujetas a confirmación de la sede',
        '04 · Enfocado 100% en Barranquilla (por ahora)',
        '05 · El compromiso de jugar depende del equipo'
      ];
      const consShapes: any[] = [];
      let cyPos = cy + 120;
      cons.forEach((c, idx) => {
        consShapes.push(makeText(randomUUID(), boardId, boardId, `Con ${idx}`, cx + 520, cyPos, 385, 45, c, 'body', 18, '400', '#C8E6D4'));
        cyPos += 70;
      });

      return [cardBg, leftCol, leftTag, leftTagTxt, ...prosShapes, rightCol, rightTag, rightTagTxt, ...consShapes];
    }
  });

  console.log(`Generated ${newObjs.length} clean professional objects with official fonts.`);

  const addChanges = newObjs.map(obj => ({
    type: 'add-obj',
    id: obj.id,
    'page-id': pageId,
    'frame-id': obj.frameId,
    'parent-id': obj.parentId,
    obj
  }));

  const allChanges = [...delChanges, ...addChanges];
  console.log(`Submitting ${allChanges.length} changes to Penpot...`);

  const sessionId = randomUUID();
  const resUpdate = await fetch('https://design.penpot.app/api/rpc/command/update-file', {
    method: 'POST',
    headers: {
      'Authorization': 'Token ' + token,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: fileId,
      'session-id': sessionId,
      revn: file.revn,
      vern: file.vern || 0,
      changes: allChanges
    })
  });

  const resBody = await resUpdate.json();
  if (resBody.revn) {
    console.log('✨ SUCCESS! Penpot boards updated with official fonts and ZERO emojis! New revn:', resBody.revn);
  } else {
    console.error('Update failed:', JSON.stringify(resBody, null, 2));
  }
}

run().catch(console.error);
