import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VenueAdminNav } from "@/components/VenueAdminNav";
import { TournamentAccessNotice } from "@/components/tournaments/TournamentAccessNotice";
import { TournamentBracketTable } from "@/components/tournaments/TournamentBracketTable";
import {
  TournamentGenerateKnockoutButton,
  TournamentGenerateStageButton,
} from "@/components/tournaments/TournamentGenerateStageButton";
import { TournamentGroupStandings } from "@/components/tournaments/TournamentGroupStandings";
import { TournamentRegisterTeamForm } from "@/components/tournaments/TournamentRegisterTeamForm";
import { TournamentStatsPanel } from "@/components/tournaments/TournamentStatsPanel";
import { TournamentStatusChip } from "@/components/tournaments/TournamentStatusChip";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getVenueBySlug } from "@/lib/data";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { isUuid } from "@/lib/ids";
import { robotsNoIndex } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import {
  canManageVenueTournaments,
  canScoreTournament,
  resolveVenueTournamentsGate,
  type TournamentFormat,
  type TournamentSport,
  type TournamentStatus,
  type VenueStaffRole,
} from "@/lib/tournaments/authz";
import {
  tournamentFormatLabel,
  tournamentSportLabel,
  tournamentStatusLabel,
  tournamentVisibilityLabel,
} from "@/lib/tournaments/labels";
import {
  loadGroupStandings,
  loadTournamentBracket,
} from "@/lib/tournaments/load";
import { formatSupportsStageGeneration } from "@/lib/tournaments/service";
import { loadTournamentStats } from "@/lib/tournaments/stats-load";
import type { SportId } from "@/lib/tournaments/sports";

export const metadata: Metadata = {
  title: "Detalle de torneo",
  robots: robotsNoIndex,
};

type Props = { params: Promise<{ slug: string; id: string }> };

function formatStartsAt(iso: string | null): string {
  if (!iso) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "Sin fecha";
  }
}

export default async function VenueTournamentAdminDetailPage({ params }: Props) {
  const { slug, id } = await params;
  if (!isUuid(id)) notFound();

  const { userId } = await requireUserId(`/canchas/${slug}/admin/torneos/${id}`);
  const city = await getActiveCity();
  if (!city) notFound();

  const venue = await getVenueBySlug(city.id, slug);
  if (!venue) notFound();

  const supabase = await createClient();
  const tournamentsFlagEnabled = await isFeatureEnabled("venue_tournaments");

  const [
    { data: isAdmin },
    { data: staffRows },
    { data: activeSubs },
    { data: tournament },
    { data: photos },
    { count: promoCount },
    { data: pendingReq },
    { count: pendingTurnosCount },
  ] = await Promise.all([
    supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("venue_staff")
      .select("venue_id, user_id, role")
      .eq("venue_id", venue.id)
      .eq("user_id", userId),
    supabase
      .from("venue_subscriptions")
      .select("plan, status, expires_at")
      .eq("venue_id", venue.id),
    supabase
      .from("tournaments")
      .select(
        "id, name, sport, format, status, visibility, max_teams, starts_at, venue_id",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("venue_photos").select("id").eq("venue_id", venue.id),
    supabase
      .from("venue_promotions")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venue.id)
      .eq("active", true),
    supabase
      .from("venue_subscription_requests")
      .select("id")
      .eq("venue_id", venue.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("venue_bookings")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venue.id)
      .eq("status", "pending"),
  ]);

  if (!tournament || tournament.venue_id !== venue.id) {
    notFound();
  }

  const typedStaff = (staffRows ?? []).map((row) => ({
    venue_id: row.venue_id as string,
    user_id: row.user_id as string,
    role: row.role as VenueStaffRole,
  }));

  const authzCtx = {
    venueId: venue.id,
    ownerId: venue.owner_id,
    subscriptions: activeSubs ?? [],
    staffRows: typedStaff,
    isPlatformAdmin: Boolean(isAdmin),
    tournamentsFlagEnabled,
  };

  const gate = resolveVenueTournamentsGate(authzCtx, userId);
  if (gate === "forbidden") {
    notFound();
  }

  const canManage = canManageVenueTournaments(authzCtx, userId);
  const canScore = canScoreTournament(authzCtx, userId);
  const base = `/canchas/${slug}/admin`;

  if (gate !== "ok") {
    return (
      <main className="page page-venue-admin" id="main">
        <p className="venue-back">
          <Link href={`${base}/torneos`}>← Torneos</Link>
        </p>
        <header className="page-head page-head-compact">
          <h1>{tournament.name}</h1>
        </header>
        <TournamentAccessNotice reason={gate} adminBase={base} />
      </main>
    );
  }

  const sport = tournament.sport as TournamentSport;
  const format = tournament.format as TournamentFormat;
  const showLeagueTable =
    format === "round_robin" || format === "groups_knockout";

  const [{ data: teams }, bracket, stats, groupStandings] = await Promise.all([
    supabase
      .from("tournament_teams")
      .select("id, name, seed, created_at, bm_participant_id")
      .eq("tournament_id", id)
      .order("created_at", { ascending: true }),
    loadTournamentBracket(supabase, id),
    loadTournamentStats(supabase, id, sport as SportId),
    showLeagueTable
      ? loadGroupStandings(supabase, id)
      : Promise.resolve([]),
  ]);

  const teamList = [...(teams ?? [])].sort((a, b) => {
    if (a.seed == null && b.seed == null) return 0;
    if (a.seed == null) return 1;
    if (b.seed == null) return -1;
    return a.seed - b.seed;
  });
  const status = tournament.status as TournamentStatus;
  const vis = tournament.visibility === "published" ? "published" : "private";
  const canRegister =
    canManage && (status === "draft" || status === "registration");
  const canGenerate =
    canManage &&
    !bracket.stageId &&
    (status === "draft" || status === "registration") &&
    formatSupportsStageGeneration(format);
  const canGenerateKnockout = canManage && bracket.canGenerateKnockout;
  const minTeams = format === "groups_knockout" ? 4 : 2;
  const fillPct =
    tournament.max_teams > 0
      ? Math.min(100, Math.round((teamList.length / tournament.max_teams) * 100))
      : 0;
  const readyToGenerate = canGenerate && teamList.length >= minTeams;

  return (
    <main className="page page-venue-admin" id="main">
      <p className="venue-back">
        <Link href={`${base}/torneos`}>← Torneos</Link>
      </p>

      <header className="tournament-detail-head">
        <p className="eyebrow">
          {tournamentSportLabel[sport] ?? tournament.sport} ·{" "}
          {tournamentFormatLabel[format] ?? tournament.format}
        </p>
        <div className="tournament-detail-title-row">
          <h1>{tournament.name}</h1>
          <div className="tournament-detail-chips">
            <TournamentStatusChip status={status} />
            <span className={`tournament-chip tournament-chip-vis is-${vis}`}>
              {tournamentVisibilityLabel[vis]}
            </span>
          </div>
        </div>

        <div className="tournament-detail-meta" aria-label="Datos del torneo">
          <div>
            <span className="venue-admin-label">Equipos</span>
            <strong>
              {teamList.length}/{tournament.max_teams}
            </strong>
          </div>
          <div>
            <span className="venue-admin-label">Inicio</span>
            <strong>{formatStartsAt(tournament.starts_at)}</strong>
          </div>
          <div>
            <span className="venue-admin-label">Partidos</span>
            <strong>{bracket.matches.length || "—"}</strong>
          </div>
          <div>
            <span className="venue-admin-label">Cupo</span>
            <div
              className="tournament-fill tournament-fill-inline"
              aria-hidden="true"
            >
              <div className="tournament-fill-bar" style={{ width: `${fillPct}%` }} />
              <span className="tournament-fill-label">{fillPct}%</span>
            </div>
          </div>
        </div>
      </header>

      <Suspense fallback={<div className="venue-admin-board admin-board" aria-hidden="true" />}>
        <VenueAdminNav
          venueSlug={slug}
          counts={{
            photos: photos?.length ?? 0,
            pendingPremium: pendingReq ? 1 : 0,
            promotions: promoCount ?? 0,
            pendingTurnos: pendingTurnosCount ?? 0,
          }}
        />
      </Suspense>

      {readyToGenerate ? (
        <p className="tournament-callout tournament-callout-ready">
          Tenés {teamList.length} equipos listos. Generá la{" "}
          {format === "round_robin" ? "liga" : "llave"} para pasar el torneo a «En
          curso».
        </p>
      ) : canRegister && teamList.length < minTeams ? (
        <p className="tournament-callout tournament-callout-info">
          Inscribí al menos {minTeams} equipos para poder generar el fixture.
        </p>
      ) : null}

      <div className="tournament-detail-grid">
        <section className="tournament-panel" aria-labelledby="teams-title">
          <div className="tournament-panel-head">
            <h2 id="teams-title" className="subhead">
              Equipos
            </h2>
            <span className="tournament-panel-count">
              {teamList.length}/{tournament.max_teams}
            </span>
          </div>

          {teamList.length === 0 ? (
            <p className="field-help">Todavía no hay equipos inscritos.</p>
          ) : (
            <ol className="tournament-team-list">
              {teamList.map((team) => (
                <li key={team.id} className="tournament-team-row">
                  <span className="tournament-team-name">{team.name}</span>
                  <span className="tournament-team-seed">
                    {team.seed != null ? `Seed ${team.seed}` : "Sin seed"}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {canRegister ? (
            <div className="tournament-panel-form">
              <h3 className="tournament-panel-sub">Inscribir equipo</h3>
              <TournamentRegisterTeamForm
                slug={slug}
                tournamentId={id}
                disabled={teamList.length >= tournament.max_teams}
              />
              {teamList.length >= tournament.max_teams ? (
                <p className="field-help">Cupo completo.</p>
              ) : null}
            </div>
          ) : canManage ? (
            <p className="field-help">
              La inscripción está cerrada (torneo {tournamentStatusLabel[status]}).
            </p>
          ) : null}
        </section>

        <section className="tournament-panel" aria-labelledby="stage-title">
          <div className="tournament-panel-head">
            <h2 id="stage-title" className="subhead">
              Fixture
            </h2>
          </div>

          {canGenerate ? (
            <TournamentGenerateStageButton
              slug={slug}
              tournamentId={id}
              teamCount={teamList.length}
              format={format}
            />
          ) : bracket.stageId ? (
            <p className="field-help">
              Stage generado
              {bracket.stageName ? `: ${bracket.stageName}` : ""}. Los partidos
              aparecen abajo.
            </p>
          ) : (
            <p className="field-help">
              Cuando haya equipos suficientes, vas a poder generar la llave aquí.
            </p>
          )}

          {canGenerateKnockout ? (
            <TournamentGenerateKnockoutButton slug={slug} tournamentId={id} />
          ) : null}
        </section>
      </div>

      {showLeagueTable && bracket.stageId ? (
        <section className="tournament-panel" aria-labelledby="standings-title">
          <h2 id="standings-title" className="subhead">
            {format === "groups_knockout" ? "Tablas de grupos" : "Tabla de posiciones"}
          </h2>
          <TournamentGroupStandings
            blocks={groupStandings}
            forLabel={stats.forLabel}
            againstLabel={stats.againstLabel}
          />
        </section>
      ) : null}

      <section className="tournament-panel" aria-labelledby="bracket-title">
        <div className="tournament-panel-head">
          <h2 id="bracket-title" className="subhead">
            {format === "round_robin"
              ? "Partidos"
              : format === "groups_knockout"
                ? "Grupos / llave"
                : "Llave"}
          </h2>
          {bracket.matches.length > 0 ? (
            <span className="tournament-panel-count">
              {bracket.matches.length} partidos
            </span>
          ) : null}
        </div>
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
          actaHref={
            canScore
              ? (matchId) => `${base}/torneos/${id}/partidos/${matchId}`
              : undefined
          }
          emptyHint="Generá el stage para ver los partidos."
        />
        {!canScore && bracket.matches.length > 0 ? (
          <p className="field-help">Solo lectura: necesitás rol scorer para el acta.</p>
        ) : null}
      </section>

      <TournamentStatsPanel
        stats={stats}
        idPrefix="admin-stats"
        className="tournament-panel"
      />

      {vis === "published" ? (
        <p className="foot-link tournament-foot">
          <Link href={`/canchas/${slug}/torneos/${id}`}>Ver vista pública →</Link>
        </p>
      ) : null}
    </main>
  );
}
