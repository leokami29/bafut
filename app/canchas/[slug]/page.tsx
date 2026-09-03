import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CopyAddressButton, VenueStickyCta } from "@/components/VenueDetailActions";
import { MatchRow } from "@/components/MatchRow";
import { VenueMapLazy } from "@/components/VenueMapLazy";
import { getActiveCity, getUpcomingMatches, getVenueBySlug } from "@/lib/data";
import { sportLabel, surfaceLabel, venueKindLabel } from "@/lib/labels";
import type { Sport } from "@/lib/constants";
import {
  enrichmentToMeta,
  getVenueEnrichment,
  mergeVenueMeta,
} from "@/lib/venue-enrichment";
import {
  formatHoursLines,
  mapsDirectionsUrl,
  phoneHref,
  resolveVenuePublicMeta,
} from "@/lib/venue-meta";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const city = await getActiveCity();
  const venue = city ? await getVenueBySlug(city.id, slug) : null;
  if (!venue) {
    return { title: "Cancha" };
  }
  const meta = mergeVenueMeta(
    resolveVenuePublicMeta(venue),
    enrichmentToMeta(getVenueEnrichment(slug)),
  );
  const place = venue.neighborhood ? `${venue.neighborhood}, ${city?.name}` : city?.name;
  return {
    title: venue.name,
    description: meta.description ?? `Cancha en ${place}. Publicá tu hueco en BaFut.`,
  };
}

function InfoRow({
  label,
  value,
  empty = "Sin dato registrado",
}: {
  label: string;
  value: ReactNode;
  empty?: string;
}) {
  const missing = value == null || value === false || value === "";
  return (
    <div className="venue-info-row">
      <dt>{label}</dt>
      <dd>{missing ? <span className="venue-info-empty">{empty}</span> : value}</dd>
    </div>
  );
}

export default async function CanchaPage({ params }: Props) {
  const { slug } = await params;
  const city = await getActiveCity();
  if (!city) {
    notFound();
  }
  const [venue, matches] = await Promise.all([
    getVenueBySlug(city.id, slug),
    getUpcomingMatches(city.id),
  ]);
  if (!venue) {
    notFound();
  }

  const meta = mergeVenueMeta(
    resolveVenuePublicMeta(venue),
    enrichmentToMeta(getVenueEnrichment(slug)),
  );
  const here = matches.filter((match) => match.venue_id === venue.id);
  const publishHref = `/partidos/nuevo?venue=${venue.slug}`;
  const directionsHref = mapsDirectionsUrl(
    venue.lat,
    venue.lng,
    venue.address ? `${venue.name}, ${venue.address}` : venue.name,
  );
  const kind = venueKindLabel[venue.venue_kind] ?? venue.venue_kind;
  const surface = surfaceLabel[venue.surface] ?? venue.surface;
  const phoneLink = meta.phone ? phoneHref(meta.phone) : undefined;
  const description = meta.description;
  const descriptionLong = description != null && description.length > 180;
  const hoursLines = formatHoursLines(meta.hours);
  const photos = meta.images.slice(0, 4);
  const reviews = meta.reviews.slice(0, 8);

  return (
    <main className="page page-venue-detail" id="main">
      <p className="venue-back">
        <Link href="/canchas">← Directorio de canchas</Link>
      </p>

      <header className="venue-hero">
        <div className="venue-hero-top">
          <p className="eyebrow">{city.name}</p>
          {meta.rating != null ? (
            <span className="venue-rating" aria-label={`Calificación ${meta.rating} de 5`}>
              ★ {meta.rating.toFixed(1)}
              {meta.reviewCount != null ? (
                <span className="venue-rating-count">({meta.reviewCount})</span>
              ) : null}
            </span>
          ) : null}
        </div>
        <h1>{venue.name}</h1>
        <div className="venue-badges" aria-label="Características de la cancha">
          {venue.neighborhood ? <span className="venue-badge is-neighborhood">{venue.neighborhood}</span> : null}
          <span className="venue-badge">{kind}</span>
          {venue.covered != null ? (
            <span className="venue-badge">{venue.covered ? "Techada" : "Descubierta"}</span>
          ) : null}
          {venue.sports?.map((sport) => (
            <span key={sport} className="venue-badge is-sport">
              {sportLabel[sport as Sport] ?? sport}
            </span>
          ))}
        </div>
      </header>

      <div className="venue-detail-layout">
        <div className="venue-detail-primary">
          <div className="venue-detail-actions venue-detail-actions-primary">
            <Link className="btn-flood" href={publishHref}>
              Publicar hueco aquí
            </Link>
            <a className="btn-ghost" href={directionsHref} target="_blank" rel="noopener noreferrer">
              Cómo llegar
            </a>
            {venue.address ? <CopyAddressButton address={venue.address} /> : null}
          </div>

          <section className="venue-info" aria-labelledby="venue-info-heading">
            <h2 className="subhead" id="venue-info-heading">
              Información
            </h2>
            <dl className="venue-info-grid">
              <InfoRow
                label="Dirección"
                value={
                  venue.address ? (
                    <a href={directionsHref} target="_blank" rel="noopener noreferrer">
                      {venue.address}
                    </a>
                  ) : null
                }
                empty="Sin dirección registrada"
              />
              <InfoRow label="Barrio" value={venue.neighborhood} empty="Sin barrio registrado" />
              <InfoRow
                label="Teléfono"
                value={
                  meta.phone && phoneLink ? (
                    <a href={phoneLink}>{meta.phone}</a>
                  ) : meta.phone ? (
                    meta.phone
                  ) : null
                }
                empty="Sin teléfono registrado"
              />
              <InfoRow
                label="Sitio web"
                value={
                  meta.website ? (
                    <a href={meta.website} target="_blank" rel="noopener noreferrer">
                      {meta.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  ) : null
                }
                empty="Sin sitio web registrado"
              />
              <InfoRow label="Superficie" value={surface} />
              {hoursLines.length > 0 ? (
                <InfoRow
                  label="Horario"
                  value={
                    <ul className="venue-hours-list">
                      {hoursLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  }
                />
              ) : null}
            </dl>
          </section>
        </div>

        <section className="venue-map-section" aria-labelledby="venue-map-heading">
          <h2 className="subhead" id="venue-map-heading">
            Ubicación
          </h2>
          <div className="venue-map-wrap venue-map-detail">
            <VenueMapLazy
              venues={[venue]}
              center={{ lat: venue.lat, lng: venue.lng }}
              focusId={venue.id}
            />
          </div>
          <p className="venue-map-foot">
            <a href={directionsHref} target="_blank" rel="noopener noreferrer">
              Abrir en Google Maps
            </a>
          </p>
        </section>
      </div>

      {description ? (
        <section className="venue-notes-section" aria-labelledby="venue-notes-heading">
          <h2 className="subhead" id="venue-notes-heading">
            Sobre esta cancha
          </h2>
          {descriptionLong ? (
            <details className="venue-notes">
              <summary>
                <span className="venue-notes-preview">{description.slice(0, 177)}…</span>
                <span className="venue-notes-toggle">Ver más</span>
              </summary>
              <p>{description}</p>
            </details>
          ) : (
            <p className="notes">{description}</p>
          )}
        </section>
      ) : null}

      {photos.length > 0 ? (
        <section className="venue-photos-section" aria-labelledby="venue-photos-heading">
          <h2 className="subhead" id="venue-photos-heading">
            Fotos
          </h2>
          <ul className="venue-photo-grid">
            {photos.map((src) => (
              <li key={src}>
                {/* Google Maps CDN; plain img avoids next/image remote config */}
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="venue-photo"
                />
              </li>
            ))}
          </ul>
          {meta.source === "google" ? (
            <p className="venue-section-meta">Fotos desde Google Maps</p>
          ) : null}
        </section>
      ) : null}

      {reviews.length > 0 ? (
        <section className="venue-reviews-section" aria-labelledby="venue-reviews-heading">
          <div className="venue-section-head">
            <h2 className="subhead" id="venue-reviews-heading">
              Comentarios de Google
            </h2>
            <p className="venue-section-meta">
              {meta.reviewCount != null
                ? `${reviews.length} de ${meta.reviewCount} reseñas`
                : `${reviews.length} reseñas recientes`}
            </p>
          </div>
          <ul className="venue-review-list">
            {reviews.map((review, index) => (
              <li
                key={`${review.author ?? "anon"}-${review.date ?? index}-${index}`}
                className="venue-review"
              >
                <div className="venue-review-head">
                  <strong className="venue-review-author">
                    {review.author?.trim() || "Usuario de Google"}
                  </strong>
                  {review.rating != null ? (
                    <span className="venue-review-stars" aria-label={`${review.rating} de 5`}>
                      ★ {Number(review.rating).toFixed(0)}
                    </span>
                  ) : null}
                  {review.date ? <span className="venue-review-date">{review.date}</span> : null}
                </div>
                {review.text ? <p className="venue-review-text">{review.text}</p> : null}
                {review.ownerResponse ? (
                  <p className="venue-review-owner">
                    <span className="venue-review-owner-label">Respuesta del dueño:</span>{" "}
                    {review.ownerResponse}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="venue-matches" aria-labelledby="venue-matches-heading">
        <div className="venue-section-head">
          <h2 className="subhead" id="venue-matches-heading">
            Partidos próximos
          </h2>
          {here.length > 0 ? (
            <p className="venue-section-meta">
              {here.length} {here.length === 1 ? "partido" : "partidos"} en esta cancha
            </p>
          ) : null}
        </div>
        {here.length > 0 ? (
          <div className="roster">
            {here.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="empty venue-empty-matches">
            <p>Nadie ha publicado un hueco en esta cancha todavía.</p>
            <Link className="btn-flood" href={publishHref}>
              Sé el primero — publicar hueco
            </Link>
          </div>
        )}
      </section>

      <p className="foot-link">
        <Link href="/canchas">Ver todas las canchas</Link>
        {" · "}
        <Link href="/partidos">Partidos abiertos</Link>
      </p>

      <VenueStickyCta href={publishHref} label="Publicar hueco aquí" />
    </main>
  );
}
