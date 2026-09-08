import type { Json } from "@/lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { TeamSide } from "@/lib/tournaments/sports";
import type { StandingRow } from "@/lib/tournaments/stats-load";

type Db = SupabaseClient<Database>;

export type BmOpponent = {
  id: number | null;
  score?: number;
  result?: string;
  position?: number;
};

export function parseBmOpponent(op: Json | null): BmOpponent | null {
  if (!op || typeof op !== "object" || Array.isArray(op)) return null;
  const o = op as Record<string, unknown>;
  const id = o.id;
  return {
    id: typeof id === "number" ? id : id == null ? null : null,
    score: typeof o.score === "number" ? o.score : undefined,
    result: typeof o.result === "string" ? o.result : undefined,
    position: typeof o.position === "number" ? o.position : undefined,
  };
}

export type TournamentListItem = {
  id: string;
  name: string;
  sport: string;
  format: string;
  status: string;
  visibility: string;
  max_teams: number;
  starts_at: string | null;
  created_at: string;
};

export type TournamentTeamRow = {
  id: string;
  name: string;
  seed: number | null;
  created_at: string;
  bm_participant_id: number | null;
};

export type FixtureMatch = {
  id: number;
  number: number;
  status: number;
  roundId: number;
  roundNumber: number;
  stageId: number;
  stageNumber: number;
  stageName: string;
  stageType: string;
  groupId: number;
  groupNumber: number;
  opponent1: BmOpponent | null;
  opponent2: BmOpponent | null;
  nameA: string;
  nameB: string;
  scoreA: number | null;
  scoreB: number | null;
  confirmed: boolean;
};

export type BracketStageInfo = {
  id: number;
  name: string;
  number: number;
  type: string;
};

export type BracketGroupInfo = {
  id: number;
  number: number;
  stageId: number;
  label: string;
};

export type BracketView = {
  /** Primer stage (compat); null si no hay. */
  stageId: number | null;
  stageName: string | null;
  stages: BracketStageInfo[];
  groups: BracketGroupInfo[];
  matches: FixtureMatch[];
  rounds: Array<{ id: number; number: number; label: string; stageId: number }>;
  /** True si hay fase RR de grupos y aún no hay elim. */
  canGenerateKnockout: boolean;
  groupsStageComplete: boolean;
};

export type GroupStandingBlock = {
  groupId: number;
  groupNumber: number;
  label: string;
  rows: StandingRow[];
};

function participantName(
  id: number | null | undefined,
  byId: Map<number, string>,
): string {
  if (id == null) return "Por definir";
  return byId.get(id) ?? `Equipo #${id}`;
}

function roundLabel(
  roundNumber: number,
  totalRounds: number,
  stageType: string,
): string {
  if (stageType === "round_robin") {
    return `Jornada ${roundNumber}`;
  }
  const remaining = totalRounds - roundNumber + 1;
  if (remaining === 1) return "Final";
  if (remaining === 2) return "Semifinal";
  if (remaining === 3) return "Cuartos";
  return `Ronda ${roundNumber}`;
}

export async function listVenueTournaments(
  supabase: Db,
  venueId: string,
  options?: { publishedOnly?: boolean },
): Promise<TournamentListItem[]> {
  let q = supabase
    .from("tournaments")
    .select(
      "id, name, sport, format, status, visibility, max_teams, starts_at, created_at",
    )
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false });

  if (options?.publishedOnly) {
    q = q.eq("visibility", "published");
  }

  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as TournamentListItem[];
}

export async function loadTournamentBracket(
  supabase: Db,
  tournamentId: string,
): Promise<BracketView> {
  const empty: BracketView = {
    stageId: null,
    stageName: null,
    stages: [],
    groups: [],
    matches: [],
    rounds: [],
    canGenerateKnockout: false,
    groupsStageComplete: false,
  };

  const [
    { data: stages },
    { data: groups },
    { data: rounds },
    { data: matches },
    { data: participants },
    { data: confirmed },
    { data: tournament },
  ] = await Promise.all([
    supabase
      .from("bm_stage")
      .select("id, name, number, type")
      .eq("tournament_id", tournamentId)
      .order("number", { ascending: true }),
    supabase
      .from("bm_group")
      .select("id, number, stage_id")
      .eq("tournament_id", tournamentId)
      .order("number", { ascending: true }),
    supabase
      .from("bm_round")
      .select("id, number, stage_id, group_id")
      .eq("tournament_id", tournamentId)
      .order("number", { ascending: true }),
    supabase
      .from("bm_match")
      .select(
        "id, number, status, round_id, stage_id, group_id, opponent1, opponent2",
      )
      .eq("tournament_id", tournamentId)
      .order("number", { ascending: true }),
    supabase
      .from("bm_participant")
      .select("id, name")
      .eq("tournament_id", tournamentId),
    supabase
      .from("tournament_match_results")
      .select("bm_match_id")
      .eq("tournament_id", tournamentId),
    supabase
      .from("tournaments")
      .select("format")
      .eq("id", tournamentId)
      .maybeSingle(),
  ]);

  const stageRows = stages ?? [];
  if (stageRows.length === 0) return empty;

  const byParticipant = new Map((participants ?? []).map((p) => [p.id, p.name]));
  const confirmedSet = new Set((confirmed ?? []).map((r) => r.bm_match_id));
  const stageById = new Map(stageRows.map((s) => [s.id, s]));
  const groupById = new Map((groups ?? []).map((g) => [g.id, g]));
  const roundRows = rounds ?? [];
  const roundById = new Map(roundRows.map((r) => [r.id, r]));

  const maxRoundByStage = new Map<number, number>();
  for (const r of roundRows) {
    const prev = maxRoundByStage.get(r.stage_id) ?? 0;
    if (r.number > prev) maxRoundByStage.set(r.stage_id, r.number);
  }

  const fixtureMatches: FixtureMatch[] = (matches ?? []).map((m) => {
    const op1 = parseBmOpponent(m.opponent1);
    const op2 = parseBmOpponent(m.opponent2);
    const round = roundById.get(m.round_id);
    const stage = stageById.get(m.stage_id);
    const group = groupById.get(m.group_id);
    const stageType = stage?.type ?? "single_elimination";
    return {
      id: m.id,
      number: m.number,
      status: m.status,
      roundId: m.round_id,
      roundNumber: round?.number ?? 0,
      stageId: m.stage_id,
      stageNumber: stage?.number ?? 0,
      stageName: stage?.name ?? "Stage",
      stageType,
      groupId: m.group_id,
      groupNumber: group?.number ?? 0,
      opponent1: op1,
      opponent2: op2,
      nameA: participantName(op1?.id, byParticipant),
      nameB: participantName(op2?.id, byParticipant),
      scoreA: op1?.score ?? null,
      scoreB: op2?.score ?? null,
      confirmed: confirmedSet.has(m.id),
    };
  });

  fixtureMatches.sort((a, b) => {
    if (a.stageNumber !== b.stageNumber) return a.stageNumber - b.stageNumber;
    if (a.groupNumber !== b.groupNumber) return a.groupNumber - b.groupNumber;
    if (a.roundNumber !== b.roundNumber) return a.roundNumber - b.roundNumber;
    return a.number - b.number;
  });

  const uniqueRounds = [...new Map(roundRows.map((r) => [r.id, r])).values()].sort(
    (a, b) => {
      if (a.stage_id !== b.stage_id) return a.stage_id - b.stage_id;
      return a.number - b.number;
    },
  );

  const first = stageRows[0] ?? null;
  const rrStage = stageRows.find((s) => s.type === "round_robin");
  const hasElim = stageRows.some(
    (s) => s.type === "single_elimination" || s.type === "double_elimination",
  );
  const rrMatches = rrStage
    ? fixtureMatches.filter((m) => m.stageId === rrStage.id)
    : [];
  const groupsStageComplete =
    rrMatches.length > 0 && rrMatches.every((m) => m.status === 4);
  const canGenerateKnockout =
    tournament?.format === "groups_knockout" &&
    Boolean(rrStage) &&
    !hasElim &&
    groupsStageComplete;

  return {
    stageId: first?.id ?? null,
    stageName: first?.name ?? null,
    stages: stageRows.map((s) => ({
      id: s.id,
      name: s.name,
      number: s.number,
      type: s.type,
    })),
    groups: (groups ?? []).map((g) => ({
      id: g.id,
      number: g.number,
      stageId: g.stage_id,
      label: `Grupo ${String.fromCharCode(64 + g.number)}`,
    })),
    matches: fixtureMatches,
    rounds: uniqueRounds.map((r) => {
      const stage = stageById.get(r.stage_id);
      const maxR = maxRoundByStage.get(r.stage_id) ?? r.number;
      return {
        id: r.id,
        number: r.number,
        stageId: r.stage_id,
        label: roundLabel(r.number, maxR, stage?.type ?? "single_elimination"),
      };
    }),
    canGenerateKnockout,
    groupsStageComplete,
  };
}

/**
 * Tabla de posiciones partida por grupo BM (fase RR).
 * Usa tournament_standings (confirm) filtrado por participantes del grupo.
 */
export async function loadGroupStandings(
  supabase: Db,
  tournamentId: string,
): Promise<GroupStandingBlock[]> {
  const [
    { data: stages },
    { data: groups },
    { data: matches },
    { data: teams },
    { data: standings },
  ] = await Promise.all([
    supabase
      .from("bm_stage")
      .select("id, type")
      .eq("tournament_id", tournamentId)
      .eq("type", "round_robin"),
    supabase
      .from("bm_group")
      .select("id, number, stage_id")
      .eq("tournament_id", tournamentId)
      .order("number", { ascending: true }),
    supabase
      .from("bm_match")
      .select("group_id, opponent1, opponent2")
      .eq("tournament_id", tournamentId),
    supabase
      .from("tournament_teams")
      .select("id, name, bm_participant_id")
      .eq("tournament_id", tournamentId),
    supabase
      .from("tournament_standings")
      .select(
        "team_id, played, wins, draws, losses, for_score, against_score, points",
      )
      .eq("tournament_id", tournamentId),
  ]);

  const rrStageIds = new Set((stages ?? []).map((s) => s.id));
  if (rrStageIds.size === 0) return [];

  const rrGroups = (groups ?? []).filter((g) => rrStageIds.has(g.stage_id));
  if (rrGroups.length === 0) return [];

  const participantsByGroup = new Map<number, Set<number>>();
  for (const m of matches ?? []) {
    if (!rrGroups.some((g) => g.id === m.group_id)) continue;
    const set = participantsByGroup.get(m.group_id) ?? new Set();
    const op1 = parseBmOpponent(m.opponent1);
    const op2 = parseBmOpponent(m.opponent2);
    if (op1?.id != null) set.add(op1.id);
    if (op2?.id != null) set.add(op2.id);
    participantsByGroup.set(m.group_id, set);
  }

  const teamByParticipant = new Map(
    (teams ?? [])
      .filter((t) => t.bm_participant_id != null)
      .map((t) => [t.bm_participant_id as number, t]),
  );
  const standingByTeam = new Map((standings ?? []).map((s) => [s.team_id, s]));

  return rrGroups.map((g) => {
    const pids = participantsByGroup.get(g.id) ?? new Set();
    const rows: StandingRow[] = [];
    for (const pid of pids) {
      const team = teamByParticipant.get(pid);
      if (!team) continue;
      const st = standingByTeam.get(team.id);
      rows.push({
        teamId: team.id,
        teamName: team.name,
        played: st?.played ?? 0,
        wins: st?.wins ?? 0,
        draws: st?.draws ?? 0,
        losses: st?.losses ?? 0,
        forScore: st?.for_score ?? 0,
        againstScore: st?.against_score ?? 0,
        points: st?.points ?? 0,
      });
    }
    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffA = a.forScore - a.againstScore;
      const diffB = b.forScore - b.againstScore;
      if (diffB !== diffA) return diffB - diffA;
      return b.forScore - a.forScore;
    });
    return {
      groupId: g.id,
      groupNumber: g.number,
      label:
        rrGroups.length === 1
          ? "Tabla general"
          : `Grupo ${String.fromCharCode(64 + g.number)}`,
      rows,
    };
  });
}

export async function loadMatchEvents(
  supabase: Db,
  tournamentId: string,
  bmMatchId: number,
): Promise<
  Array<{
    id: string;
    type: string;
    team_side: TeamSide;
    player_id: string | null;
    period: number | null;
    clock: number | null;
    payload: Json;
    voided_at: string | null;
    created_at: string;
    sport: string;
  }>
> {
  const { data } = await supabase
    .from("match_events")
    .select(
      "id, type, team_side, player_id, period, clock, payload, voided_at, created_at, sport",
    )
    .eq("tournament_id", tournamentId)
    .eq("bm_match_id", bmMatchId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    ...row,
    team_side: row.team_side as TeamSide,
  }));
}
