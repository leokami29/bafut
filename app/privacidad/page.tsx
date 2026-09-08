import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocShell } from "@/components/LegalDocShell";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_TERMS_PATH,
  PRIVACY_DESCRIPTION,
  PRIVACY_TITLE,
} from "@/lib/legal";
import {
  absoluteUrl,
  defaultOg,
  defaultTwitter,
} from "@/lib/seo";

const pageUrl = absoluteUrl("/privacidad");

export const metadata: Metadata = {
  title: PRIVACY_TITLE,
  description: PRIVACY_DESCRIPTION,
  alternates: { canonical: pageUrl },
  openGraph: defaultOg({
    title: PRIVACY_TITLE,
    description: PRIVACY_DESCRIPTION,
    url: pageUrl,
  }),
  twitter: defaultTwitter({
    title: PRIVACY_TITLE,
    description: PRIVACY_DESCRIPTION,
  }),
};

export default function PrivacidadPage() {
  return (
    <LegalDocShell
      eyebrow="BaFut · Legal"
      title="Política de privacidad"
      updated="7 de septiembre de 2026"
      sibling="terminos"
    >
      <p>
        Esta política explica cómo BaFut (operado por Macuttech) trata datos personales de
        usuarios en Colombia, de conformidad con la{" "}
        <strong>Ley 1581 de 2012</strong>, el Decreto 1377 de 2013 y normas que las
        modifiquen o complementen (habeas data). Completa los{" "}
        <Link href={LEGAL_TERMS_PATH}>términos de uso</Link>.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        Responsable: <strong>Macuttech</strong>, operador de BaFut. Canal de habeas data y
        dueños de cancha:{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li>
          <strong>Cuenta y perfil:</strong> correo, nombre para mostrar, ciudad, nivel
          declarado, preferencias básicas.
        </li>
        <li>
          <strong>Uso del producto:</strong> partidos publicados, pedidos de cupo,
          pedidos de turno (franja, deporte, estado), confirmaciones, mensajes técnicos de
          la app.
        </li>
        <li>
          <strong>Reclamo de canchas:</strong> WhatsApp, correo (si lo indicás), nota de
          verificación y resultado de la moderación (pendiente, aprobado, rechazado).
        </li>
        <li>
          <strong>Panel de cancha:</strong> datos de contacto y ficha que el dueño edita
          (teléfono, web, fotos, etc.), incluido si acepta pedidos de turno.
        </li>
        <li>
          <strong>Comprobantes de turno:</strong> imagen o PDF que subís al pedir un
          turno, WhatsApp de contacto del pedido y decisión del dueño (aprobar /
          rechazar). Esos archivos no se publican en el directorio; solo el jugador del
          pedido, el dueño de la cancha y operadores autorizados pueden acceder vía
          controles de la app (p. ej. URL firmada).
        </li>
        <li>
          <strong>Solicitud premium / comprobantes:</strong> plan solicitado, referencia de
          pago, imagen o archivo del comprobante y decisión administrativa. Los
          comprobantes no se publican en el directorio; se usan para validar el pago.
        </li>
        <li>
          <strong>Técnicos:</strong> registros de seguridad, cookies o almacenamiento local
          necesarios (sesión, ciudad activa, preferencias), y analítica agregada si está
          configurada (p. ej. eventos de embudo sin vender datos a terceros con fines
          ajenos al producto).
        </li>
      </ul>
      <p>
        No pedimos documentos de identidad como requisito ordinario del producto. Si en un
        caso de disputa de ownership pedimos prueba adicional, te lo pediremos de forma
        explícita y limitada a esa verificación.
      </p>

      <h2>3. Finalidades</h2>
      <ul>
        <li>Prestar y mejorar el servicio de partidos, cupos, turnos y directorio de canchas.</li>
        <li>
          Autenticar usuarios, prevenir abuso, fraude en reclamos y uso indebido de
          comprobantes (premium o turnos).
        </li>
        <li>
          Verificar titularidad o autorización sobre una ficha de cancha y gestionar el
          panel del dueño.
        </li>
        <li>
          Facilitar que el dueño revise pedidos de turno y comprobantes asociados (BaFut no
          custodia el pago del alquiler).
        </li>
        <li>
          Revisar solicitudes de planes de cancha (verificada / premium) y emitir o
          asociar comprobantes/facturas internas cuando corresponda.
        </li>
        <li>
          Contactarte por los canales que nos diste (correo, WhatsApp) sobre el estado de
          reclamos, turnos, suscripciones o soporte.
        </li>
        <li>Cumplir obligaciones legales y atender requerimientos de autoridad.</li>
      </ul>

      <h2>4. Base del tratamiento y autorización</h2>
      <p>
        Tratamos datos con base en la ejecución del servicio que solicitás, el
        consentimiento cuando marcás la aceptación en formularios (reclamar cancha,
        solicitud premium, pedir turno u otros), el interés legítimo de seguridad/moderación y las
        obligaciones legales. Podés negar o retirar el consentimiento cuando la ley lo
        permita; en ese caso es posible que no podamos completar el reclamo, el turno o la
        solicitud premium.
      </p>

      <h2>5. Encargados y transferencias</h2>
      <p>
        Usamos proveedores de infraestructura (p. ej. alojamiento, base de datos y
        autenticación tipo Supabase) que actúan como encargados del tratamiento bajo
        instrucciones contractuales. Pueden operar fuera de Colombia; en ese caso
        aplicamos las salvaguardas razonables disponibles. No vendemos bases de datos de
        usuarios.
      </p>

      <h2>6. Conservación</h2>
      <p>
        Conservamos los datos mientras la cuenta esté activa y el tiempo adicional
        necesario para reclamos, auditoría de pagos/comprobantes (premium y turnos), defensa
        legal y retención mínima exigida por ley. Los comprobantes se retienen el plazo
        razonable para conciliación y prevención de fraude; después pueden eliminarse o
        anonimizarse. Si una cancha se retira del directorio activo, los historiales
        vinculados pueden conservarse según esa política de retención.
      </p>

      <h2>7. Derechos de los titulares (habeas data)</h2>
      <p>
        Como titular tenés derecho a conocer, actualizar, rectificar y suprimir tus datos;
        a solicitar prueba de la autorización; a revocarla cuando proceda; y a presentar
        quejas ante la Superintendencia de Industria y Comercio. Para ejercerlos, escribinos
        a <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> desde el
        correo de tu cuenta, indicando el derecho que ejercés y un medio de contacto. Te
        responderemos en los plazos de la ley.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables (control de acceso, HTTPS,
        políticas en base de datos). Ningún sistema es 100&nbsp;% seguro: si detectás un
        incidente que afecte tus datos, avisanos de inmediato al mismo correo.
      </p>

      <h2>9. Menores</h2>
      <p>
        BaFut está pensado para mayores de edad. Si un menor registra datos sin
        autorización, contactanos para eliminarlos.
      </p>

      <h2>10. Cambios</h2>
      <p>
        Podemos actualizar esta política. La fecha de “última actualización” indica la
        versión vigente. Si el cambio es sustancial, lo reflejaremos en esta página y, cuando
        corresponda, pediremos una nueva aceptación en los flujos afectados.
      </p>
    </LegalDocShell>
  );
}
