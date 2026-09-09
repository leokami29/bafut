import { randomUUID } from 'crypto';

async function createPenpotBoards() {
  const token = 'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2R0NNIn0.WaXcAhqTeTy-Mto6kK-Xve1xpdJBAj-BKsqt_H5xeEWzZaVGkREkcg.yRsxIMOB4G_hc7ZJ.-7hltaVLLWKt1tkKxTe9VnoBsoNWou5Kz08wBUD7uA8P2AV13GkMmRecdj6npaa9xWi15RivZKCTSRzxbpcTcDi67X752Ue9oTqbD56g3DQ7Eq-ngj2sh3Tc4j_AA7NCtVtGdlazIPr_HTt-bxxMvl9oXIeBc1pMn1wNaNvo4R5ZcYRSwql74nCx1je4FQj-QupnyG_L6Iqu.8J3swlj82qVps5Z4yeOvyg';
  const fileId = 'c828d3cf-7d4e-8145-8008-998ad79484f1';
  const pageId = 'c828d3cf-7d4e-8145-8008-998ad79484f2';

  const resFile = await fetch('https://design.penpot.app/api/rpc/command/get-file', {
    method: 'POST',
    headers: {
      'Authorization': 'Token ' + token,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id: fileId })
  });
  const file = await resFile.json();
  const page = file.data.pagesIndex[pageId];
  const objects = page.objects;

  console.log('Current revn:', file.revn, 'vern:', file.vern);

  const templateBoardId = 'a7e3f184-7cea-8056-8008-99923f39e76f';
  
  function getTree(rootId: string) {
    const list: any[] = [objects[rootId]];
    function addChildren(pid: string) {
      const kids = Object.values(objects).filter((o: any) => o.parentId === pid);
      kids.forEach((k: any) => {
        list.push(k);
        addChildren(k.id);
      });
    }
    addChildren(rootId);
    return list;
  }

  const templateObjects = getTree(templateBoardId);
  console.log('Found', templateObjects.length, 'objects in template.');

  const boardConfigs = [
    {
      name: 'BaFut · 1. Reclama tu Cancha · 1080x1080',
      x: 100,
      y: 2500,
      badge: 'DUEÑOS Y ADMINISTRADORES',
      h1: 'RECLAMA TU CANCHA',
      desc: 'Gestiona tus tarifas, horarios y habilita reservas directas sin pagar comisiones.',
      steps: [
        { num: '1', title: 'BUSCA', detail: 'Encuentra tu complejo en el directorio' },
        { num: '2', title: 'VERIFICA', detail: 'Valida tu contacto oficial o NIT' },
        { num: '3', title: 'GESTIONA', detail: 'Toma el control de turnos y precios' }
      ],
      cta: 'RECLAMA TU SEDE → bafut.macuttech.com/canchas',
      meta: 'BARRANQUILLA · SIN COMISIONES · CONTROL TOTAL'
    },
    {
      name: 'BaFut · 2. Publica tu Hueco · 1080x1080',
      x: 1280,
      y: 2500,
      badge: 'ORGANIZADORES Y JUGADORES',
      h1: '¿FALTA UNO A LAS 8?',
      desc: 'Arma tu táctica en el pizarrón y comparte el link por WhatsApp para llenar los cupos.',
      steps: [
        { num: '1', title: 'PUBLICA', detail: 'Cancha, hora y puesto faltante' },
        { num: '2', title: 'COMPARTE', detail: 'El enlace vuela por WhatsApp' },
        { num: '3', title: 'CONFIRMA', detail: 'Acepta al jugador y a la cancha' }
      ],
      cta: 'PUBLICA TU PARTIDO → bafut.macuttech.com',
      meta: 'GRATIS · SIN REGISTRO · RADAR EN VIVO'
    },
    {
      name: 'BaFut · 3. Reserva tu Turno · 1080x1080',
      x: 100,
      y: 3700,
      badge: 'JUGADORES Y EQUIPOS',
      h1: 'APARTA TU TURNO',
      desc: 'Escoge tu horario disponible, transfiere el abono directo a la sede y asegura tu cancha.',
      steps: [
        { num: '1', title: 'ELIGE', detail: 'Escoge tu franja y deporte' },
        { num: '2', title: 'ABONA', detail: 'Transfiere el anticipo a la sede' },
        { num: '3', title: 'BLINDA', detail: 'El dueño valida y queda apartada' }
      ],
      cta: 'APARTA TU TURNO → bafut.macuttech.com',
      meta: 'PAGO DIRECTO AL DUEÑO · SIN COMISIÓN EXTRA'
    },
    {
      name: 'BaFut · 4. Pros y Límites · 1080x1080',
      x: 1280,
      y: 3700,
      badge: 'TRANSPARENCIA TOTAL',
      h1: '¿POR QUÉ BAFUT?',
      desc: 'La plataforma directa para la comunidad futbolera y multideportiva de Barranquilla.',
      steps: [
        { num: '1', title: '0% COMISIÓN', detail: 'Cero cobro por publicar partidos' },
        { num: '2', title: 'PIZARRÓN', detail: 'Ves qué posición táctica falta' },
        { num: '3', title: 'WHATSAPP', detail: 'Se integra con tus grupos reales' }
      ],
      cta: 'ÚNETE HOY → bafut.macuttech.com',
      meta: 'APP WEB ULTRARRÁPIDA · HECHO EN BARRANQUILLA'
    }
  ];

  const allChanges: any[] = [];

  for (const config of boardConfigs) {
    const idMap = new Map<string, string>();
    templateObjects.forEach((o: any) => {
      idMap.set(o.id, randomUUID());
    });

    const newRootId = idMap.get(templateBoardId)!;
    const dx = config.x - objects[templateBoardId].x;
    const dy = config.y - objects[templateBoardId].y;

    const clonedObjects = templateObjects.map((orig: any) => {
      const cloned = JSON.parse(JSON.stringify(orig));
      const newId = idMap.get(orig.id)!;
      cloned.id = newId;

      if (orig.id === templateBoardId) {
        cloned.name = config.name;
        cloned.parentId = '00000000-0000-0000-0000-000000000000';
        cloned.frameId = '00000000-0000-0000-0000-000000000000';
      } else {
        cloned.parentId = idMap.get(orig.parentId) || newRootId;
        cloned.frameId = idMap.get(orig.frameId) || orig.frameId;
      }

      cloned.x = orig.x + dx;
      cloned.y = orig.y + dy;
      if (cloned.selrect) {
        cloned.selrect.x += dx;
        cloned.selrect.y += dy;
        cloned.selrect.x1 += dx;
        cloned.selrect.y1 += dy;
        cloned.selrect.x2 += dx;
        cloned.selrect.y2 += dy;
      }
      if (cloned.points) {
        cloned.points = cloned.points.map((pt: any) => ({ x: pt.x + dx, y: pt.y + dy }));
      }
      if (cloned.shapes) {
        cloned.shapes = cloned.shapes.map((sid: string) => idMap.get(sid) || sid);
      }

      if (cloned.type === 'text') {
        let newText = '';
        if (cloned.name === 'Tagline') {
          newText = config.badge;
        } else if (cloned.name === 'Nombre') {
          newText = config.h1;
        } else if (cloned.name === 'Descripción') {
          newText = config.desc;
        } else if (cloned.name === 'URL') {
          newText = config.cta;
        } else if (cloned.name === 'Meta') {
          newText = config.meta;
        }

        if (orig.parentId && objects[orig.parentId]?.name === 'Paso 1') {
          if (cloned.name === 'Número') newText = config.steps[0].num;
          if (cloned.name === 'Título') newText = config.steps[0].title;
          if (cloned.name === 'Detalle') newText = config.steps[0].detail;
        } else if (orig.parentId && objects[orig.parentId]?.name === 'Paso 2') {
          if (cloned.name === 'Número') newText = config.steps[1].num;
          if (cloned.name === 'Título') newText = config.steps[1].title;
          if (cloned.name === 'Detalle') newText = config.steps[1].detail;
        } else if (orig.parentId && objects[orig.parentId]?.name === 'Paso 3') {
          if (cloned.name === 'Número') newText = config.steps[2].num;
          if (cloned.name === 'Título') newText = config.steps[2].title;
          if (cloned.name === 'Detalle') newText = config.steps[2].detail;
        }

        if (newText) {
          function replaceTextInContent(node: any) {
            if (node.text !== undefined) {
              node.text = newText;
            }
            if (node.children) {
              node.children.forEach(replaceTextInContent);
            }
          }
          if (cloned.content) replaceTextInContent(cloned.content);
          if (cloned.positionData) {
            cloned.positionData.forEach((pd: any) => { pd.text = newText; });
          }
        }
      }

      return cloned;
    });

    clonedObjects.forEach((obj: any) => {
      allChanges.push({
        type: 'add-obj',
        id: obj.id,
        'page-id': pageId,
        'frame-id': obj.frameId,
        'parent-id': obj.parentId,
        obj: obj
      });
    });
  }

  console.log('Sending', allChanges.length, 'changes to Penpot...');

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

  console.log('Update status:', resUpdate.status);
  const updateResult = await resUpdate.json();
  if (updateResult.revn) {
    console.log('✨ SUCCESS! Penpot file updated! New revn:', updateResult.revn);
  } else {
    console.log('Error/Response:', JSON.stringify(updateResult, null, 2).slice(0, 1000));
  }
}

createPenpotBoards().catch(console.error);
