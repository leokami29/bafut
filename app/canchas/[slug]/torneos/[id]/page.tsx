import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TournamentBracketTable } from "@/components/tournaments/TournamentBracketTable";
import { TournamentGroupStandings } from "@/components/tournaments/TournamentGroupStandings";
import { TournamentStatsPanel } from "@/components/tournaments/TournamentStatsPanel";
import { getActiveCity, getVenueBySlug } from "@/lib/data";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { isUuid } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";
import type { TournamentFormat, TournamentSport, TournamentStatus } from "@/lib/tournaments/authz";
import {
  tournamentFormatLabel,
  tournamentSportLabel,
  tournamentStatusLabel,
} from "@/lib/tournaments/labels";
import {
  loadGroupStandings,
  loadTournamentBracket,
} from "@/lib/tournaments/load";
import { loadTournamentStats } from "@/lib/tournaments/stats-load";
import type { SportId } from "@/lib/tournaments/sports";
import {
  absoluteUrl,
  defaultOg,
  defaultTwitter,
  fullTitle,
} from "@/lib/seo";

type Props = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  if (!isUuid(id)) return { title: "Torneo" };

  const city = await getActiveCity();
  const venue = city ? await getVenueBySlug(city.id, slug) : null;
  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("name, visibility")
    .eq("id", id)
    .maybeSingle();

  if (!tournament || tournament.visibility !== "published") {
    return { title: "Torneo" };
  }

  const title = venue ? `${tournament.name} · ${venue.name}` : tournament.name;
  const description = `Llave y fixtures de ${tournament.name}.`;
  const url = absoluteUrl(`/canchas/${slug}/torneos/${id}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: defaultOg({ title: fullTitle(title), description, url }),
    twitter: defaultTwitter({ title: fullTitle(title), description }),
  };
}

export default async function VenueTournamentPublicDetailPage({ params }: Props) {
  const { slug, id } = await params;
  if (!isUuid(id)) notFound();

  const city = await getActiveCity();
  if (!city) notFound();

  const venue = await getVenueBySlug(city.id, slug);
  if (!venue) notFound();

  const flagOn = await isFeatureEnabled("venue_tournaments");
  if (!flagOn) notFound();

  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from("tournaments")
    .select(
      "id, name, sport, format, status, visibility, max_teams, venue_id, starts_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (
    !tournament ||
    tournament.venue_id !== venue.id ||
    tournament.visibility !== "published"
  ) {
    notFound();
  }

  const sport = tournament.sport as TournamentSport;
  const format = tournament.format as TournamentFormat;
  const showLeagueTable =
    format === "round_robin" || format === "groups_knockout";

  const [{ data: teams }, bracket, stats, groupStandings] = await Promise.all([
    supabase
      .from("tournament_teams")
      .select("id, name, seed")
      .eq("tournament_id", id)
      .order("created_at", { ascending: true }),
    loadTournamentBracket(supabase, id),
    loadTournamentStats(supabase, id, sport as SportId),
    showLeagueTable
      ? loadGroupStandings(supabase, id)
      : Promise.resolve([]),
  ]);

  const status = tournament.status as TournamentStatus;

  return (
    <main className="page page-narrow" id="main">
      <p className="tournament-public-nav">
        <Link href={`/canchas/${slug}/torneos`}>← Torneos · {venue.name}</Link>
      </p>
      <header className="page-head">
        <p className="eyebrow">
          {tournamentSportLabel[sport] ?? tournament.sport} ·{" "}
          {tournamentFormatLabel[format] ?? tournament.format}
        </p>
        <h1>{tournament.name}</h1>
        <p className="tournament-list-meta">
          <span>{tournamentStatusLabel[status] ?? tournament.status}</span>
          <span>{(teams ?? []).length} equipos</span>
        </p>
      </header>

      <section aria-labelledby="public-teams-title">
        <h2 id="public-teams-title" className="subhead">
          Equipos
        </h2>
        {(teams ?? []).length === 0 ? (
          <p className="field-help">Sin equipos publicados todavía.</p>
        ) : (
          <ul className="tournament-team-list">
            {(teams ?? []).map((team, idx) => (
              <li key={team.id} className="tournament-team-row">
                <span>
                  {idx + 1}. {team.name}
                </span>
                {team.seed != null ? (
                  <span className="tournament-list-meta">Seed {team.seed}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {showLeagueTable && bracket.stageId ? (
        <section aria-labelledby="public-standings-title">
          <h2 id="public-standings-title" className="subhead">
            {format === "groups_knockout" ? "Tablas de grupos" : "Tabla de posiciones"}
          </h2>
          <TournamentGroupStandings
            blocks={groupStandings}
            forLabel={stats.forLabel}
            againstLabel={stats.againstLabel}
          />
        </section>
      ) : null}

      <section aria-labelledby="public-bracket-title">
        <h2 id="public-bracket-title" className="subhead">
          {format === "round_robin"
            ? "Fixtures"
            : format === "groups_knockout"
              ? "Grupos / llave"
              : "Llave"}
        </h2>
        {bracket.stages.length > 1 ? (
          <p className="field-help">
            {bracket.stages.map((s) => s.name).join(" · ")}
          </p>
        ) : bracket.stageName ? (
          <p className="field-help">{bracket.stageName}</p>
        ) : null}
        <TournamentBracketTable
          matches={bracket.matches}
          rounds={bracket.rounds}
          groups={bracket.groups}
          emptyHint="El fixture aún no está generado."
        />
      </section>

      <TournamentStatsPanel stats={stats} idPrefix="public-stats" />
    </main>
  );
}
