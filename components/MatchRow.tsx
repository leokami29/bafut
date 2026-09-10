import Link from "next/link";
import { formatMoney, formatWhen, openSlotsPhrase } from "@/lib/format";
import { formatLabel, sportLabel } from "@/lib/labels";
import type { Format, Sport } from "@/lib/constants";
import {
  isChallengeMatch,
  matchDisplayStatus,
  openBenchSlotCount,
  openSideBSlotCount,
  openSlotCount,
  openSlotPositions,
  type MatchDetail,
} from "@/lib/types";

export function MatchRow({ match }: { match: MatchDetail }) {
  const open = openSlotCount(match);
  const isChallenge = isChallengeMatch(match);
  const displayStatus = matchDisplayStatus(match);
  const when = formatWhen(match.starts_at, match.cities.timezone);
  const sport = sportLabel[match.sport as Sport] ?? match.sport;
  const format = formatLabel[match.format as Format] ?? match.format;
  const price = formatMoney(match.cost_per_person, match.currency);
  const hostName = match.profiles?.display_name?.trim() || "Host";

  let phrase = openSlotsPhrase(openSlotPositions(match));
  let badgeTag: string | null = null;

  if (isChallenge) {
    const sideBOpen = openSideBSlotCount(match);
    phrase = match.host_team_name
      ? `⚔️ ${match.host_team_name} busca rival`
      : "⚔️ Se busca rival completo";
    badgeTag = sideBOpen > 0 ? `Rival ${sideBOpen} cupos` : "Reto pactado";
  } else if (displayStatus === "bench_only") {
    const benchOpen = openBenchSlotCount(match);
    phrase = "🔄 Cupos en rotación / banca";
    badgeTag = `${benchOpen} en banca`;
  }

  return (
    <Link href={`/p/${match.share_code}`} className={`match-row ${isChallenge ? "is-challenge-row" : ""}`}>
      <span className="match-row-when">
        <time dateTime={match.starts_at}>{when}</time>
        <span className="match-row-sport">{sport}</span>
      </span>
      <span className="match-row-place">
        <strong>{match.venues.name}</strong>
        <span>{match.venues.neighborhood}</span>
      </span>
      <span className="match-row-hole">
        {phrase}
        {badgeTag ? (
          <span className={`slot-badge ${isChallenge ? "is-challenge-badge" : "is-bench-badge"}`}>
            {badgeTag}
          </span>
        ) : open > 0 ? (
          <span className="slot-badge">{open}</span>
        ) : null}
      </span>
      <span className="match-row-meta">
        {format} · {price}
        <span className="match-row-host"> · organiza {hostName}</span>
      </span>
    </Link>
  );
}

