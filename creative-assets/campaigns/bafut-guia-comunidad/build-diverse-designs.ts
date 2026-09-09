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

  // Find existing campaign boards to replace with completely distinct creative layouts
  const oldCampaignBoardIds = Object.values(objects)
    .filter((o: any) => o.name && (o.name.startsWith('BaFut · 0') || o.name.startsWith('BaFut · 1') || o.name.includes('(PRO)')))
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
  oldCampaignBoardIds.forEach((bId: string) => {
    allToDelete.push(...getDescendantIds(bId));
  });

  console.log(`Deleting ${allToDelete.length} repetitive draft objects from Penpot...`);
  const delChanges = allToDelete.map(id => ({
    type: 'del-obj',
    id,
    'page-id': pageId
  }));

  const newObjs: any[] = [];

  // =========================================================================
  // DESIGN 1: "MARCADOR LED DE ESTADIO" (Countdown & Urgency Scoreboard)
  // Pos: x: 100, y: 2500 | Formato: Gran Scoreboard Digital LED asimétrico
  // =========================================================================
  {
    const bx = 100;
    const by = 2500;
    const bw = 1080;
    const bh = 1080;
    const bId = randomUUID();

    const board = makeFrame(bId, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Design 1 · Marcador LED · 1080x1080', bx, by, bw, bh, '#052419');
    newObjs.push(board);

    // Top Header Ticker
    const topBar = makeRect(randomUUID(), bId, bId, 'Top Bar', bx, by, bw, 60, '#0C6B4C');
    const tickerTxt = makeText(randomUUID(), bId, bId, 'Ticker Text', bx + 40, by + 20, bw - 80, 24, 'RADAR EN VIVO · BARRANQUILLA · PATEADAS HOY · 20:00 HRS', 'mono', 15, '600', '#D9F2A5', 'center', '2');
    newObjs.push(topBar, tickerTxt);

    // Giant Scoreboard Box
    const scoreBox = makeRect(randomUUID(), bId, bId, 'Score Box', bx + 60, by + 100, bw - 120, 360, '#073828', 1, '#FFD25A', 0.6, 3, 16);
    const scoreLabel = makeText(randomUUID(), bId, bId, 'Score Label', bx + 90, by + 130, 400, 24, 'ESTADO DEL PARTIDO', 'mono', 16, '600', '#FFD25A', 'left', '2');
    const scoreTime = makeText(randomUUID(), bId, bId, 'Score Time', bx + bw - 380, by + 125, 260, 28, 'HOY · 8:00 PM', 'display', 32, '900', '#DFF3E6', 'right');
    
    // Giant Digits Counter: 09 / 10 JUGADORES
    const digitsBox = makeRect(randomUUID(), bId, bId, 'Digits Box', bx + 90, by + 180, bw - 180, 160, '#041B13', 1, '#D9F2A5', 0.25, 2, 12);
    const countBig = makeText(randomUUID(), bId, bId, 'Count Big', bx + 130, by + 205, 300, 110, '09/10', 'display', 120, '900', '#FFD25A', 'left');
    const countLabel = makeText(randomUUID(), bId, bId, 'Count Label', bx + 480, by + 225, 450, 40, 'FALTA 1 JUGADOR', 'display', 48, '900', '#DFF3E6', 'left');
    const countSub = makeText(randomUUID(), bId, bId, 'Count Sub', bx + 480, by + 280, 450, 30, 'Posición: Defensa Central o Volante', 'body', 20, '400', '#C8E6D4', 'left');

    const statusBadge = makeRect(randomUUID(), bId, bId, 'Status Badge', bx + 90, by + 370, 340, 48, '#C42A16', 1, '#FFD25A', 0.8, 2, 8);
    const statusTxt = makeText(randomUUID(), bId, bId, 'Status Text', bx + 90, by + 382, 340, 24, 'CONVOCATORIA ABIERTA', 'display', 22, '900', '#FFFFFF', 'center', '1');
    const venueTxt = makeText(randomUUID(), bId, bId, 'Venue Text', bx + 460, by + 382, 450, 24, 'SEDE: Cancha Sintética El Campín', 'mono', 16, '500', '#D9F2A5');

    newObjs.push(scoreBox, scoreLabel, scoreTime, digitsBox, countBig, countLabel, countSub, statusBadge, statusTxt, venueTxt);

    // Callout Section: 3 Horizontal Live Cards
    const rowY = by + 490;
    const c1 = makeRect(randomUUID(), bId, bId, 'C1 BG', bx + 60, rowY, 300, 280, '#073828', 1, '#D9F2A5', 0.3, 1.5, 12);
    const c1Num = makeText(randomUUID(), bId, bId, 'C1 Num', bx + 85, rowY + 25, 100, 40, '01', 'display', 48, '900', '#FFD25A');
    const c1T = makeText(randomUUID(), bId, bId, 'C1 T', bx + 85, rowY + 85, 250, 32, 'PIDE EL CUPO', 'display', 26, '900', '#DFF3E6');
    const c1D = makeText(randomUUID(), bId, bId, 'C1 D', bx + 85, rowY + 130, 250, 100, 'Entra con un clic desde tu móvil sin descargar apps pesadas.', 'body', 17, '400', '#C8E6D4');

    const c2 = makeRect(randomUUID(), bId, bId, 'C2 BG', bx + 390, rowY, 300, 280, '#073828', 1, '#D9F2A5', 0.3, 1.5, 12);
    const c2Num = makeText(randomUUID(), bId, bId, 'C2 Num', bx + 415, rowY + 25, 100, 40, '02', 'display', 48, '900', '#FFD25A');
    const c2T = makeText(randomUUID(), bId, bId, 'C2 T', bx + 415, rowY + 85, 250, 32, 'HOST CONFIRMA', 'display', 26, '900', '#DFF3E6');
    const c2D = makeText(randomUUID(), bId, bId, 'C2 D', bx + 415, rowY + 130, 250, 100, 'El organizador revisa tu solicitud y asegura tu camiseta.', 'body', 17, '400', '#C8E6D4');

    const c3 = makeRect(randomUUID(), bId, bId, 'C3 BG', bx + 720, rowY, 300, 280, '#073828', 1, '#D9F2A5', 0.3, 1.5, 12);
    const c3Num = makeText(randomUUID(), bId, bId, 'C3 Num', bx + 745, rowY + 25, 100, 40, '03', 'display', 48, '900', '#FFD25A');
    const c3T = makeText(randomUUID(), bId, bId, 'C3 T', bx + 745, rowY + 85, 250, 32, 'A LA CANCHA', 'display', 26, '900', '#FFD25A');
    const c3D = makeText(randomUUID(), bId, bId, 'C3 D', bx + 745, rowY + 130, 250, 100, 'Llega puntual a las 8:00 PM y juega tu partido completo.', 'body', 17, '400', '#C8E6D4');

    newObjs.push(c1, c1Num, c1T, c1D, c2, c2Num, c2T, c2D, c3, c3Num, c3T, c3D);

    // Bottom Action Button
    const botBtn = makeRect(randomUUID(), bId, bId, 'Bot Btn', bx + 60, by + 810, bw - 120, 180, '#FFD25A', 1, null, 0, 0, 16);
    const btnPre = makeText(randomUUID(), bId, bId, 'Btn Pre', bx + 100, by + 840, bw - 200, 24, '¿QUIERES JUGAR HOY EN BARRANQUILLA?', 'mono', 16, '700', '#073828', 'center', '2');
    const btnMain = makeText(randomUUID(), bId, bId, 'Btn Main', bx + 100, by + 880, bw - 200, 56, 'ENTRA AL RADAR → bafut.macuttech.com', 'display', 48, '900', '#073828', 'center', '1');
    const btnSub = makeText(randomUUID(), bId, bId, 'Btn Sub', bx + 100, by + 945, bw - 200, 24, 'GRATIS · SIN REGISTRO OBLIGATORIO · WEB PWA', 'mono', 14, '600', '#0A4F38', 'center', '2');
    newObjs.push(botBtn, btnPre, btnMain, btnSub);
  }

  // =========================================================================
  // DESIGN 2: "PIZARRÓN TÁCTICO CENITAL" (Full Tactical Pitch View)
  // Pos: x: 1280, y: 2500 | Formato: Cancha completa cenital con fichas
  // =========================================================================
  {
    const bx = 1280;
    const by = 2500;
    const bw = 1080;
    const bh = 1080;
    const bId = randomUUID();

    const board = makeFrame(bId, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Design 2 · Pizarrón Táctico · 1080x1080', bx, by, bw, bh, '#073828');
    newObjs.push(board);

    // Header Area
    const logoTxt = makeText(randomUUID(), bId, bId, 'Logo', bx + 60, by + 50, 200, 40, 'BAFUT', 'display', 44, '900', '#FFD25A');
    const badgeTop = makeRect(randomUUID(), bId, bId, 'Badge Top', bx + bw - 420, by + 50, 360, 38, '#0A4F38', 1, '#D9F2A5', 0.35, 1.5, 6);
    const badgeTopTxt = makeText(randomUUID(), bId, bId, 'Badge Top Txt', bx + bw - 420, by + 60, 360, 20, 'PIZARRÓN TÁCTICO OFICIAL', 'mono', 14, '600', '#D9F2A5', 'center', '2');
    newObjs.push(logoTxt, badgeTop, badgeTopTxt);

    const titleH1 = makeText(randomUUID(), bId, bId, 'H1', bx + 60, by + 110, bw - 120, 60, 'FALTA EL NÚMERO 10.', 'display', 64, '900', '#DFF3E6');
    const titleSub = makeText(randomUUID(), bId, bId, 'Sub', bx + 60, by + 175, bw - 120, 32, 'Publica la posición exacta que le falta a tu equipo y compártela en WhatsApp.', 'body', 20, '400', '#C8E6D4');
    newObjs.push(titleH1, titleSub);

    // Large Center Tactical Pitch (680px height)
    const pitchY = by + 230;
    const pitchH = 640;
    const pitchW = bw - 120;
    const pitchBg = makeRect(randomUUID(), bId, bId, 'Pitch Full BG', bx + 60, pitchY, pitchW, pitchH, '#0A4F38', 0.9, '#D9F2A5', 0.4, 3, 16);
    
    // Pitch lines
    const halfLine = makeRect(randomUUID(), bId, bId, 'Half Line', bx + 60, pitchY + pitchH / 2, pitchW, 3, '#D9F2A5', 0.3);
    const centerCircle = makeCircle(randomUUID(), bId, bId, 'Center Circle', bx + 60 + pitchW / 2 - 80, pitchY + pitchH / 2 - 80, 160, '#D9F2A5', 0.3, 3);
    const goalTop = makeRect(randomUUID(), bId, bId, 'Goal Top', bx + 60 + pitchW / 2 - 140, pitchY, 280, 90, null, 0, '#D9F2A5', 0.3, 3);
    const goalBot = makeRect(randomUUID(), bId, bId, 'Goal Bot', bx + 60 + pitchW / 2 - 140, pitchY + pitchH - 90, 280, 90, null, 0, '#D9F2A5', 0.3, 3);
    newObjs.push(pitchBg, halfLine, centerCircle, goalTop, goalBot);

    // Team A Pins (Green)
    const p1 = makeCircle(randomUUID(), bId, bId, 'P1', bx + 510, pitchY + 40, 60, '#D9F2A5', 1, 3, '#0C6B4C', 1);
    const p1Txt = makeText(randomUUID(), bId, bId, 'P1 Txt', bx + 510, pitchY + 55, 60, 26, '01', 'display', 28, '900', '#DFF3E6', 'center');
    
    const p2 = makeCircle(randomUUID(), bId, bId, 'P2', bx + 300, pitchY + 160, 60, '#D9F2A5', 1, 3, '#0C6B4C', 1);
    const p2Txt = makeText(randomUUID(), bId, bId, 'P2 Txt', bx + 300, pitchY + 175, 60, 26, '03', 'display', 28, '900', '#DFF3E6', 'center');
    
    const p3 = makeCircle(randomUUID(), bId, bId, 'P3', bx + 720, pitchY + 160, 60, '#D9F2A5', 1, 3, '#0C6B4C', 1);
    const p3Txt = makeText(randomUUID(), bId, bId, 'P3 Txt', bx + 720, pitchY + 175, 60, 26, '04', 'display', 28, '900', '#DFF3E6', 'center');

    const p4 = makeCircle(randomUUID(), bId, bId, 'P4', bx + 380, pitchY + 280, 60, '#D9F2A5', 1, 3, '#0C6B4C', 1);
    const p4Txt = makeText(randomUUID(), bId, bId, 'P4 Txt', bx + 380, pitchY + 295, 60, 26, '08', 'display', 28, '900', '#DFF3E6', 'center');

    // MISSING PLAYER PIN (FLOOD YELLOW + RED CALLOUT)
    const pMissing = makeCircle(randomUUID(), bId, bId, 'P Missing', bx + 640, pitchY + 270, 76, '#FFD25A', 1, 4, '#C42A16', 1);
    const pMissingTxt = makeText(randomUUID(), bId, bId, 'P Missing Txt', bx + 640, pitchY + 288, 76, 36, '10', 'display', 38, '900', '#FFFFFF', 'center');
    
    const alertBox = makeRect(randomUUID(), bId, bId, 'Alert Box', bx + 500, pitchY + 360, 360, 52, '#FFD25A', 1, null, 0, 0, 8);
    const alertBoxTxt = makeText(randomUUID(), bId, bId, 'Alert Box Txt', bx + 500, pitchY + 373, 360, 26, '¡CUPO ABIERTO AQUÍ!', 'display', 26, '900', '#073828', 'center', '1');

    newObjs.push(p1, p1Txt, p2, p2Txt, p3, p3Txt, p4, p4Txt, pMissing, pMissingTxt, alertBox, alertBoxTxt);

    // Tactical Bottom Legend Bar
    const legBar = makeRect(randomUUID(), bId, bId, 'Leg Bar', bx + 80, pitchY + pitchH - 80, pitchW - 40, 60, '#073828', 0.95, '#D9F2A5', 0.3, 1.5, 10);
    const legTxt = makeText(randomUUID(), bId, bId, 'Leg Txt', bx + 100, pitchY + pitchH - 62, pitchW - 80, 24, 'CANCHA SINTÉTICA EL CAMPÍN · 20:00 - 21:00 HRS · FÚTBOL 5', 'mono', 15, '600', '#D9F2A5', 'center', '1');
    newObjs.push(legBar, legTxt);

    // Bottom CTA Bar
    const ctaY = by + 900;
    const ctaFull = makeRect(randomUUID(), bId, bId, 'CTA Full', bx + 60, ctaY, bw - 120, 130, '#FFD25A', 1, null, 0, 0, 14);
    const ctaFullT = makeText(randomUUID(), bId, bId, 'CTA Full T', bx + 90, ctaY + 25, bw - 180, 44, 'PIDE TU CUPO O PUBLICA TU HUECO →', 'display', 40, '900', '#073828', 'center');
    const ctaFullSub = makeText(randomUUID(), bId, bId, 'CTA Full Sub', bx + 90, ctaY + 75, bw - 180, 24, 'bafut.macuttech.com · RADAR DE PATEADAS EN BARRANQUILLA', 'mono', 15, '700', '#0A4F38', 'center', '1');
    newObjs.push(ctaFull, ctaFullT, ctaFullSub);
  }

  // =========================================================================
  // DESIGN 3: "PASE DE TURNO / TICKET TROQUELADO" (Sporting Ticket Pass)
  // Pos: x: 100, y: 3700 | Formato: Boleto físico troquelado con código de barras
  // =========================================================================
  {
    const bx = 100;
    const by = 3700;
    const bw = 1080;
    const bh = 1080;
    const bId = randomUUID();

    const board = makeFrame(bId, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Design 3 · Ticket Troquelado · 1080x1080', bx, by, bw, bh, '#0C6B4C');
    newObjs.push(board);

    // Background diagonal stripes texture sutil
    const bgStripe = makeRect(randomUUID(), bId, bId, 'Stripe', bx, by, bw, 240, '#073828', 0.8);
    const topHead = makeText(randomUUID(), bId, bId, 'Top Head', bx + 60, by + 40, bw - 120, 24, 'BAFUT · SISTEMA OFICIAL DE RESERVAS Y TURNOS', 'mono', 15, '700', '#D9F2A5', 'center', '2');
    const heroH1 = makeText(randomUUID(), bId, bId, 'Hero H1', bx + 60, by + 75, bw - 120, 72, 'TU CANCHA APARTADA. CERO ENREDOS.', 'display', 66, '900', '#FFD25A', 'center');
    const heroSub = makeText(randomUUID(), bId, bId, 'Hero Sub', bx + 60, by + 155, bw - 120, 32, 'Transfiere el anticipo a la sede, sube tu soporte y asegura tu franja de juego.', 'body', 20, '400', '#DFF3E6', 'center');
    newObjs.push(bgStripe, topHead, heroH1, heroSub);

    // Giant Physical Ticket Mockup (Paper Background #DFF3E6)
    const tY = by + 230;
    const tW = bw - 160; // 920
    const tH = 640;
    const tX = bx + 80;

    const ticketBody = makeRect(randomUUID(), bId, bId, 'Ticket Body', tX, tY, tW, tH, '#DFF3E6', 1, '#10231C', 0.15, 2, 16);
    
    // Perforated line on ticket
    const cutLine = makeRect(randomUUID(), bId, bId, 'Cut Line', tX, tY + 440, tW, 2, '#10231C', 0.25);
    newObjs.push(ticketBody, cutLine);

    // Ticket Header inside ticket
    const tBadge = makeRect(randomUUID(), bId, bId, 'T Badge', tX + 40, tY + 40, 260, 36, '#073828', 1, null, 0, 0, 6);
    const tBadgeTxt = makeText(randomUUID(), bId, bId, 'T Badge Txt', tX + 40, tY + 49, 260, 18, 'BOLETO DE TURNO ASIGNADO', 'mono', 13, '600', '#D9F2A5', 'center', '1');
    const tCode = makeText(randomUUID(), bId, bId, 'T Code', tX + tW - 280, tY + 48, 240, 20, 'REF: #BQ-2026-8PM', 'mono', 15, '700', '#073828', 'right');
    newObjs.push(tBadge, tBadgeTxt, tCode);

    // Venue & Match Info
    const tVenue = makeText(randomUUID(), bId, bId, 'T Venue', tX + 40, tY + 105, tW - 80, 48, 'COMPLEJO DEPORTIVO LA 84', 'display', 52, '900', '#073828');
    const tSport = makeText(randomUUID(), bId, bId, 'T Sport', tX + 40, tY + 165, tW - 80, 26, 'CANCHA SINTÉTICA #1 · FÚTBOL 5 NOCTURNO · BARRANQUILLA', 'mono', 16, '600', '#0C6B4C');
    newObjs.push(tVenue, tSport);

    // Large Time & Price Blocks
    const bTime = makeRect(randomUUID(), bId, bId, 'B Time', tX + 40, tY + 215, 400, 130, '#073828', 1, null, 0, 0, 10);
    const bTimeLabel = makeText(randomUUID(), bId, bId, 'B Time Label', tX + 60, tY + 235, 360, 20, 'FRANJA RESERVADA', 'mono', 14, '600', '#FFD25A');
    const bTimeVal = makeText(randomUUID(), bId, bId, 'B Time Val', tX + 60, tY + 265, 360, 56, '8:00 - 9:00 PM', 'display', 50, '900', '#DFF3E6');

    const bPrice = makeRect(randomUUID(), bId, bId, 'B Price', tX + 460, tY + 215, 380, 130, '#FFFFFF', 1, '#0C6B4C', 0.2, 1.5, 10);
    const bPriceLabel = makeText(randomUUID(), bId, bId, 'B Price Label', tX + 480, tY + 235, 340, 20, 'TARIFA OFICIAL', 'mono', 14, '600', '#0C6B4C');
    const bPriceVal = makeText(randomUUID(), bId, bId, 'B Price Val', tX + 480, tY + 265, 340, 56, '$90.000 COP', 'display', 50, '900', '#073828');

    newObjs.push(bTime, bTimeLabel, bTimeVal, bPrice, bPriceLabel, bPriceVal);

    // Stamped Watermark Badge
    const stamp = makeRect(randomUUID(), bId, bId, 'Stamp', tX + 40, tY + 365, tW - 80, 52, '#0C6B4C', 0.15, '#0C6B4C', 0.6, 2, 8);
    const stampTxt = makeText(randomUUID(), bId, bId, 'Stamp Txt', tX + 40, tY + 380, tW - 80, 24, 'CONFIRMACIÓN DIRECTA CON EL DUEÑO DE LA SEDE', 'mono', 15, '700', '#073828', 'center', '1');
    newObjs.push(stamp, stampTxt);

    // Ticket Stub Bottom (Barcode simulation & direct CTA)
    const bar1 = makeRect(randomUUID(), bId, bId, 'Bar 1', tX + 40, tY + 470, 260, 80, '#073828');
    const barTxt = makeText(randomUUID(), bId, bId, 'Bar Txt', tX + 40, tY + 560, 260, 20, '||| | | |||| | ||| | ||', 'mono', 18, '700', '#073828', 'center');
    
    const stubBtn = makeRect(randomUUID(), bId, bId, 'Stub Btn', tX + 330, tY + 470, tW - 370, 110, '#073828', 1, '#FFD25A', 0.8, 2, 10);
    const stubBtnT = makeText(randomUUID(), bId, bId, 'Stub Btn T', tX + 350, tY + 490, tW - 410, 36, 'RESERVA EN LÍNEA AHORA →', 'display', 34, '900', '#FFD25A', 'center');
    const stubBtnSub = makeText(randomUUID(), bId, bId, 'Stub Btn Sub', tX + 350, tY + 540, tW - 410, 20, 'bafut.macuttech.com/canchas', 'mono', 15, '600', '#DFF3E6', 'center');
    newObjs.push(bar1, barTxt, stubBtn, stubBtnT, stubBtnSub);

    // Footer
    const footTxt = makeText(randomUUID(), bId, bId, 'Foot Txt', bx + 60, by + 910, bw - 120, 24, 'PAGO DIRECTO A LA CUSTA DE LA CANCHA · CERO COMISIÓN DE INTERMEDIACIÓN', 'mono', 15, '600', '#DFF3E6', 'center', '1');
    newObjs.push(footTxt);
  }

  // =========================================================================
  // DESIGN 4: "AFICHE TIPOGRÁFICO SUIZO" (Swiss Athletic Poster)
  // Pos: x: 1280, y: 3700 | Formato: Tipografía brutalista gigante a sangre
  // =========================================================================
  {
    const bx = 1280;
    const by = 3700;
    const bw = 1080;
    const bh = 1080;
    const bId = randomUUID();

    const board = makeFrame(bId, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Design 4 · Afiche Suizo · 1080x1080', bx, by, bw, bh, '#073828');
    newObjs.push(board);

    // Top Brand Tag
    const tag1 = makeText(randomUUID(), bId, bId, 'Tag 1', bx + 60, by + 50, 400, 24, 'BAFUT / MANIFIESTO DEPORTIVO', 'mono', 16, '700', '#FFD25A', 'left', '2');
    const tag2 = makeText(randomUUID(), bId, bId, 'Tag 2', bx + bw - 460, by + 50, 400, 24, 'EDICIÓN BARRANQUILLA 2026', 'mono', 16, '600', '#D9F2A5', 'right', '2');
    const divider1 = makeRect(randomUUID(), bId, bId, 'Div 1', bx + 60, by + 85, bw - 120, 3, '#FFD25A');
    newObjs.push(tag1, tag2, divider1);

    // Giant Headline Typography Edge to Edge
    const hLine1 = makeText(randomUUID(), bId, bId, 'HL 1', bx + 60, by + 105, bw - 120, 110, 'NO TE QUEDES', 'display', 125, '900', '#DFF3E6');
    const hLine2 = makeText(randomUUID(), bId, bId, 'HL 2', bx + 60, by + 215, bw - 120, 110, 'SIN JUGAR HOY.', 'display', 125, '900', '#FFD25A');
    newObjs.push(hLine1, hLine2);

    // 2 Big Asymmetric Split Columns
    const splitY = by + 370;
    const colLeft = makeRect(randomUUID(), bId, bId, 'Col Left', bx + 60, splitY, 460, 420, '#0C6B4C', 1, '#D9F2A5', 0.4, 2, 12);
    const colLeftHead = makeText(randomUUID(), bId, bId, 'CL Head', bx + 90, splitY + 30, 400, 28, 'PARA EL QUE BUSCA PARTIDO', 'mono', 15, '700', '#FFD25A', 'left', '1');
    const cl1 = makeText(randomUUID(), bId, bId, 'CL 1', bx + 90, splitY + 75, 400, 38, '01. ENTRA AL RADAR', 'display', 34, '900', '#DFF3E6');
    const cl1D = makeText(randomUUID(), bId, bId, 'CL 1 D', bx + 90, splitY + 115, 400, 50, 'Mira qué canchas y pateadas tienen cupos abiertos hoy en Barranquilla.', 'body', 17, '400', '#C8E6D4');
    const cl2 = makeText(randomUUID(), bId, bId, 'CL 2', bx + 90, splitY + 185, 400, 38, '02. PIDE TU PUESTO', 'display', 34, '900', '#DFF3E6');
    const cl2D = makeText(randomUUID(), bId, bId, 'CL 2 D', bx + 90, splitY + 225, 400, 50, 'Elige la posición que juegas y confirma tu asistencia con el organizador.', 'body', 17, '400', '#C8E6D4');
    const cl3 = makeText(randomUUID(), bId, bId, 'CL 3', bx + 90, splitY + 295, 400, 38, '03. SIN COSTOS EXTRA', 'display', 34, '900', '#FFD25A');
    const cl3D = makeText(randomUUID(), bId, bId, 'CL 3 D', bx + 90, splitY + 335, 400, 50, 'Cero comisión de intermediación de la app. Solo ve y juega.', 'body', 17, '400', '#C8E6D4');

    const colRight = makeRect(randomUUID(), bId, bId, 'Col Right', bx + 560, splitY, 460, 420, '#041B13', 1, '#D9F2A5', 0.25, 2, 12);
    const colRightHead = makeText(randomUUID(), bId, bId, 'CR Head', bx + 590, splitY + 30, 400, 28, 'PARA EL QUE TIENE CANCHA', 'mono', 15, '700', '#D9F2A5', 'left', '1');
    const cr1 = makeText(randomUUID(), bId, bId, 'CR 1', bx + 590, splitY + 75, 400, 38, '01. PUBLICA HUECOS', 'display', 34, '900', '#DFF3E6');
    const cr1D = makeText(randomUUID(), bId, bId, 'CR 1 D', bx + 590, splitY + 115, 400, 50, '¿Te faltan 2 defensas? Arma la táctica y comparte el enlace en WhatsApp.', 'body', 17, '400', '#C8E6D4');
    const cr2 = makeText(randomUUID(), bId, bId, 'CR 2', bx + 590, splitY + 185, 400, 38, '02. RECLAMA TU SEDE', 'display', 34, '900', '#DFF3E6');
    const cr2D = makeText(randomUUID(), bId, bId, 'CR 2 D', bx + 590, splitY + 225, 400, 50, 'Los dueños de cancha controlan sus tarifas y horarios sin pagar comisión.', 'body', 17, '400', '#C8E6D4');
    const cr3 = makeText(randomUUID(), bId, bId, 'CR 3', bx + 590, splitY + 295, 400, 38, '03. LLENA TUS FRANJAS', 'display', 34, '900', '#FFD25A');
    const cr3D = makeText(randomUUID(), bId, bId, 'CR 3 D', bx + 590, splitY + 335, 400, 50, 'Recibe transferencias directas a tu cuenta y llena horarios vacíos.', 'body', 17, '400', '#C8E6D4');

    newObjs.push(colLeft, colLeftHead, cl1, cl1D, cl2, cl2D, cl3, cl3D, colRight, colRightHead, cr1, cr1D, cr2, cr2D, cr3, cr3D);

    // Swiss Footer Bar
    const footY = by + 820;
    const footBg = makeRect(randomUUID(), bId, bId, 'Foot BG', bx + 60, footY, bw - 120, 180, '#FFD25A', 1, null, 0, 0, 14);
    const footT1 = makeText(randomUUID(), bId, bId, 'FT 1', bx + 100, footY + 25, bw - 200, 56, 'BAFUT.MACUTTECH.COM', 'display', 60, '900', '#073828', 'center', '2');
    const footT2 = makeText(randomUUID(), bId, bId, 'FT 2', bx + 100, footY + 95, bw - 200, 26, 'EL RADAR DE HUECOS Y CANCHAS EN BARRANQUILLA', 'mono', 17, '700', '#0A4F38', 'center', '1');
    newObjs.push(footBg, footT1, footT2);
  }

  // =========================================================================
  // DESIGN 5: "DASHBOARD DE SEDE & MÉTRICAS" (Venue B2B Dashboard)
  // Pos: x: 100, y: 4900 | Formato: Ficha ejecutiva de club nocturno con KPIs
  // =========================================================================
  {
    const bx = 100;
    const by = 4900;
    const bw = 1080;
    const bh = 1080;
    const bId = randomUUID();

    const board = makeFrame(bId, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Design 5 · Dashboard Sede · 1080x1080', bx, by, bw, bh, '#073828');
    newObjs.push(board);

    // Top Banner
    const vTag = makeText(randomUUID(), bId, bId, 'V Tag', bx + 60, by + 40, 400, 24, 'DUEÑOS Y ADMINISTRADORES DE CANCHAS', 'mono', 15, '700', '#FFD25A', 'left', '1');
    const vLogo = makeText(randomUUID(), bId, bId, 'V Logo', bx + bw - 220, by + 40, 160, 36, 'BAFUT', 'display', 40, '900', '#DFF3E6', 'right');
    const vH1 = makeText(randomUUID(), bId, bId, 'V H1', bx + 60, by + 80, bw - 120, 68, 'MONETIZA TUS FRANJAS VACÍAS.', 'display', 66, '900', '#DFF3E6');
    const vSub = makeText(randomUUID(), bId, bId, 'V Sub', bx + 60, by + 150, bw - 120, 32, 'Reclama tu complejo en el directorio oficial y activa reservas automáticas sin intermediarios.', 'body', 20, '400', '#C8E6D4');
    newObjs.push(vTag, vLogo, vH1, vSub);

    // Dashboard Frame (Dark card with stats & metrics)
    const dY = by + 210;
    const dW = bw - 120;
    const dH = 650;
    const dashBg = makeRect(randomUUID(), bId, bId, 'Dash BG', bx + 60, dY, dW, dH, '#0A4F38', 0.9, '#D9F2A5', 0.35, 2, 16);

    // Top Venue Profile Card
    const profBg = makeRect(randomUUID(), bId, bId, 'Prof BG', bx + 90, dY + 30, dW - 60, 110, '#073828', 1, '#D9F2A5', 0.25, 1.5, 12);
    const profName = makeText(randomUUID(), bId, bId, 'Prof Name', bx + 120, dY + 50, 500, 36, 'COMPLEJO DEPORTIVO VILLA COUNTRY', 'display', 34, '900', '#DFF3E6');
    const profLoc = makeText(randomUUID(), bId, bId, 'Prof Loc', bx + 120, dY + 92, 500, 24, 'CRA 53 #76-120 · BARRANQUILLA', 'mono', 15, '500', '#C8E6D4');
    
    const verifBadge = makeRect(randomUUID(), bId, bId, 'Verif Badge', bx + dW - 270, dY + 55, 220, 44, '#FFD25A', 1, null, 0, 0, 8);
    const verifBadgeT = makeText(randomUUID(), bId, bId, 'Verif Badge T', bx + dW - 270, dY + 68, 220, 20, 'PERFIL VERIFICADO', 'display', 20, '900', '#073828', 'center', '1');
    newObjs.push(profBg, profName, profLoc, verifBadge, verifBadgeT);

    // 3 Metrics Cards inside Dashboard
    const mY = dY + 165;
    const mW = (dW - 100) / 3;

    const m1 = makeRect(randomUUID(), bId, bId, 'M1 BG', bx + 90, mY, mW, 170, '#073828', 1, '#D9F2A5', 0.2, 1.5, 10);
    const m1V = makeText(randomUUID(), bId, bId, 'M1 V', bx + 115, mY + 25, mW - 50, 56, '0% COMISIÓN', 'display', 44, '900', '#FFD25A');
    const m1L = makeText(randomUUID(), bId, bId, 'M1 L', bx + 115, mY + 85, mW - 50, 40, 'El 100% del pago va directo a tu cuenta de Nequi o Banco.', 'body', 16, '400', '#C8E6D4');

    const m2 = makeRect(randomUUID(), bId, bId, 'M2 BG', bx + 90 + mW + 20, mY, mW, 170, '#073828', 1, '#D9F2A5', 0.2, 1.5, 10);
    const m2V = makeText(randomUUID(), bId, bId, 'M2 V', bx + 115 + mW + 20, mY + 25, mW - 50, 56, '100% EN VIVO', 'display', 44, '900', '#DFF3E6');
    const m2L = makeText(randomUUID(), bId, bId, 'M2 L', bx + 115 + mW + 20, mY + 85, mW - 50, 40, 'Actualiza precios por hora y deporte en tiempo real.', 'body', 16, '400', '#C8E6D4');

    const m3 = makeRect(randomUUID(), bId, bId, 'M3 BG', bx + 90 + (mW + 20) * 2, mY, mW, 170, '#073828', 1, '#D9F2A5', 0.2, 1.5, 10);
    const m3V = makeText(randomUUID(), bId, bId, 'M3 V', bx + 115 + (mW + 20) * 2, mY + 25, mW - 50, 56, 'SIN ENREDOS', 'display', 44, '900', '#D9F2A5');
    const m3L = makeText(randomUUID(), bId, bId, 'M3 L', bx + 115 + (mW + 20) * 2, mY + 85, mW - 50, 40, 'Validación instantánea de comprobantes de pago.', 'body', 16, '400', '#C8E6D4');

    newObjs.push(dashBg, m1, m1V, m1L, m2, m2V, m2L, m3, m3V, m3L);

    // Feature Rows list inside Dashboard
    const rY = dY + 360;
    const featBg = makeRect(randomUUID(), bId, bId, 'Feat BG', bx + 90, rY, dW - 60, 240, '#073828', 0.95, '#D9F2A5', 0.2, 1.5, 12);
    
    const f1T = makeText(randomUUID(), bId, bId, 'F1 T', bx + 120, rY + 30, dW - 120, 28, '01. MULTIDEPORTE: Fútbol 5, Fútbol 7, Futsal, Pádel, Básquetbol y Voleibol', 'display', 24, '900', '#DFF3E6');
    const f2T = makeText(randomUUID(), bId, bId, 'F2 T', bx + 120, rY + 80, dW - 120, 28, '02. VISIBILIDAD: Aparece en el radar de miles de jugadores activos en Barranquilla', 'display', 24, '900', '#DFF3E6');
    const f3T = makeText(randomUUID(), bId, bId, 'F3 T', bx + 120, rY + 130, dW - 120, 28, '03. LINK EN BIO: Pon tu enlace de BaFut en tu Instagram para automatizar tu agenda', 'display', 24, '900', '#FFD25A');
    const f4T = makeText(randomUUID(), bId, bId, 'F4 T', bx + 120, rY + 180, dW - 120, 28, '04. CERO COSTO: Reclamar tu sede y listar tus tarifas es 100% gratuito', 'display', 24, '900', '#D9F2A5');

    newObjs.push(featBg, f1T, f2T, f3T, f4T);

    // Bottom CTA
    const bCta = makeRect(randomUUID(), bId, bId, 'B CTA', bx + 60, by + 890, bw - 120, 130, '#FFD25A', 1, null, 0, 0, 14);
    const bCtaT = makeText(randomUUID(), bId, bId, 'B CTA T', bx + 90, by + 915, bw - 180, 44, 'RECLAMA TU SEDE DEPORTIVA →', 'display', 40, '900', '#073828', 'center');
    const bCtaSub = makeText(randomUUID(), bId, bId, 'B CTA Sub', bx + 90, by + 965, bw - 180, 24, 'bafut.macuttech.com/canchas · BARRANQUILLA', 'mono', 15, '700', '#0A4F38', 'center', '1');
    newObjs.push(bCta, bCtaT, bCtaSub);
  }

  // =========================================================================
  // DESIGN 6: "DUELO / RETA DE EQUIPOS 5v5 VS" (Versus Challenge Poster)
  // Pos: x: 1280, y: 4900 | Formato: Póster de choque entre dos equipos completos
  // =========================================================================
  {
    const bx = 1280;
    const by = 4900;
    const bw = 1080;
    const bh = 1080;
    const bId = randomUUID();

    const board = makeFrame(bId, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Design 6 · Reto de Equipos VS · 1080x1080', bx, by, bw, bh, '#073828');
    newObjs.push(board);

    // Top Tag
    const tVersus = makeText(randomUUID(), bId, bId, 'T Versus', bx + 60, by + 45, 400, 24, 'RETO DE EQUIPOS · FÚTBOL 5 / 7', 'mono', 15, '700', '#FFD25A', 'left', '1');
    const tBrand = makeText(randomUUID(), bId, bId, 'T Brand', bx + bw - 220, by + 45, 160, 36, 'BAFUT', 'display', 40, '900', '#DFF3E6', 'right');
    const vsH1 = makeText(randomUUID(), bId, bId, 'VS H1', bx + 60, by + 85, bw - 120, 68, 'TIENEN EQUIPO. ¿TIENEN RIVAL?', 'display', 66, '900', '#DFF3E6');
    const vsSub = makeText(randomUUID(), bId, bId, 'VS Sub', bx + 60, by + 155, bw - 120, 32, 'Lanza un desafío en tu zona. El equipo perdedor paga el alquiler de la cancha.', 'body', 20, '400', '#C8E6D4');
    newObjs.push(tVersus, tBrand, vsH1, vsSub);

    // Center VS Arena Block
    const aY = by + 220;
    const aW = bw - 120;
    const aH = 480;

    // Team Left Card
    const teamLW = (aW - 140) / 2;
    const teamL = makeRect(randomUUID(), bId, bId, 'Team L', bx + 60, aY, teamLW, aH, '#0C6B4C', 1, '#D9F2A5', 0.4, 2, 16);
    const teamLTag = makeText(randomUUID(), bId, bId, 'Team L Tag', bx + 85, aY + 30, teamLW - 50, 20, 'EQUIPO RETADOR', 'mono', 14, '600', '#FFD25A');
    const teamLName = makeText(randomUUID(), bId, bId, 'Team L Name', bx + 85, aY + 65, teamLW - 50, 48, 'LOS COSTEÑOS FC', 'display', 42, '900', '#DFF3E6');
    const teamLDesc = makeText(randomUUID(), bId, bId, 'Team L Desc', bx + 85, aY + 125, teamLW - 50, 30, 'Nivel: Competitivo · 5 Titulares Listos', 'body', 17, '400', '#C8E6D4');
    
    // Position circles left
    const cL1 = makeCircle(randomUUID(), bId, bId, 'CL 1', bx + 110, aY + 200, 50, '#D9F2A5', 1, 2, '#073828', 1);
    const cL1T = makeText(randomUUID(), bId, bId, 'CL 1 T', bx + 110, aY + 213, 50, 20, 'GK', 'display', 20, '900', '#DFF3E6', 'center');
    const cL2 = makeCircle(randomUUID(), bId, bId, 'CL 2', bx + 180, aY + 200, 50, '#D9F2A5', 1, 2, '#073828', 1);
    const cL2T = makeText(randomUUID(), bId, bId, 'CL 2 T', bx + 180, aY + 213, 50, 20, 'DF', 'display', 20, '900', '#DFF3E6', 'center');
    const cL3 = makeCircle(randomUUID(), bId, bId, 'CL 3', bx + 250, aY + 200, 50, '#D9F2A5', 1, 2, '#073828', 1);
    const cL3T = makeText(randomUUID(), bId, bId, 'CL 3 T', bx + 250, aY + 213, 50, 20, 'DF', 'display', 20, '900', '#DFF3E6', 'center');
    const cL4 = makeCircle(randomUUID(), bId, bId, 'CL 4', bx + 320, aY + 200, 50, '#D9F2A5', 1, 2, '#073828', 1);
    const cL4T = makeText(randomUUID(), bId, bId, 'CL 4 T', bx + 320, aY + 213, 50, 20, 'MC', 'display', 20, '900', '#DFF3E6', 'center');
    const cL5 = makeCircle(randomUUID(), bId, bId, 'CL 5', bx + 390, aY + 200, 50, '#D9F2A5', 1, 2, '#073828', 1);
    const cL5T = makeText(randomUUID(), bId, bId, 'CL 5 T', bx + 390, aY + 213, 50, 20, 'DEL', 'display', 20, '900', '#DFF3E6', 'center');

    const statusL = makeRect(randomUUID(), bId, bId, 'Status L', bx + 85, aY + 380, teamLW - 50, 48, '#073828', 1, '#D9F2A5', 0.5, 1.5, 8);
    const statusLTxt = makeText(randomUUID(), bId, bId, 'Status L Txt', bx + 85, aY + 393, teamLW - 50, 22, 'NÓMINA COMPLETA 5/5', 'display', 22, '900', '#D9F2A5', 'center', '1');

    newObjs.push(teamL, teamLTag, teamLName, teamLDesc, cL1, cL1T, cL2, cL2T, cL3, cL3T, cL4, cL4T, cL5, cL5T, statusL, statusLTxt);

    // Center VS Emblem
    const vsCircle = makeCircle(randomUUID(), bId, bId, 'VS Circle', bx + 60 + teamLW + 10, aY + aH / 2 - 60, 120, '#FFD25A', 1, 3, '#073828', 1);
    const vsText = makeText(randomUUID(), bId, bId, 'VS Text', bx + 60 + teamLW + 10, aY + aH / 2 - 25, 120, 50, 'VS', 'display', 56, '900', '#FFD25A', 'center');
    newObjs.push(vsCircle, vsText);

    // Team Right Card (Searching / Open Spot)
    const teamRX = bx + 60 + teamLW + 140;
    const teamR = makeRect(randomUUID(), bId, bId, 'Team R', teamRX, aY, teamLW, aH, '#041B13', 1, '#FFD25A', 0.5, 2, 16);
    const teamRTag = makeText(randomUUID(), bId, bId, 'Team R Tag', teamRX + 25, aY + 30, teamLW - 50, 20, 'SE BUSCA RIVAL', 'mono', 14, '600', '#FFD25A');
    const teamRName = makeText(randomUUID(), bId, bId, 'Team R Name', teamRX + 25, aY + 65, teamLW - 50, 48, '¿TU EQUIPO ACEPTA?', 'display', 42, '900', '#FFD25A');
    const teamRDesc = makeText(randomUUID(), bId, bId, 'Team R Desc', teamRX + 25, aY + 125, teamLW - 50, 30, 'Sede: Sintética El Campín · 20:00 HRS', 'body', 17, '400', '#C8E6D4');

    const challengeBox = makeRect(randomUUID(), bId, bId, 'Chal Box', teamRX + 25, aY + 190, teamLW - 50, 160, '#073828', 1, '#D9F2A5', 0.3, 1.5, 10);
    const chalT1 = makeText(randomUUID(), bId, bId, 'Chal T1', teamRX + 45, aY + 215, teamLW - 90, 26, 'REGLAS DEL DESAFÍO:', 'mono', 14, '700', '#D9F2A5');
    const chalT2 = makeText(randomUUID(), bId, bId, 'Chal T2', teamRX + 45, aY + 250, teamLW - 90, 40, '• 2 Tiempos de 25 minutos\n• El perdedor asume la cancha\n• Balón oficial y petos en sede', 'body', 16, '400', '#DFF3E6');

    const statusR = makeRect(randomUUID(), bId, bId, 'Status R', teamRX + 25, aY + 380, teamLW - 50, 48, '#C42A16', 1, '#FFD25A', 0.8, 2, 8);
    const statusRTxt = makeText(randomUUID(), bId, bId, 'Status R Txt', teamRX + 25, aY + 393, teamLW - 50, 22, '¡ACEPTA LA RETA AHORA!', 'display', 22, '900', '#FFFFFF', 'center', '1');

    newObjs.push(teamR, teamRTag, teamRName, teamRDesc, challengeBox, chalT1, chalT2, statusR, statusRTxt);

    // Bottom Action Banner
    const vsCta = makeRect(randomUUID(), bId, bId, 'VS CTA', bx + 60, by + 730, bw - 120, 160, '#FFD25A', 1, null, 0, 0, 14);
    const vsCtaT = makeText(randomUUID(), bId, bId, 'VS CTA T', bx + 90, by + 760, bw - 180, 48, 'LANZA O ACEPTA UN RETO DEPORTIVO →', 'display', 42, '900', '#073828', 'center');
    const vsCtaSub = makeText(randomUUID(), bId, bId, 'VS CTA Sub', bx + 90, by + 815, bw - 180, 24, 'BAFUT.MACUTTECH.COM · BARRANQUILLA', 'mono', 16, '700', '#0A4F38', 'center', '1');
    
    const footInfo = makeText(randomUUID(), bId, bId, 'Foot Info', bx + 60, by + 915, bw - 120, 24, 'MATCHMAKING DE EQUIPOS COMPLETOS · CERO COMISIÓN · FÚTBOL 5 Y 7', 'mono', 15, '600', '#D9F2A5', 'center', '1');
    newObjs.push(vsCta, vsCtaT, vsCtaSub, footInfo);
  }

  console.log(`Generated ${newObjs.length} objects for 6 completely distinct layouts.`);

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
    console.log('🎉 6 UNIQUE MASTERCLASS DESIGNS UPLOADED TO PENPOT! New revn:', resBody.revn);
  } else {
    console.error('Update failed:', JSON.stringify(resBody, null, 2));
  }
}

run().catch(console.error);
