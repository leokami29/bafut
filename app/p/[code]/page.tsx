import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelMatchAction } from "@/app/actions";
import { JsonLd, matchJsonLd } from "@/components/JsonLd";
import { MatchRow } from "@/components/MatchRow";
import { HostShareBanner, ShareWhatsApp } from "@/components/ShareWhatsApp";
import { SlotList } from "@/components/SlotList";
import { VenueMapLazy } from "@/components/VenueMapLazy";
import { getHostMatchCount, getMatchByCode, getProfile, getSessionUserId, getUpcomingMatches } from "@/lib/data";
import { formatLevelOkBadge } from "@/lib/level-trust";
import { openSlotCount, slotIsOpen } from "@/lib/types";
import { formatMoney, formatWhen, openSlotsPhrase } from "@/lib/format";
import { formatLabel, genderLabel, matchStatusLabel, positionLabel, sportLabel } from "@/lib/labels";
import type { Position } from "@/lib/constants";
import { mapsDirectionsUrl } from "@/lib/venue-meta";
import {
  absoluteUrl,
  defaultOg,
  defaultTwitter,
  fullTitle,
  matchIsIndexable,
  robotsIndex,
  robotsNoIndex,
} from "@/lib/seo";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const match = await getMatchByCode(code);
  if (!match) {
    return { title: "Partido", robots: robotsNoIndex };
  }
  const open = openSlotCount(match);
  const dominant =
    match.match_slots.find(slotIsOpen)?.position ?? match.match_slots[0]?.position ?? "any";
  const position = positionLabel[dominant as Position] ?? "Cualquiera";
  const title = `${openSlotsPhrase(open, position)} en ${match.venues.name}`;
  const sport = sportLabel[match.sport as keyof typeof sportLabel] ?? match.sport;
  const description = `${formatWhen(match.starts_at, match.cities.timezone)} · ${match.venues.neighborhood ?? match.cities.name} · ${sport}`;
  const url = absoluteUrl(`/p/${match.share_code}`);
  const ogTitle = fullTitle(title);
  const indexable = matchIsIndexable(match.status, match.starts_at);
  return {
    title,
    description,
    robots: indexable ? robotsIndex : robotsNoIndex,
    alternates: { canonical: url },
    openGraph: defaultOg({ title: ogTitle, description, url }),
    twitter: defaultTwitter({ title: ogTitle, description }),
  };
}

export default async function PartidoPage({ params }: Props) {
  const { code } = await params;
  const [match, userId] = await Promise.all([getMatchByCode(code), getSessionUserId()]);
  if (!match) {
    notFound();
  }

  const [hostMatchCount, profile, upcoming] = await Promise.all([
    getHostMatchCount(match.host_id),
    userId ? getProfile(userId) : Promise.resolve(null),
    getUpcomingMatches(match.city_id),
  ]);
  const cancelled = match.status === "cancelled";
  const open = cancelled ? 0 : openSlotCount(match);
  const dominant =
    match.match_slots.find(slotIsOpen)?.position ?? match.match_slots[0]?.position ?? "any";
  const position = positionLabel[dominant as Position] ?? "Cualquiera";
  const when = formatWhen(match.starts_at, match.cities.timezone);
  const price = formatMoney(match.cost_per_person, match.currency);
  const isHost = userId === match.host_id;
  const canCancel = isHost && !cancelled && match.starts_at > new Date().toISOString();
  const hostName = match.profiles.display_name;
  const levelOkBadge = formatLevelOkBadge(
    match.profiles.level_ok_count ?? 0,
    match.profiles.level_feedback_count ?? 0,
  );
  const shareProps = {
    openCount: open,
    position,
    when,
    venue: match.venues.name,
    neighborhood: match.venues.neighborhood,
    price,
    shareCode: match.share_code,
  };
  const directionsHref = mapsDirectionsUrl(
    match.venues.lat,
    match.venues.lng,
    match.venues.address ? `${match.venues.name}, ${match.venues.address}` : match.venues.name,
  );
  const moreHere = upcoming
    .filter((item) => item.id !== match.id && item.venue_id === match.venue_id)
    .slice(0, 3);
  const moreSoon = upcoming
    .filter((item) => item.id !== match.id && item.sport === match.sport && item.venue_id !== match.venue_id)
    .slice(0, 3);
  const related = moreHere.length > 0 ? moreHere : moreSoon;
  const relatedHeading =
    moreHere.length > 0 ? "Más huecos en esta cancha" : `Más ${sportLabel[match.sport as keyof typeof sportLabel] ?? match.sport}`;

  return (
    <main className="page page-match-detail" id="main">
      <JsonLd data={matchJsonLd(match)} />
      <div className="match-detail-layout">
        <div className="match-detail-primary">
          <header className="match-detail-head">
            <div className="match-status-row">
              <p className="eyebrow">{match.cities.name}</p>
              <span className={`status-chip ${cancelled ? "is-full" : open > 0 ? "is-open" : "is-full"}`}>
                {cancelled ? matchStatusLabel.cancelled : open > 0 ? "Abierto" : "Completo"}
              </span>
            </div>
            <h1>{cancelled ? "Partido cancelado" : openSlotsPhrase(open, position)}</h1>
            <p className="lede match-detail-when">{when}</p>
          </header>

          <dl className="match-stat-strip" aria-label="Datos del partido">
            <div>
              <dt>Deporte</dt>
              <dd>
                {sportLabel[match.sport as keyof typeof sportLabel] ?? match.sport}{" "}
                {formatLabel[match.format as keyof typeof formatLabel] ?? match.format}
              </dd>
            </div>
            <div>
              <dt>Quién juega</dt>
              <dd>{genderLabel[match.gender_policy as keyof typeof genderLabel] ?? match.gender_policy}</dd>
            </div>
            <div>
              <dt>Por persona</dt>
              <dd>{price}</dd>
            </div>
            <div>
              <dt>Duración</dt>
              <dd>{match.duration_min} min</dd>
            </div>
          </dl>

          <p className="match-host-line">
            Organiza <strong>{hostName}</strong>
            {hostMatchCount >= 3 ? (
              <span className="host-armo-badge" role="status">
                Armó {hostMatchCount} pateadas
              </span>
            ) : null}
            {levelOkBadge ? (
              <span className="host-level-badge" role="status">
                {levelOkBadge}
              </span>
            ) : null}
          </p>
          {match.notes ? <p className="notes">{match.notes}</p> : null}

          {isHost && !cancelled && open > 0 ? <HostShareBanner {...shareProps} /> : null}
          {!cancelled ? <ShareWhatsApp {...shareProps} sticky={isHost && open > 0} /> : null}

          {canCancel ? (
            <div className="match-host-actions">
              <Link className="btn-flood" href={`/p/${match.share_code}/editar`}>
                Editar
              </Link>
              <form action={cancelMatchAction} className="cancel-match-form">
                <input type="hidden" name="match_id" value={match.id} />
                <input type="hidden" name="share_code" value={match.share_code} />
                <button className="btn-ghost" type="submit">
                  Cancelar partido
                </button>
              </form>
            </div>
          ) : null}

          <h2 className="subhead">Cupos</h2>
          <SlotList
            slots={match.match_slots}
            shareCode={match.share_code}
            isHost={isHost}
            userId={userId}
            matchCancelled={cancelled}
            profileLevel={profile?.level ?? null}
          />
        </div>

        <section className="match-venue-block" aria-labelledby="match-venue-heading">
          <div className="match-venue-copy">
            <h2 className="subhead" id="match-venue-heading">
              Dónde se juega
            </h2>
            <p className="match-venue-name">
              <Link href={`/canchas/${match.venues.slug}`}>{match.venues.name}</Link>
            </p>
            <p className="match-venue-meta">
              {[match.venues.neighborhood, match.venues.address].filter(Boolean).join(" · ") || match.cities.name}
            </p>
            <p className="venue-map-foot">
              <a href={directionsHref} target="_blank" rel="noopener noreferrer">
                Cómo llegar
              </a>
              {" · "}
              <Link href={`/canchas/${match.venues.slug}`}>Ficha de la cancha</Link>
            </p>
          </div>
          <div className="venue-map-wrap venue-map-detail match-venue-map">
            <VenueMapLazy
              venues={[match.venues]}
              center={{ lat: match.venues.lat, lng: match.venues.lng }}
              focusId={match.venues.id}
            />
          </div>
        </section>
      </div>

      {related.length > 0 ? (
        <section className="match-related" aria-labelledby="match-related-heading">
          <h2 className="subhead" id="match-related-heading">
            {relatedHeading}
          </h2>
          <ul className="roster">
            {related.map((item) => (
              <li key={item.id}>
                <MatchRow match={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="foot-link">
        <Link href="/partidos?filtro=hoy">Radar de hoy</Link>
        {" · "}
        <Link href="/canchas">Canchas</Link>
      </p>
    </main>
  );
}
