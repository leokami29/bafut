import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import {
  getSportCatalog,
  type BracketScoreKind,
  type SportId,
} from "@/lib/tournaments/sports";

type Db = SupabaseClient<Database>;

export type StandingRow = {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  forScore: number;
  againstScore: number;
  points: number;
};

export type LeaderboardEntry = {
  teamMemberId: string;
  displayName: string;
  teamName: string;
  jerseyNumber: number | null;
  value: number;
};

export type LeaderboardBoard = {
  key: string;
  label: string;
  entries: LeaderboardEntry[];
};

export type TeamScoreBar = {
  teamId: string;
  teamName: string;
  forScore: number;
  againstScore: number;
  points: number;
};

/** Punto de evolución acumulada (por partido confirmado, orden temporal). */
export type ScoreEvolutionPoint = {
  matchIndex: number;
  label: string;
  /** Acumulado for_score por teamId */
  byTeam: Record<string, number>;
};

export type TournamentStatsView = {
  sport: SportId;
  scoreKind: BracketScoreKind;
  forLabel: string;
  againstLabel: string;
  standings: StandingRow[];
  leaderboards: LeaderboardBoard[];
  teamBars: TeamScoreBar[];
  evolution: {
    teamNames: Record<string, string>;
    points: ScoreEvolutionPoint[];
  };
};

function scoreColumnLabels(kind: BracketScoreKind): {
  forLabel: string;
  againstLabel: string;
} {
  switch (kind) {
    case "goals":
      return { forLabel: "GF", againstLabel: "GC" };
    case "points":
      return { forLabel: "PF", againstLabel: "PC" };
    case "sets":
      return { forLabel: "SF", againstLabel: "SC" };
    default:
      return { forLabel: "A favor", againstLabel: "En contra" };
  }
}

function metricValue(metrics: Json, key: string): number {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return 0;
  }
  const raw = (metrics as Record<string, unknown>)[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

function opponentId(op: Json | null): number | null {
  if (!op || typeof op !== "object" || Array.isArray(op)) return null;
  const id = (op as { id?: unknown }).id;
  return typeof id === "number" ? id : null;
}

/**
 * Construye leaderboards a partir de filas crudas + catálogo del deporte.
 * Exportado para tests unitarios.
 */
export function buildLeaderboards(
  sport: SportId,
  rows: Array<{
    teamMemberId: string;
    displayName: string;
    teamName: string;
    jerseyNumber: number | null;
    metrics: Json;
  }>,
  limit = 10,
): LeaderboardBoard[] {
  const catalog = getSportCatalog(sport);
  return catalog.leaderboardMetrics.map((metric) => {
    const entries: LeaderboardEntry[] = rows
      .map((row) => ({
        teamMemberId: row.teamMemberId,
        displayName: row.displayName,
        teamName: row.teamName,
        jerseyNumber: row.jerseyNumber,
        value: metricValue(row.metrics, metric.key),
      }))
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value || a.displayName.localeCompare(b.displayName))
      .slice(0, limit);

    return {
      key: metric.key,
      label: metric.label,
      entries,
    };
  });
}

/**
 * Evolución acumulada de marcador a favor por equipo (partidos confirmados).
 */
export function buildScoreEvolution(
  matches: Array<{
    confirmedAt: string;
    matchNumber: number;
    scoreA: number;
    scoreB: number;
    teamAId: string | null;
    teamBId: string | null;
  }>,
  teamNames: Record<string, string>,
): ScoreEvolutionPoint[] {
  const ordered = [...matches].sort((a, b) => {
    const t = a.confirmedAt.localeCompare(b.confirmedAt);
    if (t !== 0) return t;
    return a.matchNumber - b.matchNumber;
  });

  const cumulative: Record<string, number> = {};
  for (const id of Object.keys(teamNames)) {
    cumulative[id] = 0;
  }

  const points: ScoreEvolutionPoint[] = [];
  let idx = 0;
  for (const m of ordered) {
    if (m.teamAId) {
      cumulative[m.teamAId] = (cumulative[m.teamAId] ?? 0) + m.scoreA;
    }
    if (m.teamBId) {
      cumulative[m.teamBId] = (cumulative[m.teamBId] ?? 0) + m.scoreB;
    }
    idx += 1;
    points.push({
      matchIndex: idx,
      label: `P${m.matchNumber}`,
      byTeam: { ...cumulative },
    });
  }
  return points;
}

export async function loadTournamentStats(
  supabase: Db,
  tournamentId: string,
  sport: SportId,
): Promise<TournamentStatsView> {
  const catalog = getSportCatalog(sport);
  const { forLabel, againstLabel } = scoreColumnLabels(catalog.bracketScoreKind);

  const [
    { data: standingRows },
    { data: playerRows },
    { data: teams },
    { data: results },
    { data: bmMatches },
  ] = await Promise.all([
    supabase
      .from("tournament_standings")
      .select(
        "team_id, played, wins, draws, losses, for_score, against_score, points, tournament_teams(name)",
      )
      .eq("tournament_id", tournamentId),
    supabase
      .from("player_tournament_stats")
      .select(
        "team_member_id, metrics, tournament_team_members(display_name, jersey_number, team_id, tournament_teams(name))",
      )
      .eq("tournament_id", tournamentId),
    supabase
      .from("tournament_teams")
      .select("id, name, bm_participant_id")
      .eq("tournament_id", tournamentId),
    supabase
      .from("tournament_match_results")
      .select("bm_match_id, score_a, score_b, confirmed_at")
      .eq("tournament_id", tournamentId)
      .order("confirmed_at", { ascending: true }),
    supabase
      .from("bm_match")
      .select("id, number, opponent1, opponent2")
      .eq("tournament_id", tournamentId),
  ]);

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const teamByParticipant = new Map(
    (teams ?? [])
      .filter((t) => t.bm_participant_id != null)
      .map((t) => [t.bm_participant_id as number, t.id]),
  );

  const standings: StandingRow[] = (standingRows ?? [])
    .map((row) => {
      const nested = row.tournament_teams as { name?: string } | null;
      return {
        teamId: row.team_id,
        teamName: nested?.name ?? teamNameById.get(row.team_id) ?? "Equipo",
        played: row.played,
        wins: row.wins,
        draws: row.draws,
        losses: row.losses,
        forScore: row.for_score,
        againstScore: row.against_score,
        points: row.points,
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffA = a.forScore - a.againstScore;
      const diffB = b.forScore - b.againstScore;
      if (diffB !== diffA) return diffB - diffA;
      return b.forScore - a.forScore;
    });

  const playerMapped = (playerRows ?? []).map((row) => {
    const member = row.tournament_team_members as {
      display_name?: string;
      jersey_number?: number | null;
      team_id?: string;
      tournament_teams?: { name?: string } | null;
    } | null;
    return {
      teamMemberId: row.team_member_id,
      displayName: member?.display_name ?? "Jugador",
      teamName: member?.tournament_teams?.name ?? "Equipo",
      jerseyNumber: member?.jersey_number ?? null,
      metrics: row.metrics,
    };
  });

  const leaderboards = buildLeaderboards(sport, playerMapped);

  const teamBars: TeamScoreBar[] = standings.map((s) => ({
    teamId: s.teamId,
    teamName: s.teamName,
    forScore: s.forScore,
    againstScore: s.againstScore,
    points: s.points,
  }));

  const matchById = new Map((bmMatches ?? []).map((m) => [m.id, m]));
  const evolutionMatches = (results ?? []).map((r) => {
    const bm = matchById.get(r.bm_match_id);
    const pid1 = opponentId(bm?.opponent1 ?? null);
    const pid2 = opponentId(bm?.opponent2 ?? null);
    return {
      confirmedAt: r.confirmed_at,
      matchNumber: bm?.number ?? r.bm_match_id,
      scoreA: r.score_a,
      scoreB: r.score_b,
      teamAId: pid1 != null ? (teamByParticipant.get(pid1) ?? null) : null,
      teamBId: pid2 != null ? (teamByParticipant.get(pid2) ?? null) : null,
    };
  });

  const teamNamesRecord: Record<string, string> = {};
  for (const [id, name] of teamNameById) {
    teamNamesRecord[id] = name;
  }

  return {
    sport,
    scoreKind: catalog.bracketScoreKind,
    forLabel,
    againstLabel,
    standings,
    leaderboards,
    teamBars,
    evolution: {
      teamNames: teamNamesRecord,
      points: buildScoreEvolution(evolutionMatches, teamNamesRecord),
    },
  };
}
