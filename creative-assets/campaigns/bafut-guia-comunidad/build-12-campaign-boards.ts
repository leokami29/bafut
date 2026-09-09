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

interface FlyerDef {
  num: number;
  col: number;
  row: number;
  title: string;
  badge: string;
  h1: string;
  h2: string;
  sub: string;
  cardTitle: string;
  items: Array<{ tag: string; title: string; desc: string }>;
  cta: string;
  meta: string;
}

const flyers: FlyerDef[] = [
  // ROW 1: Urgencia & Pateadas de Hoy
  {
    num: 1,
    col: 0,
    row: 0,
    title: 'BaFut · 01. Clásico 7:30 PM · 1080x1080',
    badge: 'URGENCIA · MISMO DÍA',
    h1: 'TE CLAVARON EL VISTO.',
    h2: 'LA PATEADA NO SE CAE.',
    sub: 'Faltan 30 minutos para rodar el balón y alguien apagó el celular. Encuentra relevo en 2 minutos.',
    cardTitle: 'RADAR DE RELEVO INMEDIATO',
    items: [
      { tag: 'PASO 1', title: 'MARCA EL HUECO', desc: 'Indica la cancha y la hora exacta del partido en Barranquilla.' },
      { tag: 'PASO 2', title: 'COMPARTE EL LINK', desc: 'Pega el enlace corto en tus grupos de WhatsApp.' },
      { tag: 'PASO 3', title: 'COMPLETA LA NÓMINA', desc: 'Los jugadores piden el cupo con un toque y tú confirmas.' }
    ],
    cta: 'PUBLICAR HUECO EN 30s → bafut.macuttech.com',
    meta: 'BARRANQUILLA · RADAR EN VIVO · CERO CANCELACIONES'
  },
  {
    num: 2,
    col: 1,
    row: 0,
    title: 'BaFut · 02. Arquero de Emergencia · 1080x1080',
    badge: 'MATCHMAKING POR POSICIÓN',
    h1: 'HAY EQUIPO LISTO.',
    h2: 'FALTA EL DE LOS GUANTES.',
    sub: 'Hay 9 jugadores listos para la sintética y nadie quiere tapar. Filtra arqueros disponibles en la ciudad.',
    cardTitle: 'CONVOCATORIA POR POSICIÓN',
    items: [
      { tag: 'POSICIÓN', title: 'SOLO ARQUEROS', desc: 'Activa la alerta especial de portero para la franja de hoy.' },
      { tag: 'NOTIFICACIÓN', title: 'RADAR ACTIVO', desc: 'Arqueros buscando equipo reciben el aviso en tiempo real.' },
      { tag: 'CONFIRMACIÓN', title: 'GUANTES PUESTOS', desc: 'Acepta la solicitud y arranca el partido sin improvisar.' }
    ],
    cta: 'BUSCAR ARQUERO HOY → bafut.macuttech.com',
    meta: 'FÚTBOL 5/7 · FUTSAL · PATEADAS NOCTURNAS'
  },
  {
    num: 3,
    col: 2,
    row: 0,
    title: 'BaFut · 03. Viernes de Cancha · 1080x1080',
    badge: 'FIN DE SEMANA DEPORTIVO',
    h1: 'VIERNES DE SINTÉTICA.',
    h2: '¿DÓNDE SE JUEGA HOY?',
    sub: 'Termina la semana laboral y arranca el tercer tiempo. Consulta qué canchas tienen cupos abiertos.',
    cardTitle: 'DIRECTORIO DE PATEADAS ACTIVAS',
    items: [
      { tag: 'NORTE', title: 'CANCHAS NORTE', desc: 'Sedes en Villa Country, Riomar y Alto Prado con franjas abiertas.' },
      { tag: 'CENTRO / SUR', title: 'SEDES DISPONIBLES', desc: 'Complejos deportivos con horarios listos para reservar.' },
      { tag: 'UN CLIC', title: 'ÚNETE A UN PARTIDO', desc: 'Pide tu cupo individual o arma tu reto de fin de semana.' }
    ],
    cta: 'VER PARTIDOS DE HOY → bafut.macuttech.com/partidos',
    meta: 'BARRANQUILLA · PATEADA Y TERCER TIEMPO · RADAR CIUDAD'
  },

  // ROW 2: Dueños de Canchas & B2B
  {
    num: 4,
    col: 0,
    row: 1,
    title: 'BaFut · 04. Llena Franjas Muertas · 1080x1080',
    badge: 'DUEÑOS Y ADMINISTRADORES',
    h1: 'CANCHA VACÍA.',
    h2: 'DINERO QUE SE PIERDE.',
    sub: 'Cubre los horarios libres de lunes a jueves sin pagar comisiones abusivas por reserva.',
    cardTitle: 'OCUPACIÓN TOTAL DE TU SEDE',
    items: [
      { tag: 'VISIBILIDAD', title: 'MILES DE JUGADORES', desc: 'Tu sede aparece destacada en el directorio deportivo de la ciudad.' },
      { tag: 'CONTROL', title: 'PRECIOS EN VIVO', desc: 'Publica tarifas especiales para llenar horarios de 5:00 a 7:00 PM.' },
      { tag: 'PAGO DIRECTO', title: '0% COMISIÓN', desc: 'Los jugadores te abonan directo a tu cuenta o Nequi.' }
    ],
    cta: 'RECLAMA TU SEDE GRATIS → bafut.macuttech.com/canchas',
    meta: 'CONTROL TOTAL · SIN INTERMEDIARIOS · SEDES BARRANQUILLA'
  },
  {
    num: 5,
    col: 1,
    row: 1,
    title: 'BaFut · 05. Automatiza tu Agenda · 1080x1080',
    badge: 'OPERACIONES DE CANCHA',
    h1: 'AUTOMATIZA TU AGENDA.',
    h2: 'SIN PERDER TIEMPO.',
    sub: 'Deja de contestar 50 audios al día preguntando disponibilidad. Pon tu link de BaFut en tu perfil.',
    cardTitle: 'CANAL DE RESERVA DIRECTA',
    items: [
      { tag: 'ENLACE OFICIAL', title: 'LINK EN TU BIO', desc: 'Tus clientes consultan horarios libres desde su celular.' },
      { tag: 'SOPORTE DIGITAL', title: 'COMPROBANTE AL INSTANTE', desc: 'El usuario sube su comprobante y tú validas con 1 toque.' },
      { tag: 'SIN CRUCES', title: 'CERO DOBLE RESERVA', desc: 'La franja queda bloqueada en el sistema en tiempo real.' }
    ],
    cta: 'ACTIVA TUS TURNOS DIGITALES → bafut.macuttech.com',
    meta: 'GESTIÓN ÁGIL · COMPROBANTES SEGUROS · SIN LLAMADERAS'
  },
  {
    num: 6,
    col: 2,
    row: 1,
    title: 'BaFut · 06. Torneos y Ligas · 1080x1080',
    badge: 'ORGANIZACIÓN DE TORNEOS',
    h1: 'ORGANIZA TU TORNEO.',
    h2: 'TABLAS Y LLAVES EN VIVO.',
    sub: 'Olvídate de planillas en papel y tablas de Excel. Gestiona tu copa con estadísticas digitales.',
    cardTitle: 'MOTOR DE TORNEOS BAFUT',
    items: [
      { tag: 'FIXTURE', title: 'LLAVES AUTOMÁTICAS', desc: 'Fase de grupos, eliminación directa y cruces instantáneos.' },
      { tag: 'ESTADÍSTICAS', title: 'GOLEADORES Y TARJETAS', desc: 'Actas digitales por partido actualizadas en tiempo real.' },
      { tag: 'EQUIPOS', title: 'SEGUIMIENTO EN MÓVIL', desc: 'Capitanes y jugadores revisan la tabla desde el celular.' }
    ],
    cta: 'ORGANIZAR TORNEO AHORA → bafut.macuttech.com',
    meta: 'FÚTBOL 5/7 · FUTSAL · PÁDEL · BÁSQUETBOL'
  },

  // ROW 3: Multideporte & Cultura
  {
    num: 7,
    col: 0,
    row: 2,
    title: 'BaFut · 07. Cuarto para Pádel · 1080x1080',
    badge: 'MULTIDEPORTE · PÁDEL BQ',
    h1: 'SET LISTO.',
    h2: 'FALTA TU PAREJA DE PÁDEL.',
    sub: 'Tres listos en la pista y falta uno para cerrar el partido. Completa el cuarteto en segundos.',
    cardTitle: 'MATCHMAKING DE PÁDEL',
    items: [
      { tag: 'SEDES', title: 'PISTAS EN BARRANQUILLA', desc: 'Clubes y canchas de pádel con partidos comunitarios abiertos.' },
      { tag: 'NIVEL', title: 'CATEGORÍAS DE JUEGO', desc: 'Filtra por nivel para asegurar sets competitivos y parejos.' },
      { tag: 'RESERVA', title: 'ALQUILER DE PISTAS', desc: 'Aparta tu horario con confirmación directa del club.' }
    ],
    cta: 'BUSCAR PARTIDOS DE PÁDEL → bafut.macuttech.com',
    meta: 'PÁDEL BARRANQUILLA · RETAS Y PAREJAS · RADAR DEPORTIVO'
  },
  {
    num: 8,
    col: 1,
    row: 2,
    title: 'BaFut · 08. Básquet y Voleibol · 1080x1080',
    badge: 'MULTIDEPORTE COMUNITARIO',
    h1: 'EL TABLERO ESTÁ LISTO.',
    h2: '¿QUIÉN ARMA LA RETA?',
    sub: 'Fútbol, Básquet, Vóley o Futsal. La plataforma une a la comunidad deportiva de la ciudad.',
    cardTitle: 'DEPORTE EN PARQUES Y SEDES',
    items: [
      { tag: 'BÁSQUETBOL', title: 'RETAS 3v3 Y 5v5', desc: 'Encuentra gente para armar partidos de baloncesto hoy.' },
      { tag: 'VOLEIBOL', title: 'CANCHAS Y PLAYA', desc: 'Partidos abiertos de vóley en sedes sintéticas y arena.' },
      { tag: 'FUTSAL', title: 'COLISEOS Y PLACAS', desc: 'Pateadas rápidas en placas multideportivas de la ciudad.' }
    ],
    cta: 'EXPLORA TODOS LOS DEPORTES → bafut.macuttech.com',
    meta: 'BÁSQUET · VOLEIBOL · FUTSAL · PÁDEL · FÚTBOL'
  },
  {
    num: 9,
    col: 2,
    row: 2,
    title: 'BaFut · 09. El que Dijo Voy Fijo · 1080x1080',
    badge: 'HUMOR Y REALIDAD DE CANCHA',
    h1: '¿EL DE SIEMPRE TE DEJÓ BOTADO?',
    h2: 'BÚSCATE UN RELEVO SERIO.',
    sub: 'Dijo que iba fijo a las 6:50 PM y a las 7:30 PM no contesta. En BaFut juegas con gente cumplida.',
    cardTitle: 'CERO ESTRÉS DE ORGANIZACIÓN',
    items: [
      { tag: 'SIN ROGAR', title: 'JUGADORES ACTIVOS', desc: 'Conecta con gente que sí quiere jugar y está lista en la zona.' },
      { tag: 'CALIFICACIÓN', title: 'SISTEMA DE PUNTUALIDAD', desc: 'Revisa el historial de compromiso de los jugadores.' },
      { tag: 'CONFIRMACIÓN', title: 'NÓMINA CERRADA', desc: 'Confirma al que llega a tiempo y asegura tu partido.' }
    ],
    cta: 'COMPLETA TU EQUIPO YA → bafut.macuttech.com',
    meta: 'GENTE SERIA · PUNTUALIDAD · CERO CANCELACIONES'
  },

  // ROW 4: Retos de Equipos, Afiche QR y Confianza
  {
    num: 10,
    col: 0,
    row: 3,
    title: 'BaFut · 10. Reto de Equipos · 1080x1080',
    badge: 'RETO DE EQUIPOS COMPLETOS',
    h1: 'TU EQUIPO TIENE NIVEL.',
    h2: '¿PERO TIENEN RIVAL?',
    sub: '¿Tienen la nómina completa de 5 o 7 pero no hay contra quién jugar? Lanza un reto en la ciudad.',
    cardTitle: 'DESAFÍOS ENTRE EQUIPOS',
    items: [
      { tag: 'DESAFÍO', title: 'LANZA TU RETO', desc: 'Publica la cancha y hora donde tu equipo está listo para jugar.' },
      { tag: 'RIVAL', title: 'ACEPTA EL DUELO', desc: 'Otro equipo de tu zona acepta la reta con 1 toque.' },
      { tag: 'LA CANCHA', title: 'EL PERDEDOR PAGA', desc: 'Pateada con apuesta deportiva de alquiler de cancha.' }
    ],
    cta: 'LANZAR RETO DE EQUIPOS → bafut.macuttech.com',
    meta: 'FÚTBOL 5 VS 5 · FÚTBOL 7 VS 7 · RETAS DE BARRIO'
  },
  {
    num: 11,
    col: 1,
    row: 3,
    title: 'BaFut · 11. Afiche QR Cancha · 1080x1080',
    badge: 'MATERIAL OFICIAL PARA SEDES',
    h1: '¿LES FALTA GENTE HOY?',
    h2: 'ESCANEA Y COMPLETA YA.',
    sub: 'Afiche para recepción y cafetería de canchas. Encuentra relevos o cupos abiertos al instante.',
    cardTitle: 'PUNTO DE ESCANEO DE CANCHA',
    items: [
      { tag: '01. ESCANEA', title: 'CÓDIGO QR EN SEDE', desc: 'Apunta tu cámara y entra directo a los partidos de esta cancha.' },
      { tag: '02. POSTÚLATE', title: 'PIDE TU CUPO', desc: 'Mira qué equipo está en la cancha y qué posición les falta.' },
      { tag: '03. A LA CANCHA', title: 'PATEADA ARMADA', desc: 'El organizador confirma y entras a jugar de inmediato.' }
    ],
    cta: 'ESCANEA O ENTRA A → bafut.macuttech.com',
    meta: 'AFICHE OFICIAL DE SEDE · BARRANQUILLA DEPORTE'
  },
  {
    num: 12,
    col: 2,
    row: 3,
    title: 'BaFut · 12. Confianza y Nivel · 1080x1080',
    badge: 'REPUTACIÓN Y MATCHMAKING',
    h1: 'JUEGA CON GENTE SERIA.',
    h2: 'CERO CANCELACIONES.',
    sub: 'En BaFut construyes tu reputación en la cancha: puntualidad, nivel deportivo y juego limpio.',
    cardTitle: 'SISTEMA DE CONFIANZA DEPORTIVA',
    items: [
      { tag: 'PUNTUALIDAD', title: 'LLEGA A LA HORA', desc: 'Los organizadores valoran a quienes llegan antes del pitazo inicial.' },
      { tag: 'NIVEL', title: 'PARTIDOS PAREJOS', desc: 'Evaluación discreta de nivel deportivo para armar mejores juegos.' },
      { tag: 'COMUNIDAD', title: 'JUEGO LIMPIO', desc: 'Ambiente deportivo sano para disfrutar la pateada en Barranquilla.' }
    ],
    cta: 'ÚNETE A LA COMUNIDAD → bafut.macuttech.com',
    meta: 'JUEGO LIMPIO · PUNTUALIDAD · COMUNIDAD BAFUT'
  }
];

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

  // Clean old campaign boards if existing
  const oldCampaignBoardIds = Object.values(objects)
    .filter((o: any) => o.name && o.name.startsWith('BaFut · 0') || o.name.startsWith('BaFut · 10') || o.name.startsWith('BaFut · 11') || o.name.startsWith('BaFut · 12'))
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

  console.log(`Deleting ${allToDelete.length} obsolete campaign objects...`);
  const delChanges = allToDelete.map(id => ({
    type: 'del-obj',
    id,
    'page-id': pageId
  }));

  const newObjs: any[] = [];
  const startX = 100;
  const colSpacing = 1180;
  const startY = 4900;
  const rowSpacing = 1200;

  for (const f of flyers) {
    const bx = startX + f.col * colSpacing;
    const by = startY + f.row * rowSpacing;
    const bw = 1080;
    const bh = 1080;
    const boardId = randomUUID();

    // 1. Board Frame
    const board = makeFrame(boardId, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', f.title, bx, by, bw, bh, '#073828', 1, null, 0, 0, 0);
    newObjs.push(board);

    // 2. Pitch lines
    const pitchBorder = makeRect(randomUUID(), boardId, boardId, 'Pitch Border', bx + 40, by + 40, bw - 80, bh - 80, null, 0, '#D9F2A5', 0.18, 3, 28);
    const pitchCircle = makeCircle(randomUUID(), boardId, boardId, 'Pitch Circle', bx + 360, by + 360, 360, '#D9F2A5', 0.12, 3);
    newObjs.push(pitchBorder, pitchCircle);

    // 3. Header: Badge + Wordmark
    const badgeW = 390;
    const badgeBg = makeRect(randomUUID(), boardId, boardId, 'Badge BG', bx + 60, by + 60, badgeW, 42, '#0A4F38', 0.9, '#D9F2A5', 0.35, 1.5, 8);
    const badgeTxt = makeText(randomUUID(), boardId, boardId, 'Badge Text', bx + 60, by + 72, badgeW, 20, f.badge, 'mono', 15, '600', '#D9F2A5', 'center', '2');
    const wordmark = makeText(randomUUID(), boardId, boardId, 'Wordmark', bx + bw - 220, by + 60, 160, 44, 'BAFUT', 'display', 46, '900', '#FFD25A', 'right', '1');
    newObjs.push(badgeBg, badgeTxt, wordmark);

    // 4. Hero Typography
    const h1Txt = makeText(randomUUID(), boardId, boardId, 'H1 Headline', bx + 60, by + 128, bw - 120, 68, f.h1, 'display', 66, '900', '#DFF3E6', 'left', '1');
    const h2Txt = makeText(randomUUID(), boardId, boardId, 'H2 Headline', bx + 60, by + 202, bw - 120, 52, f.h2, 'display', 50, '900', '#FFD25A', 'left', '1');
    const subTxt = makeText(randomUUID(), boardId, boardId, 'Subheadline', bx + 60, by + 266, bw - 140, 54, f.sub, 'body', 21, '500', '#C8E6D4', 'left');
    newObjs.push(h1Txt, h2Txt, subTxt);

    // 5. Central Card with 3 Columns
    const cx = bx + 60;
    const cy = by + 345;
    const cw = 960;
    const ch = 540;

    const cardBg = makeRect(randomUUID(), boardId, boardId, 'Card Central', cx, cy, cw, ch, '#0C6B4C', 0.85, '#D9F2A5', 0.3, 2, 20);
    const cardTagBg = makeRect(randomUUID(), boardId, boardId, 'Card Tag BG', cx + 30, cy + 24, 280, 34, '#FFD25A', 1, null, 0, 0, 6);
    const cardTagTxt = makeText(randomUUID(), boardId, boardId, 'Card Tag Txt', cx + 30, cy + 32, 280, 18, f.cardTitle, 'display', 19, '900', '#073828', 'center', '1');
    newObjs.push(cardBg, cardTagBg, cardTagTxt);

    // 3 Item Columns
    const colW = 280;
    f.items.forEach((item, idx) => {
      const colX = cx + 30 + idx * 310;
      const colBg = makeRect(randomUUID(), boardId, boardId, `Col ${idx + 1} BG`, colX, cy + 80, colW, 420, '#073828', 0.75, '#D9F2A5', 0.25, 1.5, 12);
      const colTag = makeText(randomUUID(), boardId, boardId, `Col ${idx + 1} Tag`, colX + 20, cy + 105, colW - 40, 20, item.tag, 'mono', 14, '600', '#FFD25A', 'left', '1');
      const colTitle = makeText(randomUUID(), boardId, boardId, `Col ${idx + 1} Title`, colX + 20, cy + 145, colW - 40, 36, item.title, 'display', 26, '900', '#DFF3E6', 'left');
      const colDesc = makeText(randomUUID(), boardId, boardId, `Col ${idx + 1} Desc`, colX + 20, cy + 205, colW - 40, 120, item.desc, 'body', 18, '400', '#C8E6D4', 'left');
      newObjs.push(colBg, colTag, colTitle, colDesc);
    });

    // 6. Bottom CTA Button + Footer Meta
    const ctaW = bw - 120;
    const ctaBg = makeRect(randomUUID(), boardId, boardId, 'CTA BG', bx + 60, by + bh - 160, ctaW, 76, '#FFD25A', 1, null, 0, 0, 14);
    const ctaTxt = makeText(randomUUID(), boardId, boardId, 'CTA Text', bx + 60, by + bh - 138, ctaW, 32, f.cta, 'display', 30, '900', '#073828', 'center', '1');
    const metaTxt = makeText(randomUUID(), boardId, boardId, 'Meta Footer', bx + 60, by + bh - 60, ctaW, 20, f.meta, 'mono', 15, '600', '#D9F2A5', 'center', '2');
    newObjs.push(ctaBg, ctaTxt, metaTxt);
  }

  console.log(`Generated ${newObjs.length} objects for 12 complete campaign flyers.`);

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
    console.log('🎉 ALL 12 PRO CAMPAIGN FLYERS UPLOADED TO PENPOT! New revn:', resBody.revn);
  } else {
    console.error('Update failed:', JSON.stringify(resBody, null, 2));
  }

  // Render SVG & PNG files for each of the 12 flyers
  console.log('Rendering 12 high-resolution PNG & SVG exports...');
  for (const f of flyers) {
    const svgStr = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0C6B4C"/>
      <stop offset="100%" stop-color="#073828"/>
    </linearGradient>
    <radialGradient id="spot" cx="50%" cy="20%" r="70%">
      <stop offset="0%" stop-color="#FFD25A" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#073828" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1080" height="1080" fill="url(#bg)"/>
  <rect width="1080" height="1080" fill="url(#spot)"/>

  <!-- Pitch Lines -->
  <rect x="40" y="40" width="1000" height="1000" rx="28" fill="none" stroke="#D9F2A5" stroke-opacity="0.18" stroke-width="3"/>
  <circle cx="540" cy="540" r="180" fill="none" stroke="#D9F2A5" stroke-opacity="0.12" stroke-width="3"/>

  <!-- Header -->
  <rect x="60" y="60" width="390" height="42" rx="8" fill="#0A4F38" fill-opacity="0.9" stroke="#D9F2A5" stroke-opacity="0.35" stroke-width="1.5"/>
  <text x="255" y="87" font-family="'IBM Plex Mono', monospace" font-size="15" font-weight="600" fill="#D9F2A5" text-anchor="middle" letter-spacing="2">${f.badge}</text>
  <text x="1020" y="96" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="46" fill="#FFD25A" text-anchor="end">BAFUT</text>

  <!-- Hero Typography -->
  <text x="60" y="175" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="66" fill="#DFF3E6" letter-spacing="1">${f.h1}</text>
  <text x="60" y="235" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="50" fill="#FFD25A" letter-spacing="1">${f.h2}</text>
  <text x="60" y="285" font-family="'Outfit', sans-serif" font-size="21" font-weight="500" fill="#C8E6D4">${f.sub}</text>

  <!-- Card Central -->
  <rect x="60" y="345" width="960" height="530" rx="20" fill="#0C6B4C" fill-opacity="0.85" stroke="#D9F2A5" stroke-opacity="0.3" stroke-width="2"/>
  <rect x="90" y="370" width="280" height="34" rx="6" fill="#FFD25A"/>
  <text x="230" y="394" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="19" fill="#073828" text-anchor="middle" letter-spacing="1">${f.cardTitle}</text>

  <!-- 3 Columns -->
  ${f.items.map((it, idx) => `
    <rect x="${90 + idx * 310}" y="425" width="280" height="420" rx="12" fill="#073828" fill-opacity="0.75" stroke="#D9F2A5" stroke-opacity="0.25" stroke-width="1.5"/>
    <text x="${110 + idx * 310}" y="465" font-family="'IBM Plex Mono', monospace" font-size="14" font-weight="600" fill="#FFD25A" letter-spacing="1">${it.tag}</text>
    <text x="${110 + idx * 310}" y="515" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="26" fill="#DFF3E6">${it.title}</text>
    <text x="${110 + idx * 310}" y="565" font-family="'Outfit', sans-serif" font-size="17" font-weight="400" fill="#C8E6D4">
      <tspan x="${110 + idx * 310}" dy="0">${it.desc.slice(0, 26)}</tspan>
      <tspan x="${110 + idx * 310}" dy="26">${it.desc.slice(26, 52)}</tspan>
      <tspan x="${110 + idx * 310}" dy="26">${it.desc.slice(52, 78)}</tspan>
      <tspan x="${110 + idx * 310}" dy="26">${it.desc.slice(78)}</tspan>
    </text>
  `).join('')}

  <!-- Bottom CTA -->
  <rect x="60" y="915" width="960" height="76" rx="14" fill="#FFD25A"/>
  <text x="540" y="963" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="29" fill="#073828" text-anchor="middle" letter-spacing="1">${f.cta}</text>
  <text x="540" y="1030" font-family="'IBM Plex Mono', monospace" font-size="15" font-weight="600" fill="#D9F2A5" text-anchor="middle" letter-spacing="2">${f.meta}</text>
</svg>`;

    const fileName = `flyer-campaign-${String(f.num).padStart(2, '0')}`;
    const svgPath = path.join(outputDir, `${fileName}.svg`);
    const pngPath = path.join(outputDir, `${fileName}.png`);
    const brainPngPath = path.join(brainDir, `${fileName}.png`);

    fs.writeFileSync(svgPath, svgStr, 'utf-8');
    await sharp(Buffer.from(svgStr)).png().toFile(pngPath);
    fs.copyFileSync(pngPath, brainPngPath);
    console.log(`Rendered: ${fileName}.png`);
  }
}

run().catch(console.error);
