import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const outputDir = path.join(process.cwd(), 'creative-assets', 'campaigns', 'bafut-guia-comunidad', 'output');
const brainDir = 'C:\\Users\\Leonel Polanco F\\.gemini\\antigravity\\brain\\d3deda47-31a9-46a7-b848-ae9dd8faa78e';
fs.mkdirSync(outputDir, { recursive: true });

function renderProSvg1() {
  return `<?xml version="1.0" encoding="UTF-8"?>
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
  <text x="255" y="87" font-family="'IBM Plex Mono', monospace" font-size="15" font-weight="600" fill="#D9F2A5" text-anchor="middle" letter-spacing="2">DUEÑOS Y ADMINISTRADORES</text>
  <text x="1020" y="96" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="46" fill="#FFD25A" text-anchor="end">BAFUT</text>

  <!-- Hero Typography -->
  <text x="60" y="175" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="68" fill="#DFF3E6" letter-spacing="1">LA CANCHA ES TUYA.</text>
  <text x="60" y="235" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="52" fill="#FFD25A" letter-spacing="1">EL CONTROL TAMBIÉN.</text>
  <text x="60" y="285" font-family="'Outfit', sans-serif" font-size="22" font-weight="500" fill="#C8E6D4">Actualiza tarifas por deporte, cubre franjas libres y recibe pagos directos a tu cuenta.</text>

  <!-- Card Sede Verificada -->
  <rect x="60" y="345" width="960" height="530" rx="20" fill="#0C6B4C" fill-opacity="0.85" stroke="#D9F2A5" stroke-opacity="0.3" stroke-width="2"/>
  
  <rect x="90" y="370" width="200" height="34" rx="6" fill="#FFD25A"/>
  <text x="190" y="394" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="19" fill="#073828" text-anchor="middle" letter-spacing="1">SEDE VERIFICADA</text>
  <text x="310" y="395" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="24" fill="#DFF3E6">CANCHA SINTÉTICA EL CAMPÍN · BARRANQUILLA</text>

  <!-- 3 Columns -->
  <!-- Col 1 -->
  <rect x="90" y="425" width="280" height="420" rx="12" fill="#073828" fill-opacity="0.75" stroke="#D9F2A5" stroke-opacity="0.25" stroke-width="1.5"/>
  <text x="120" y="490" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="54" fill="#FFD25A">01</text>
  <text x="120" y="545" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="26" fill="#DFF3E6">VALIDA TU NIT</text>
  <text x="120" y="590" font-family="'Outfit', sans-serif" font-weight="400" font-size="18" fill="#C8E6D4">
    <tspan x="120" dy="0">Busca tu sede en el</tspan>
    <tspan x="120" dy="28">directorio y valida tu</tspan>
    <tspan x="120" dy="28">contacto oficial para</tspan>
    <tspan x="120" dy="28">evitar suplantaciones.</tspan>
  </text>

  <!-- Col 2 -->
  <rect x="400" y="425" width="280" height="420" rx="12" fill="#073828" fill-opacity="0.75" stroke="#D9F2A5" stroke-opacity="0.25" stroke-width="1.5"/>
  <text x="430" y="490" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="54" fill="#FFD25A">02</text>
  <text x="430" y="545" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="26" fill="#DFF3E6">TARIFAS EN VIVO</text>
  <text x="430" y="590" font-family="'Outfit', sans-serif" font-weight="400" font-size="18" fill="#C8E6D4">
    <tspan x="430" dy="0">Configura tus precios</tspan>
    <tspan x="430" dy="28">por hora y deporte:</tspan>
    <tspan x="430" dy="28">Fútbol 5/7, Futsal,</tspan>
    <tspan x="430" dy="28">Pádel y Básquetbol.</tspan>
  </text>

  <!-- Col 3 -->
  <rect x="710" y="425" width="280" height="420" rx="12" fill="#073828" fill-opacity="0.75" stroke="#D9F2A5" stroke-opacity="0.25" stroke-width="1.5"/>
  <text x="740" y="490" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="54" fill="#FFD25A">03</text>
  <text x="740" y="545" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="26" fill="#FFD25A">0% COMISIÓN</text>
  <text x="740" y="590" font-family="'Outfit', sans-serif" font-weight="400" font-size="18" fill="#C8E6D4">
    <tspan x="740" dy="0">Tus clientes te transfieren</tspan>
    <tspan x="740" dy="28">directo a tu cuenta.</tspan>
    <tspan x="740" dy="28">BaFut no retiene ni</tspan>
    <tspan x="740" dy="28">intermedia tu dinero.</tspan>
  </text>

  <!-- Bottom CTA -->
  <rect x="60" y="915" width="960" height="76" rx="14" fill="#FFD25A"/>
  <text x="540" y="963" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="30" fill="#073828" text-anchor="middle" letter-spacing="1">RECLAMA TU SEDE GRATIS → bafut.macuttech.com/canchas</text>
  <text x="540" y="1030" font-family="'IBM Plex Mono', monospace" font-size="15" font-weight="600" fill="#D9F2A5" text-anchor="middle" letter-spacing="2">BARRANQUILLA · 0% COMISIÓN EN PARTIDOS · CONTROL TOTAL</text>
</svg>`;
}

function renderProSvg2() {
  return `<?xml version="1.0" encoding="UTF-8"?>
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
  <text x="255" y="87" font-family="'IBM Plex Mono', monospace" font-size="15" font-weight="600" fill="#D9F2A5" text-anchor="middle" letter-spacing="2">ORGANIZADORES Y JUGADORES</text>
  <text x="1020" y="96" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="46" fill="#FFD25A" text-anchor="end">BAFUT</text>

  <!-- Hero Typography -->
  <text x="60" y="175" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="68" fill="#DFF3E6" letter-spacing="1">¿SE CAYÓ EL ARQUERO?</text>
  <text x="60" y="235" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="52" fill="#FFD25A" letter-spacing="1">PUBLICA EL HUECO EN 30s.</text>
  <text x="60" y="285" font-family="'Outfit', sans-serif" font-size="22" font-weight="500" fill="#C8E6D4">No canceles la pateada. Marca la posición en el pizarrón táctico y comparte el link por WhatsApp.</text>

  <!-- Card Pizarrón Táctico -->
  <rect x="60" y="345" width="960" height="530" rx="20" fill="#0A4F38" fill-opacity="0.9" stroke="#D9F2A5" stroke-opacity="0.4" stroke-width="2"/>

  <!-- Left Tactical Pitch -->
  <rect x="90" y="375" width="420" height="470" rx="12" fill="#073828" fill-opacity="0.95" stroke="#D9F2A5" stroke-opacity="0.35" stroke-width="2"/>
  <circle cx="300" cy="610" r="70" fill="none" stroke="#D9F2A5" stroke-opacity="0.25" stroke-width="2"/>
  <line x1="90" y1="610" x2="510" y2="610" stroke="#D9F2A5" stroke-opacity="0.25" stroke-width="2"/>

  <!-- Goalkeeper (RED PIN) -->
  <circle cx="300" cy="435" r="28" fill="#C42A16" stroke="#FFD25A" stroke-width="3"/>
  <text x="300" y="443" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="22" fill="#FFFFFF" text-anchor="middle">GK</text>
  <rect x="170" y="475" width="260" height="32" rx="6" fill="#FFD25A"/>
  <text x="300" y="497" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="16" fill="#073828" text-anchor="middle" letter-spacing="1">FALTA ARQUERO A LAS 8:00 PM</text>

  <!-- Defenders -->
  <circle cx="200" cy="550" r="24" fill="#0C6B4C" stroke="#D9F2A5" stroke-width="2"/>
  <text x="200" y="557" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="18" fill="#DFF3E6" text-anchor="middle">DF</text>
  <circle cx="400" cy="550" r="24" fill="#0C6B4C" stroke="#D9F2A5" stroke-width="2"/>
  <text x="400" y="557" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="18" fill="#DFF3E6" text-anchor="middle">DF</text>

  <!-- Forwards -->
  <circle cx="240" cy="700" r="24" fill="#0C6B4C" stroke="#D9F2A5" stroke-width="2"/>
  <text x="240" y="707" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="18" fill="#DFF3E6" text-anchor="middle">DEL</text>
  <circle cx="360" cy="700" r="24" fill="#0C6B4C" stroke="#D9F2A5" stroke-width="2"/>
  <text x="360" y="707" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="18" fill="#DFF3E6" text-anchor="middle">DEL</text>

  <!-- Right Steps Panel -->
  <rect x="540" y="375" width="450" height="470" rx="12" fill="#073828" fill-opacity="0.85" stroke="#D9F2A5" stroke-opacity="0.25" stroke-width="1.5"/>
  
  <text x="570" y="420" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="26" fill="#FFD25A">1. UBICA LA POSICIÓN</text>
  <text x="570" y="452" font-family="'Outfit', sans-serif" font-weight="400" font-size="17" fill="#C8E6D4">
    <tspan x="570" dy="0">Elige cancha, hora y marca quién falta</tspan>
    <tspan x="570" dy="24">en el pizarrón táctico interactivo.</tspan>
  </text>

  <text x="570" y="530" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="26" fill="#FFD25A">2. COPIA EL LINK CORTO</text>
  <text x="570" y="562" font-family="'Outfit', sans-serif" font-weight="400" font-size="17" fill="#C8E6D4">
    <tspan x="570" dy="0">Tu link bafut.macuttech.com/p/xxx</tspan>
    <tspan x="570" dy="24">vuela directo en tus grupos de WhatsApp.</tspan>
  </text>

  <text x="570" y="640" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="26" fill="#FFD25A">3. CONFIRMA CON 1 TOQUE</text>
  <text x="570" y="672" font-family="'Outfit', sans-serif" font-weight="400" font-size="17" fill="#C8E6D4">
    <tspan x="570" dy="0">Los jugadores piden cupo en el móvil</tspan>
    <tspan x="570" dy="24">y tú decides quién entra a la nómina.</tspan>
  </text>

  <rect x="570" y="750" width="390" height="60" rx="10" fill="#0C6B4C" stroke="#D9F2A5" stroke-opacity="0.5" stroke-width="2"/>
  <text x="765" y="787" font-family="'IBM Plex Mono', monospace" font-size="15" font-weight="600" fill="#FFD25A" text-anchor="middle" letter-spacing="1">WHATSAPP COMPATIBLE · ENLACE DIRECTO</text>

  <!-- Bottom CTA -->
  <rect x="60" y="915" width="960" height="76" rx="14" fill="#FFD25A"/>
  <text x="540" y="963" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="30" fill="#073828" text-anchor="middle" letter-spacing="1">PUBLICAR PARTIDO AHORA → bafut.macuttech.com/partidos/nuevo</text>
  <text x="540" y="1030" font-family="'IBM Plex Mono', monospace" font-size="15" font-weight="600" fill="#D9F2A5" text-anchor="middle" letter-spacing="2">GRATIS · SIN REGISTRO OBLIGATORIO · RADAR EN VIVO</text>
</svg>`;
}

function renderProSvg3() {
  return `<?xml version="1.0" encoding="UTF-8"?>
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
  <text x="255" y="87" font-family="'IBM Plex Mono', monospace" font-size="15" font-weight="600" fill="#D9F2A5" text-anchor="middle" letter-spacing="2">ALQUILER DE HORARIOS Y SEDES</text>
  <text x="1020" y="96" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="46" fill="#FFD25A" text-anchor="end">BAFUT</text>

  <!-- Hero Typography -->
  <text x="60" y="175" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="68" fill="#DFF3E6" letter-spacing="1">APARTA TU FRANJA.</text>
  <text x="60" y="235" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="52" fill="#FFD25A" letter-spacing="1">SIN INTERMEDIARIOS.</text>
  <text x="60" y="285" font-family="'Outfit', sans-serif" font-size="22" font-weight="500" fill="#C8E6D4">Consulta disponibilidad en tiempo real, abona directo a la sede y asegura tu horario.</text>

  <!-- Card Ticket Reserva -->
  <rect x="60" y="345" width="960" height="530" rx="20" fill="#0C6B4C" fill-opacity="0.85" stroke="#D9F2A5" stroke-opacity="0.35" stroke-width="2"/>

  <!-- Left Ticket Stub -->
  <rect x="90" y="375" width="380" height="470" rx="12" fill="#073828" fill-opacity="0.9" stroke="#D9F2A5" stroke-opacity="0.3" stroke-width="2"/>
  <text x="280" y="415" font-family="'IBM Plex Mono', monospace" font-size="16" font-weight="700" fill="#D9F2A5" text-anchor="middle" letter-spacing="2">PASE DE TURNO OFICIAL</text>
  <text x="280" y="455" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="32" fill="#DFF3E6" text-anchor="middle">CANCHA SINTÉTICA #2</text>
  <text x="280" y="485" font-family="'IBM Plex Mono', monospace" font-size="15" font-weight="500" fill="#C8E6D4" text-anchor="middle">FÚTBOL 5 · BARRANQUILLA</text>

  <!-- Time box -->
  <rect x="115" y="515" width="330" height="95" rx="10" fill="#0A4F38" stroke="#FFD25A" stroke-opacity="0.6" stroke-width="2"/>
  <text x="280" y="545" font-family="'IBM Plex Mono', monospace" font-size="14" font-weight="600" fill="#FFD25A" text-anchor="middle" letter-spacing="1">HORARIO SELECCIONADO</text>
  <text x="280" y="585" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="40" fill="#DFF3E6" text-anchor="middle">8:00 PM - 9:00 PM</text>

  <!-- Confirmed Badge -->
  <rect x="130" y="635" width="300" height="40" rx="8" fill="#FFD25A"/>
  <text x="280" y="661" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="20" fill="#073828" text-anchor="middle" letter-spacing="1">BLOQUEO INMEDIATO</text>

  <text x="280" y="725" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="30" fill="#DFF3E6" text-anchor="middle">VALOR: $90.000 COP</text>
  <text x="280" y="755" font-family="'Outfit', sans-serif" font-weight="400" font-size="16" fill="#C8E6D4" text-anchor="middle">Abono 50% directo al dueño vía Nequi</text>

  <!-- Right Steps -->
  <rect x="500" y="375" width="490" height="470" rx="12" fill="#073828" fill-opacity="0.85" stroke="#D9F2A5" stroke-opacity="0.25" stroke-width="1.5"/>

  <text x="530" y="420" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="28" fill="#FFD25A">1. SELECCIONA TU FRANJA</text>
  <text x="530" y="452" font-family="'Outfit', sans-serif" font-weight="400" font-size="17" fill="#C8E6D4">
    <tspan x="530" dy="0">Elige la hora y el sistema calcula la tarifa</tspan>
    <tspan x="530" dy="24">exacta según el deporte y horario.</tspan>
  </text>

  <text x="530" y="530" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="28" fill="#FFD25A">2. TRANSFIERE EL ANTICIPO</text>
  <text x="530" y="562" font-family="'Outfit', sans-serif" font-weight="400" font-size="17" fill="#C8E6D4">
    <tspan x="530" dy="0">Envía el abono a la cuenta de la cancha</tspan>
    <tspan x="530" dy="24">(Nequi / Bancolombia) y sube tu soporte.</tspan>
  </text>

  <text x="530" y="640" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="28" fill="#FFD25A">3. EL DUEÑO VALIDA Y JUEGAS</text>
  <text x="530" y="672" font-family="'Outfit', sans-serif" font-weight="400" font-size="17" fill="#C8E6D4">
    <tspan x="530" dy="0">El dueño aprueba el comprobante y el</tspan>
    <tspan x="530" dy="24">horario queda protegido en el radar.</tspan>
  </text>

  <rect x="530" y="750" width="430" height="60" rx="10" fill="#0A4F38" stroke="#D9F2A5" stroke-opacity="0.4" stroke-width="1.5"/>
  <text x="745" y="787" font-family="'IBM Plex Mono', monospace" font-size="16" font-weight="600" fill="#FFD25A" text-anchor="middle" letter-spacing="1">CERO COMISIÓN BANCARIA BAFUT</text>

  <!-- Bottom CTA -->
  <rect x="60" y="915" width="960" height="76" rx="14" fill="#FFD25A"/>
  <text x="540" y="963" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="30" fill="#073828" text-anchor="middle" letter-spacing="1">BUSCAR CANCHAS DISPONIBLES → bafut.macuttech.com</text>
  <text x="540" y="1030" font-family="'IBM Plex Mono', monospace" font-size="15" font-weight="600" fill="#D9F2A5" text-anchor="middle" letter-spacing="2">PAGO DIRECTO AL DUEÑO · CERO CUSTODIA · TOTAL TRANSPARENCIA</text>
</svg>`;
}

function renderProSvg4() {
  return `<?xml version="1.0" encoding="UTF-8"?>
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
  <text x="255" y="87" font-family="'IBM Plex Mono', monospace" font-size="15" font-weight="600" fill="#D9F2A5" text-anchor="middle" letter-spacing="2">TRANSPARENCIA TOTAL</text>
  <text x="1020" y="96" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="46" fill="#FFD25A" text-anchor="end">BAFUT</text>

  <!-- Hero Typography -->
  <text x="60" y="175" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="68" fill="#DFF3E6" letter-spacing="1">PUNTOS CLAROS.</text>
  <text x="60" y="235" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="52" fill="#FFD25A" letter-spacing="1">PATEADAS BLINDADAS.</text>
  <text x="60" y="285" font-family="'Outfit', sans-serif" font-size="22" font-weight="500" fill="#C8E6D4">BaFut es el radar deportivo de Barranquilla: qué sí hacemos y qué dejamos en tus manos.</text>

  <!-- Card Scoreboard -->
  <rect x="60" y="345" width="960" height="530" rx="20" fill="#0A4F38" fill-opacity="0.9" stroke="#D9F2A5" stroke-opacity="0.35" stroke-width="2"/>

  <!-- Left Column (PROS) -->
  <rect x="90" y="375" width="435" height="470" rx="12" fill="#0C6B4C" fill-opacity="0.95" stroke="#D9F2A5" stroke-opacity="0.4" stroke-width="2"/>
  <rect x="115" y="400" width="200" height="36" rx="6" fill="#D9F2A5"/>
  <text x="215" y="425" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="20" fill="#073828" text-anchor="middle" letter-spacing="1">LO QUE SÍ TIENES</text>

  <text x="115" y="485" font-family="'Outfit', sans-serif" font-weight="500" font-size="18" fill="#DFF3E6">01 · Radar en vivo de huecos en la ciudad</text>
  <text x="115" y="555" font-family="'Outfit', sans-serif" font-weight="500" font-size="18" fill="#DFF3E6">02 · Pizarrón táctico para armar nóminas</text>
  <text x="115" y="625" font-family="'Outfit', sans-serif" font-weight="500" font-size="18" fill="#DFF3E6">03 · 0% comisión sobre partidos y huecos</text>
  <text x="115" y="695" font-family="'Outfit', sans-serif" font-weight="500" font-size="18" fill="#DFF3E6">04 · Web App rápida sin descargas pesadas</text>
  <text x="115" y="765" font-family="'Outfit', sans-serif" font-weight="500" font-size="18" fill="#DFF3E6">05 · Directorio multideporte (Fútbol, Pádel...)</text>

  <!-- Right Column (LÍMITES) -->
  <rect x="555" y="375" width="435" height="470" rx="12" fill="#073828" fill-opacity="0.95" stroke="#FFD25A" stroke-opacity="0.35" stroke-width="2"/>
  <rect x="580" y="400" width="200" height="36" rx="6" fill="#FFD25A"/>
  <text x="680" y="425" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="20" fill="#073828" text-anchor="middle" letter-spacing="1">LO QUE NO ES</text>

  <text x="580" y="485" font-family="'Outfit', sans-serif" font-weight="400" font-size="18" fill="#C8E6D4">01 · No es chat in-app (se apoya en WhatsApp)</text>
  <text x="580" y="555" font-family="'Outfit', sans-serif" font-weight="400" font-size="18" fill="#C8E6D4">02 · No custodiamos dinero (pagas al dueño/host)</text>
  <text x="580" y="625" font-family="'Outfit', sans-serif" font-weight="400" font-size="18" fill="#C8E6D4">03 · Reservas sujetas a confirmación de la sede</text>
  <text x="580" y="695" font-family="'Outfit', sans-serif" font-weight="400" font-size="18" fill="#C8E6D4">04 · Enfocado 100% en Barranquilla (por ahora)</text>
  <text x="580" y="765" font-family="'Outfit', sans-serif" font-weight="400" font-size="18" fill="#C8E6D4">05 · El compromiso de jugar depende del equipo</text>

  <!-- Bottom CTA -->
  <rect x="60" y="915" width="960" height="76" rx="14" fill="#FFD25A"/>
  <text x="540" y="963" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="30" fill="#073828" text-anchor="middle" letter-spacing="1">ÚNETE AL RADAR DE BARRANQUILLA → bafut.macuttech.com</text>
  <text x="540" y="1030" font-family="'IBM Plex Mono', monospace" font-size="15" font-weight="600" fill="#D9F2A5" text-anchor="middle" letter-spacing="2">HECHO EN BARRANQUILLA · COMUNIDAD DEPORTIVA REAL</text>
</svg>`;
}

async function renderAll() {
  const svgs = [
    { num: 1, svg: renderProSvg1() },
    { num: 2, svg: renderProSvg2() },
    { num: 3, svg: renderProSvg3() },
    { num: 4, svg: renderProSvg4() }
  ];

  for (const item of svgs) {
    const svgPath = path.join(outputDir, `flyer-pro-${item.num}.svg`);
    const pngPath = path.join(outputDir, `flyer-pro-${item.num}.png`);
    const brainPngPath = path.join(brainDir, `flyer-pro-${item.num}.png`);

    fs.writeFileSync(svgPath, item.svg, 'utf-8');
    await sharp(Buffer.from(item.svg)).png().toFile(pngPath);
    fs.copyFileSync(pngPath, brainPngPath);
    console.log(`Rendered clean pro flyer: flyer-pro-${item.num}.png`);
  }
}

renderAll().catch(console.error);
