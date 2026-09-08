import type { Metadata } from "next";
import Link from "next/link";
import { SportChalkLines } from "@/components/SportChalkLines";
import { getActiveCity, getUpcomingMatches, getVenuesByCity } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";
import { openSlotCount } from "@/lib/types";
import { whatsappChatHref } from "@/lib/whatsapp-contact";

export const metadata: Metadata = {
  title: "Para dueños de cancha",
  description:
    "Reclamá la ficha de tu cancha en BaFut: contacto oficial, sello de verificada y cero comisión. BaFut junta los jugadores; el negocio es tuyo.",
  alternates: { canonical: absoluteUrl("/canchas/registro") },
};

function ownerWhatsappHref(): string | null {
  const raw = process.env.NEXT_PUBLIC_VENUE_OWNER_WHATSAPP?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return whatsappChatHref(
    digits,
    "Hola, soy dueño/a de una cancha y quiero reclamar la ficha en BaFut.",
  );
}

function ownerEmailHref(): string | null {
  const email = process.env.NEXT_PUBLIC_VENUE_OWNER_EMAIL?.trim();
  if (!email) return null;
  const subject = encodeURIComponent("Quiero reclamar mi cancha en BaFut");
  const body = encodeURIComponent(
    "Hola,\n\nSoy el dueño/a o encargado/a de una cancha.\nNombre de la cancha: \nBarrio: \nMi WhatsApp: \n\nQuiero reclamar la ficha en BaFut.\n",
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export default async function VenueRegisterPage() {
  const city = await getActiveCity();

  if (!city) {
    return (
      <main className="page page-narrow" id="main">
        <header className="page-head">
          <h1>No hay ciudad activa</h1>
          <p>Seleccioná una ciudad para continuar.</p>
        </header>
      </main>
    );
  }

  const [venues, matches] = await Promise.all([
    getVenuesByCity(city.id),
    getUpcomingMatches(city.id),
  ]);

  const venuesWithHoles = new Set(matches.map((match) => match.venue_id)).size;
  const openSlots = matches.reduce((sum, match) => sum + openSlotCount(match), 0);
  const waHref = ownerWhatsappHref();
  const mailHref = ownerEmailHref();

  return (
    <main className="page-venue-register" id="main">
      {/* ——— Hero: cancha de noche bajo el reflector ——— */}
      <section className="vr-hero" aria-label="BaFut para dueños de cancha">
        <SportChalkLines />

        <div className="vr-hero-inner">
          <p className="vr-meta">
            <span className="vr-meta-city">{city.name}</span>
            <span aria-hidden="true">/</span>
            <span>Para dueños de cancha</span>
          </p>
          <h1 className="vr-title">
            Tu cancha ya está en el radar.
            <br />
            <span className="vr-accent">Que se note quién la cuida.</span>
          </h1>
          <p className="vr-lede">
            Los que arman la pateada buscan por barrio y deporte, no por nombre de cancha.
            Reclamá tu ficha: el contacto pasa a ser el tuyo y la cancha luce el sello de
            verificada. Sin comisión y sin reservas — el arriendo se arregla como siempre,
            con vos.
          </p>
          <div className="vr-ctas">
            <Link href="/canchas" className="btn-flood">
              Buscar mi cancha
            </Link>
            <a href="#como-funciona" className="btn-ghost">
              Cómo se reclama
            </a>
          </div>

          <ul className="vr-stats" aria-label="Actividad actual en BaFut">
            <li>
              <strong>{venues.length}</strong> canchas en el radar
            </li>
            <li>
              <strong>{venuesWithHoles}</strong> con huecos abiertos
            </li>
            <li>
              <strong>{openSlots}</strong> cupos buscando jugador
            </li>
          </ul>
        </div>
      </section>

      {/* ——— Alineación: qué ganás, como formación de equipo ——— */}
      <section className="vr-lineup" aria-labelledby="vr-lineup-heading">
        <div className="vr-section">
          <h2 className="vr-section-head" id="vr-lineup-heading">
            La formación de una cancha reclamada
          </h2>
          <p className="vr-section-lede">
            Cuatro titulares. Ninguna letra chica.
          </p>
          <ol className="lineup-list">
            <li className="lineup-row">
              <span className="lineup-num" aria-hidden="true">
                10
              </span>
              <div className="lineup-body">
                <h3>Te encuentran buscado</h3>
                <p>
                  El radar filtra por barrio, deporte y tipo de cancha. Tu ficha entra en
                  esa búsqueda desde el primer día, con foto, mapa y canchas vecinas.
                </p>
              </div>
            </li>
            <li className="lineup-row">
              <span className="lineup-num" aria-hidden="true">
                9
              </span>
              <div className="lineup-body">
                <h3>Contacto oficial</h3>
                <p>
                  Al reclamar, el WhatsApp y el correo de la ficha quedan a tu nombre. El
                  que quiera acordar un bloque o una reserva te escribe a vos, no a un
                  número perdido en una reseña de Google.
                </p>
              </div>
            </li>
            <li className="lineup-row">
              <span className="lineup-num" aria-hidden="true">
                7
              </span>
              <div className="lineup-body">
                <h3>Cero comisión</h3>
                <p>
                  BaFut no cobra el arriendo ni cobra intermediar partidos. Junta la
                  demanda; la plata de la reserva sigue siendo tuya, en la taquilla o por
                  Nequi, como hasta hoy.
                </p>
              </div>
            </li>
            <li className="lineup-row">
              <span className="lineup-num" aria-hidden="true">
                4
              </span>
              <div className="lineup-body">
                <h3>Sello de verificada</h3>
                <p>
                  La insignia dice lo que tiene que decir: esta ficha la sostiene su
                  dueño, no un dato copiado de internet ni un grupo de curiosos.
                  Confianza a un golpe de ojo.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* ——— Pizarrón: los 3 toques ——— */}
      <section className="vr-chalkboard" id="como-funciona" aria-labelledby="vr-board-heading">
        <div className="vr-section">
          <h2 className="vr-board-heading" id="vr-board-heading">
            Tres toques y la ficha es tuya
          </h2>
          <ol className="chalk-steps">
            <li className="chalk-step">
              <span className="chalk-num">01</span>
              <div>
                <h3>Buscala en el directorio</h3>
                <p>
                  Tocá el radar de canchas: están las {venues.length} de {city.name}, con
                  buscador por nombre y barrio. Si no aparece, la agregamos gratis (abajo
                  tenés el contacto).
                </p>
              </div>
            </li>
            <li className="chalk-step">
              <span className="chalk-num">02</span>
              <div>
                <h3>Entrá y reclamá</h3>
                <p>
                  En la ficha de tu cancha vas a ver <em>“¿Sos el dueño? Reclamar
                  cancha”</em>. Entrás con Google o con correo, dejás tu WhatsApp y
                  listo. Dos minutos, sin papeleo.
                </p>
              </div>
            </li>
            <li className="chalk-step">
              <span className="chalk-num">03</span>
              <div>
                <h3>Recibís el sello</h3>
                <p>
                  Un editor de BaFut confirma el reclamo y la ficha queda verificada.
                  Desde ese momento administrás tu panel: datos, contacto y actividad
                  de la cancha.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* ——— Las preguntas que todos hacen ——— */}
      <section className="vr-faq" aria-labelledby="vr-faq-heading">
        <div className="vr-section">
          <h2 className="vr-section-head" id="vr-faq-heading">
            Lo que vas a preguntar igual
          </h2>
          <div className="vr-faq-list">
            <div className="vr-faq-item">
              <h3>¿Cuánto cuesta?</h3>
              <p>
                Nada. Reclamar, verificar y sostener la ficha es gratis. Si algún día
                hay destacado pago, se avisa antes — BaFut es open source y sin letra
                chica.
              </p>
            </div>
            <div className="vr-faq-item">
              <h3>¿BaFut me reserva la cancha?</h3>
              <p>
                No, y es a propósito: BaFut concentra los huecos y los jugadores que ya
                se están buscando. El arriendo, la hora y la plata las acordás vos con
                el grupo, por WhatsApp o en persona.
              </p>
            </div>
            <div className="vr-faq-item">
              <h3>¿Y si los datos están mal?</h3>
              <p>
                Al reclamar cargás tu contacto oficial. Lo demás — horarios, dirección,
                fotos — lo corregís vos o nos escribís, y lo arreglamos entre todos.
              </p>
            </div>
            <div className="vr-faq-item">
              <h3>¿Sirve si no tengo página web?</h3>
              <p>
                Mejor todavía. La ficha de BaFut se comparte en el grupo y sale en
                Google; es tu tarjeta de presentación sin pagar hosting ni diseñador.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ——— Cierre: banderín flood ——— */}
      <section className="vr-final" aria-label="Empezar">
        <div className="vr-section">
          <h2 className="vr-final-title">
            Faltan jugadores en las canchas.
            <br />
            Que falten en la tuya también.
          </h2>
          <div className="vr-ctas">
            <Link href="/canchas" className="btn-bib">
              Buscar mi cancha
            </Link>
            {waHref ? (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-ink">
                Escribir por WhatsApp
              </a>
            ) : null}
            {mailHref ? (
              <a href={mailHref} className="btn-outline-ink">
                Correo para reclamar
              </a>
            ) : null}
          </div>
          <p className="vr-final-note">
            ¿Tu cancha no está en las {venues.length} fichas? Escribinos y la agregamos —
            también gratis.
          </p>
        </div>
      </section>
    </main>
  );
}
