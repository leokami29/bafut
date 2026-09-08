"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ScoreEvolutionPoint,
  TeamScoreBar,
} from "@/lib/tournaments/stats-load";
import type { BracketScoreKind } from "@/lib/tournaments/sports";

type Props = {
  teamBars: TeamScoreBar[];
  forLabel: string;
  againstLabel: string;
  scoreKind: BracketScoreKind;
  evolution: {
    teamNames: Record<string, string>;
    points: ScoreEvolutionPoint[];
  };
};

const CHART_COLORS = [
  "#0c6b4c",
  "#c42a16",
  "#073828",
  "#8a6d1d",
  "#2a6f8f",
  "#5c4a8a",
  "#3d6b3a",
  "#a14a2a",
];

function forAxisLabel(kind: BracketScoreKind): string {
  switch (kind) {
    case "goals":
      return "Goles a favor";
    case "points":
      return "Puntos a favor";
    case "sets":
      return "Sets a favor";
    default:
      return "A favor";
  }
}

function truncate(name: string, max = 10): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

export function TournamentStatsCharts({
  teamBars,
  forLabel,
  againstLabel,
  scoreKind,
  evolution,
}: Props) {
  if (teamBars.length === 0 && evolution.points.length === 0) {
    return (
      <p className="field-help">
        Los gráficos aparecen cuando hay partidos confirmados.
      </p>
    );
  }

  const barData = teamBars.map((t) => ({
    name: truncate(t.teamName),
    fullName: t.teamName,
    forScore: t.forScore,
    againstScore: t.againstScore,
    points: t.points,
  }));

  const teamIds = Object.keys(evolution.teamNames);
  const lineData = evolution.points.map((p) => {
    const row: Record<string, string | number> = {
      label: p.label,
      matchIndex: p.matchIndex,
    };
    for (const id of teamIds) {
      row[id] = p.byTeam[id] ?? 0;
    }
    return row;
  });

  const showLines =
    evolution.points.length >= 2 && teamIds.length > 0 && teamIds.length <= 8;

  return (
    <div className="tournament-charts">
      {barData.length > 0 ? (
        <div className="tournament-chart-block">
          <h3 className="tournament-chart-title">
            {forAxisLabel(scoreKind)} por equipo
          </h3>
          <div className="tournament-chart-frame" role="img" aria-label={`Barras de ${forLabel} y ${againstLabel} por equipo`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,35,28,0.12)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                <Tooltip
                  formatter={(value, name) => {
                    const n = typeof value === "number" ? value : Number(value);
                    const label =
                      name === "forScore"
                        ? forLabel
                        : name === "againstScore"
                          ? againstLabel
                          : String(name);
                    return [n, label];
                  }}
                  labelFormatter={(_, payload) => {
                    const full = payload?.[0]?.payload?.fullName;
                    return typeof full === "string" ? full : "";
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === "forScore"
                      ? forLabel
                      : value === "againstScore"
                        ? againstLabel
                        : value
                  }
                />
                <Bar dataKey="forScore" fill="#0c6b4c" radius={[2, 2, 0, 0]} />
                <Bar dataKey="againstScore" fill="#c42a16" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {showLines ? (
        <div className="tournament-chart-block">
          <h3 className="tournament-chart-title">
            Evolución acumulada ({forLabel})
          </h3>
          <div
            className="tournament-chart-frame"
            role="img"
            aria-label={`Línea de ${forLabel} acumulados por partido confirmado`}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,35,28,0.12)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                <Tooltip
                  labelFormatter={(label) => `Partido ${label}`}
                  formatter={(value, name) => {
                    const n = typeof value === "number" ? value : Number(value);
                    const team =
                      typeof name === "string"
                        ? (evolution.teamNames[name] ?? name)
                        : String(name);
                    return [n, team];
                  }}
                />
                <Legend
                  formatter={(value) =>
                    typeof value === "string"
                      ? truncate(evolution.teamNames[value] ?? value, 14)
                      : String(value)
                  }
                />
                {teamIds.map((id, i) => (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={id}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : evolution.points.length === 1 ? (
        <p className="field-help">
          Confirmá al menos 2 partidos para ver la evolución acumulada.
        </p>
      ) : null}
    </div>
  );
}
