import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveCity, getVenueBySlug } from "@/lib/data";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import type { TournamentFormat, TournamentSport, TournamentStatus } from "@/lib/tournaments/authz";
import {
  tournamentFormatLabel,
  tournamentSportLabel,
  tournamentStatusLabel,
} from "@/lib/tournaments/labels";
import { listVenueTournaments } from "@/lib/tournaments/load";
import {
  absoluteUrl,
  defaultOg,
  defaultTwitter,
  fullTitle,
} from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const city = await getActiveCity();
  const venue = city ? await getVenueBySlug(city.id, slug) : null;
  const title = venue ? `Torneos · ${venue.name}` : "Torneos";
  const description = venue
    ? `Campeonatos y llaves en ${venue.name}.`
    : "Torneos de la cancha.";
  const url = absoluteUrl(`/canchas/${slug}/torneos`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: defaultOg({ title: fullTitle(title), description, url }),
    twitter: defaultTwitter({ title: fullTitle(title), description }),
  };
}

export default async function VenueTournamentsPublicPage({ params }: Props) {
  const { slug } = await params;
  const city = await getActiveCity();
  if (!city) notFound();

  const venue = await getVenueBySlug(city.id, slug);
  if (!venue) notFound();

  const flagOn = await isFeatureEnabled("venue_tournaments");
  const supabase = await createClient();
  const tournaments = flagOn
    ? await listVenueTournaments(supabase, venue.id, { publishedOnly: true })
    : [];

  return (
    <main className="page page-narrow" id="main">
      <p className="tournament-public-nav">
        <Link href={`/canchas/${slug}`}>← {venue.name}</Link>
      </p>
      <header className="page-head">
        <p className="eyebrow">{city.name}</p>
        <h1>Torneos · {venue.name}</h1>
        <p className="lede">Llaves y fixtures publicados de esta cancha.</p>
      </header>

      {!flagOn ? (
        <p className="field-help">Los torneos no están disponibles por ahora.</p>
      ) : tournaments.length === 0 ? (
        <p className="field-help">No hay torneos públicos en esta cancha.</p>
      ) : (
        <ul className="tournament-list">
          {tournaments.map((t) => {
            const sport = t.sport as TournamentSport;
            const format = t.format as TournamentFormat;
            const status = t.status as TournamentStatus;
            return (
              <li key={t.id} className="tournament-list-item">
                <Link
                  href={`/canchas/${slug}/torneos/${t.id}`}
                  className="tournament-list-link"
                >
                  <span className="tournament-list-name">{t.name}</span>
                  <span className="tournament-list-meta">
                    <span>{tournamentSportLabel[sport] ?? t.sport}</span>
                    <span>{tournamentFormatLabel[format] ?? t.format}</span>
                    <span>{tournamentStatusLabel[status] ?? t.status}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
