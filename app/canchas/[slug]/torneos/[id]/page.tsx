import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/tournaments/TournamentIcons";
import { TournamentVisualBracket } from "@/components/tournaments/TournamentVisualBracket";
import { TournamentLeagueView } from "@/components/tournaments/TournamentLeagueView";
import { TournamentSportHeader } from "@/components/tournaments/TournamentSportHeader";
import { TournamentSportIcon } from "@/components/tournaments/TournamentSportIcon";
import { TournamentStatsPanel } from "@/components/tournaments/TournamentStatsPanel";
import { getActiveCity, getVenueBySlug } from "@/lib/data";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { isUuid } from "@/lib/ids";
import { tryCreateServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { TournamentFormat, TournamentSport, TournamentStatus } from "@/lib/tournaments/authz";
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
  const supabase = tryCreateServiceClient() ?? (await createClient());
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

  const supabase = tryCreateServiceClient() ?? (await createClient());
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
  const isKnockout = format === "single_elim" || format === "double_elim";
  const isLeague = format === "round_robin";
  const isGroupsKnockout = format === "groups_knockout";

  const showLeagueTable = isLeague || isGroupsKnockout;

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
  const teamsList = teams ?? [];

  // Separación para formato híbrido (Grupos + Llave)
  const knockoutMatches = isGroupsKnockout
    ? bracket.matches.filter((m) => m.stageType !== "round_robin")
    : bracket.matches;
  const knockoutRounds = isGroupsKnockout
    ? bracket.rounds.filter((r) => knockoutMatches.some((m) => m.roundId === r.id))
    : bracket.rounds;
  const groupMatches = isGroupsKnockout
    ? bracket.matches.filter((m) => m.stageType === "round_robin")
    : bracket.matches;
  const groupRounds = isGroupsKnockout
    ? bracket.rounds.filter((r) => groupMatches.some((m) => m.roundId === r.id))
    : bracket.rounds;

  const sportParticipantTerm = sport === "padel" ? "Parejas" : "Equipos";

  return (
    <main className="page page-tournament-detail" id="main">
      <nav className="tournament-public-nav" aria-label="Navegación de torneos">
        <Link href={`/canchas/${slug}/torneos`} className="tournament-back-link">
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Todos los torneos · {venue.name}</span>
        </Link>
      </nav>

      {/* Header temático según el deporte */}
      <TournamentSportHeader
        name={tournament.name}
        sport={sport}
        format={format}
        status={status}
        teamCount={teamsList.length}
        maxTeams={tournament.max_teams}
        venueName={venue.name}
        venueSlug={slug}
        cityName={city.name}
        startsAt={tournament.starts_at}
      />

      {/* Formato 1: Eliminación Directa / Doble Eliminación (Llave Visual de Árbol) */}
      {isKnockout && (
        <section aria-labelledby="public-bracket-title" className="tournament-main-section">
          <div className="section-head-split">
            <div>
              <span className="section-kicker">Cuadro de Competencia</span>
              <h2 id="public-bracket-title" className="subhead">
                Árbol de Llaves
              </h2>
            </div>
            {bracket.stageName ? (
              <span className="badge tournament-stage-pill">{bracket.stageName}</span>
            ) : null}
          </div>

          <TournamentVisualBracket
            matches={bracket.matches}
            rounds={bracket.rounds}
            sport={sport}
            emptyHint="El cuadro de llaves se publicará una vez que comience el torneo."
          />
        </section>
      )}

      {/* Formato 2: Liga / Todos contra Todos (Tabla de posiciones + Jornadas) */}
      {isLeague && (
        <section aria-labelledby="public-league-title" className="tournament-main-section">
          <div className="section-head-split">
            <div>
              <span className="section-kicker">Competencia Regular</span>
              <h2 id="public-league-title" className="subhead">
                Tabla y Calendario
              </h2>
            </div>
          </div>

          <TournamentLeagueView
            matches={bracket.matches}
            rounds={bracket.rounds}
            groups={bracket.groups}
            groupStandings={groupStandings}
            forLabel={stats.forLabel}
            againstLabel={stats.againstLabel}
            sport={sport}
            emptyHint="El calendario de fechas aún no ha sido publicado."
          />
        </section>
      )}

      {/* Formato 3: Grupos + Eliminación (Híbrido) */}
      {isGroupsKnockout && (
        <div className="tournament-hybrid-sections">
          <section aria-labelledby="hybrid-groups-title" className="tournament-main-section">
            <div className="section-head-split">
              <div>
                <span className="section-kicker">Fase 1</span>
                <h2 id="hybrid-groups-title" className="subhead">
                  Fase de Grupos
                </h2>
              </div>
            </div>
            <TournamentLeagueView
              matches={groupMatches}
              rounds={groupRounds}
              groups={bracket.groups}
              groupStandings={groupStandings}
              forLabel={stats.forLabel}
              againstLabel={stats.againstLabel}
              sport={sport}
              emptyHint="Los grupos se publicarán al iniciar el torneo."
            />
          </section>

          <section aria-labelledby="hybrid-knockout-title" className="tournament-main-section">
            <div className="section-head-split">
              <div>
                <span className="section-kicker">Fase 2</span>
                <h2 id="hybrid-knockout-title" className="subhead">
                  Llaves Finales (Playoffs)
                </h2>
              </div>
            </div>
            <TournamentVisualBracket
              matches={knockoutMatches}
              rounds={knockoutRounds}
              sport={sport}
              emptyHint="Las llaves eliminatorias se generarán al finalizar la fase de grupos."
            />
          </section>
        </div>
      )}

      {/* Sección de Equipos / Parejas Participantes */}
      <section aria-labelledby="public-teams-title" className="tournament-main-section">
        <div className="section-head-split">
          <div>
            <span className="section-kicker">Inscripciones</span>
            <h2 id="public-teams-title" className="subhead">
              {sportParticipantTerm} Confirmadas ({teamsList.length}/{tournament.max_teams})
            </h2>
          </div>
        </div>

        {teamsList.length === 0 ? (
          <p className="field-help">Aún no hay inscripciones confirmadas para este torneo.</p>
        ) : (
          <div className="tournament-teams-grid">
            {teamsList.map((team, idx) => (
              <div key={team.id} className="tournament-team-card">
                <div className="tournament-team-seed">
                  {team.seed != null ? `#${team.seed}` : `${idx + 1}`}
                </div>
                <div className="tournament-team-info">
                  <span className="tournament-team-name">{team.name}</span>
                  <span className="tournament-team-badge">
                    <TournamentSportIcon sport={sport} size={11} aria-hidden="true" />
                    <span>{sport === "padel" ? "Dupla" : "Equipo"}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Panel de Estadísticas (Goleadores, Fair Play, etc.) */}
      <TournamentStatsPanel stats={stats} idPrefix="public-stats" />
    </main>
  );
}
