import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocShell } from "@/components/LegalDocShell";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_PRIVACY_PATH,
  TERMS_DESCRIPTION,
  TERMS_TITLE,
} from "@/lib/legal";
import {
  absoluteUrl,
  defaultOg,
  defaultTwitter,
} from "@/lib/seo";

const pageUrl = absoluteUrl("/terminos");

export const metadata: Metadata = {
  title: TERMS_TITLE,
  description: TERMS_DESCRIPTION,
  alternates: { canonical: pageUrl },
  openGraph: defaultOg({
    title: TERMS_TITLE,
    description: TERMS_DESCRIPTION,
    url: pageUrl,
  }),
  twitter: defaultTwitter({
    title: TERMS_TITLE,
    description: TERMS_DESCRIPTION,
  }),
};

export default function TerminosPage() {
  return (
    <LegalDocShell
      eyebrow="BaFut · Legal"
      title="Términos de uso"
      updated="6 de septiembre de 2026"
      sibling="privacidad"
    >
      <p>
        Estos términos regulan el uso de BaFut (el sitio y la aplicación web operados por
        Macuttech). Al crear una cuenta, publicar un partido, pedir un cupo, reclamar una
        cancha o solicitar un plan premium, aceptás estas condiciones.
      </p>

      <h2>1. Qué es BaFut (y qué no es)</h2>
      <p>
        BaFut es un radar de huecos y pateadas abiertas: conecta organizadores (hosts) con
        jugadores que buscan cupo en canchas sintéticas y multideporte. Publicás un partido,
        compartís el enlace y alguien pide el cupo; el host confirma.
      </p>
      <p>
        BaFut <strong>no</strong> reserva canchas, <strong>no</strong> cobra el partido entre
        jugadores, <strong>no</strong> intermedia pagos del alquiler ni sustituye WhatsApp u
        otros chats del grupo. Cualquier acuerdo de plata, hora o cancha entre personas es
        responsabilidad de quienes participan.
      </p>

      <h2>2. Cuentas y conducta</h2>
      <p>
        Debés usar datos veraces al registrarte y en tu perfil. Está prohibido suplantar
        identidad, acosar, spam, publicar contenido ilícito o usar la plataforma para engañar
        a otros usuarios o a dueños de canchas. Podemos suspender o cerrar cuentas que
        incumplan estas reglas o la ley aplicable en Colombia.
      </p>

      <h2>3. Partidos y pedidos de cupo</h2>
      <p>
        El host es responsable de la información del partido (cancha, hora, cupos, nivel) y
        de confirmar o rechazar pedidos. BaFut no garantiza que un cupo se complete ni que el
        partido se juegue. Cancelaciones, no-shows y disputas entre jugadores se resuelven
        entre las partes.
      </p>

      <h2>4. Directorio y reclamo de canchas (ownership)</h2>
      <p>
        El directorio de canchas puede incluir fichas curadas o aportadas por la comunidad.
        <strong> Reclamar una cancha</strong> significa solicitar que BaFut te asigne como
        responsable de esa ficha (contacto, edición limitada y, si aplica, sello de
        verificada), no la transferencia de la propiedad inmobiliaria ni del negocio.
      </p>
      <ul>
        <li>
          Solo debés reclamar una cancha si sos el dueño, administrador o persona autorizada
          para representarla.
        </li>
        <li>
          Un editor de BaFut puede pedir pruebas razonables (datos de contacto, nota de
          verificación, etc.) y aprobar o rechazar el reclamo.
        </li>
        <li>
          Si la ficha ya tiene dueño o hay un reclamo en revisión, no podés enviar otro por
          el mismo flujo; contactá{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> si creés que hay
          un error.
        </li>
        <li>
          Declaraciones falsas sobre la titularidad pueden implicar rechazo del reclamo,
          pérdida del panel y, si corresponde, medidas legales.
        </li>
      </ul>

      <h2>5. Planes verificada / premium y comprobantes</h2>
      <p>
        BaFut puede ofrecer beneficios B2B para canchas (por ejemplo, verificación o
        destacada premium). Cuando exista solicitud de pago manual:
      </p>
      <ul>
        <li>
          El pago se hace por los medios que indiquemos (p. ej. Nequi o transferencia). BaFut
          no actúa como pasarela de cobro automatizada salvo que se indique lo contrario.
        </li>
        <li>
          Podés subir un <strong>comprobante</strong> (imagen o archivo) para que un
          administrador revise la solicitud. Ese archivo se usa solo para validar el pago y
          activar o rechazar la suscripción.
        </li>
        <li>
          La activación no es inmediata: queda sujeta a revisión humana. Un rechazo puede
          incluir un motivo; los reembolsos, si aplican, se coordinan por el canal de
          contacto indicado.
        </li>
        <li>
          Un comprobante falso o alterado es causa de rechazo y de posibles restricciones de
          cuenta.
        </li>
      </ul>

      <h2>6. Contenido y propiedad intelectual</h2>
      <p>
        Conservás los derechos sobre el contenido que publicás. Nos otorgás una licencia no
        exclusiva para alojarlo, mostrarlo y operarlo en BaFut. La marca BaFut, el diseño y
        el software pertenecen a Macuttech o a sus licenciantes. El código abierto del
        proyecto, cuando esté publicado, se rige por su licencia (p. ej. MIT).
      </p>

      <h2>7. Disponibilidad y limitación de responsabilidad</h2>
      <p>
        Prestamos el servicio “tal cual”, con esfuerzo razonable de disponibilidad. No
        respondemos por daños indirectos, lucro cesante ni por acuerdos entre usuarios o
        entre usuarios y canchas. En la máxima medida permitida por la ley colombiana,
        nuestra responsabilidad agregada se limita a lo efectivamente pagado a BaFut por el
        servicio premium en los tres meses anteriores al reclamo, o a cero si no hubo pago.
      </p>

      <h2>8. Privacidad</h2>
      <p>
        El tratamiento de datos personales se describe en la{" "}
        <Link href={LEGAL_PRIVACY_PATH}>política de privacidad</Link> (Ley 1581 de 2012 y
        normas concordantes).
      </p>

      <h2>9. Cambios</h2>
      <p>
        Podemos actualizar estos términos. La fecha de “última actualización” indica la
        versión vigente. El uso continuado del servicio después de un cambio relevante
        implica aceptación de la nueva versión, salvo que la ley exija un consentimiento
        distinto.
      </p>

      <h2>10. Contacto</h2>
      <p>
        Consultas legales o de dueños de cancha:{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. Operador: Macuttech
        · Colombia.
      </p>
    </LegalDocShell>
  );
}
