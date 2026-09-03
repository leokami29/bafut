import type { Metadata } from "next";
import Link from "next/link";
import { getActiveCity, getUpcomingMatches, getVenuesByCity } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { aggregateVenueDemand, venuesWithDemandCount } from "@/lib/venue-demand";
import { whatsappChatHref } from "@/lib/whatsapp-contact";

export const metadata: Metadata = {
  title: "Dueños de cancha",
  description:
    "BaFut concentra la demanda de pateadas en tu cancha. Sin comisión de alquiler ni reserva por nosotros.",
};

function ownerWhatsappHref() {
  const raw = process.env.NEXT_PUBLIC_VENUE_OWNER_WHATSAPP?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return whatsappChatHref(
    digits,
    `Hola, soy dueño / encargado de una cancha. Quiero ver cómo aparece en BaFut: ${siteUrl().replace(/\/$/, "")}/duenos`,
  );
}

function ownerEmailHref() {
  const email = process.env.NEXT_PUBLIC_VENUE_OWNER_EMAIL?.trim();
  if (!email) return null;
  const subject = encodeURIComponent("Dueño de cancha — BaFut");
  const body = encodeURIComponent(
    "Hola,\n\nSoy el dueño / encargado de una cancha y quiero destacar o actualizar la ficha en BaFut.\n\nNombre de la cancha:\nCiudad / barrio:\n",
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export default async function DuenosPage() {
  const city = await getActiveCity();
  const cityName = city?.name ?? "Barranquilla";
  const [venues, matches] = city
    ? await Promise.all([getVenuesByCity(city.id), getUpcomingMatches(city.id)])
    : [[], []];
  const demandCount = city
    ? venuesWithDemandCount(aggregateVenueDemand(matches, city.timezone))
    : 0;
  const wa = ownerWhatsappHref();
  const mail = ownerEmailHref();

  return (
    <main className="page page-narrow page-duenos" id="main">
      <header className="page-head">
        <p className="eyebrow">Para dueños</p>
        <h1>Tu cancha, sin intermediario de alquiler</h1>
        <p className="lede">
          BaFut no reserva horarios ni cobra comisión por la hora. Cuando un grupo publica un hueco
          en tu predio, la demanda queda visible en tu ficha — para jugadores que buscan dónde
          entrar y para vos que querés llenar franjas muertas.
        </p>
      </header>

      <section className="duenos-pitch" aria-labelledby="duenos-why">
        <h2 id="duenos-why" className="subhead">
          Por qué aparece tu cancha
        </h2>
        <ol className="duenos-points">
          <li>
            <strong>Demanda real</strong>
            <span>Los huecos se publican con hora y posición. No es un anuncio vacío.</span>
          </li>
          <li>
            <strong>WhatsApp sigue siendo tuyo</strong>
            <span>El contacto del partido lo cierran host y jugador. Nosotros no intermediamos el cobro.</span>
          </li>
          <li>
            <strong>Ficha compartible</strong>
            <span>
              {venues.length > 0
                ? `${venues.length} canchas listadas en ${cityName}${demandCount > 0 ? ` · ${demandCount} con huecos abiertos ahora` : ""}.`
                : `Listamos canchas en ${cityName} y las enlazamos a las pateadas.`}
            </span>
          </li>
        </ol>
      </section>

      <section className="duenos-cta" aria-labelledby="duenos-cta-title">
        <h2 id="duenos-cta-title" className="subhead">
          Destacá o actualizá tu ficha
        </h2>
        <p>
          Escribinos con el nombre de la cancha. Revisamos datos, fotos y cómo se ve la demanda
          cuando se arman partidos ahí.
        </p>
        {wa || mail ? (
          <div className="duenos-actions">
            {wa ? (
              <a className="btn-flood" href={wa} target="_blank" rel="noopener noreferrer">
                Escribir por WhatsApp
              </a>
            ) : null}
            {mail ? (
              <a className="btn-ghost" href={mail}>
                Escribir por correo
              </a>
            ) : null}
          </div>
        ) : (
          <p className="empty">
            Mientras configuramos el contacto directo, revisá el{" "}
            <Link href="/canchas">directorio de canchas</Link> o{" "}
            <Link href="/apoyar">apoyá BaFut</Link>.
          </p>
        )}
      </section>

      <p className="foot-link">
        <Link href="/canchas">Ver canchas en {cityName}</Link>
        {" · "}
        <Link href="/">Volver al inicio</Link>
      </p>
    </main>
  );
}
