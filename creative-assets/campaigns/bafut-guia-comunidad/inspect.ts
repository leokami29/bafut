import fs from 'fs';

async function inspectFlyerStructure() {
  const token = 'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2R0NNIn0.WaXcAhqTeTy-Mto6kK-Xve1xpdJBAj-BKsqt_H5xeEWzZaVGkREkcg.yRsxIMOB4G_hc7ZJ.-7hltaVLLWKt1tkKxTe9VnoBsoNWou5Kz08wBUD7uA8P2AV13GkMmRecdj6npaa9xWi15RivZKCTSRzxbpcTcDi67X752Ue9oTqbD56g3DQ7Eq-ngj2sh3Tc4j_AA7NCtVtGdlazIPr_HTt-bxxMvl9oXIeBc1pMn1wNaNvo4R5ZcYRSwql74nCx1je4FQj-QupnyG_L6Iqu.8J3swlj82qVps5Z4yeOvyg';
  const headers = {
    'Authorization': 'Token ' + token,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const res = await fetch('https://design.penpot.app/api/rpc/command/get-file', {
    method: 'POST',
    headers,
    body: JSON.stringify({ 'id': 'c828d3cf-7d4e-8145-8008-998ad79484f1' })
  });
  const file = await res.json();
  const pageId = Object.keys(file.data.pagesIndex)[0];
  const page = file.data.pagesIndex[pageId];
  const objects = page.objects;

  function printChildren(parentId: string, depth = 0) {
    const children = Object.values(objects).filter((o: any) => o.parentId === parentId);
    children.forEach((c: any) => {
      const pad = '  '.repeat(depth);
      let extra = '';
      if (c.type === 'text') {
        const textContent = c.positionData?.map((p: any) => p.text).join(' ') || '';
        extra = ` | text: "${textContent}"`;
      }
      console.log(`${pad}- ${c.name} (${c.type}, w:${Math.round(c.width)}, h:${Math.round(c.height)}, x:${Math.round(c.x)}, y:${Math.round(c.y)})${extra}`);
      printChildren(c.id, depth + 1);
    });
  }

  console.log('--- Structure of Presentación de Marca (1080x1080) ---');
  printChildren('a7e3f184-7cea-8056-8008-99923f39e76f', 0);

  console.log('\n--- Structure of Flyer BaFut (1080x1080) ---');
  printChildren('a7e3f184-7cea-8056-8008-998eb394909b', 0);
}

inspectFlyerStructure().catch(console.error);
