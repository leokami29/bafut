import Link from "next/link";
import { formatMoney, formatWhen, openSlotsPhrase } from "@/lib/format";
import { formatLabel, positionLabel, sportLabel } from "@/lib/labels";
import type { Format, Position, Sport } from "@/lib/constants";
import { openSlotCount, slotIsOpen, type MatchDetail } from "@/lib/types";

export function MatchRow({ match }: { match: MatchDetail }) {
  const open = openSlotCount(match);
  const dominant =
    match.match_slots.find(slotIsOpen)?.position ??
    match.match_slots[0]?.position ??
    "any";
  const phrase = openSlotsPhrase(open, positionLabel[dominant as Position] ?? "Cualquiera");
  const when = formatWhen(match.starts_at, match.cities.timezone);
  const sport = sportLabel[match.sport as Sport] ?? match.sport;
  const format = formatLabel[match.format as Format] ?? match.format;
  const price = formatMoney(match.cost_per_person, match.currency);
  const hostName = match.profiles?.display_name?.trim() || "Host";

  const ariaLabel = `${when}. ${match.venues.name}, ${match.venues.neighborhood}. ${phrase}. ${sport}, ${format}, ${price}. Organiza ${hostName}.`;

  return (
    <Link href={`/p/${match.share_code}`} className="match-row" aria-label={ariaLabel}>
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
        {open > 0 ? <span className="slot-badge">{open}</span> : null}
      </span>
      <span className="match-row-meta">
        {format} · {price}
        <span className="match-row-host"> · organiza {hostName}</span>
      </span>
    </Link>
  );
}
