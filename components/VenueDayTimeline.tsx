"use client";

import Link from "next/link";
import { formatTimeOfDay } from "@/lib/format";
import { sportLabel, formatLabel } from "@/lib/labels";
import type { VenueDayOccupancy } from "@/lib/occupancy";
import type { Format, Sport } from "@/lib/constants";

export function VenueDayTimeline({
  items,
  timeZone,
  selectedStartsAtIso,
  selectedDurationMin,
  emptyHint = "Nadie ocupó esta cancha ese día todavía.",
  compact = false,
}: {
  items: VenueDayOccupancy[];
  timeZone: string;
  selectedStartsAtIso?: string | null;
  selectedDurationMin?: number;
  emptyHint?: string;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className={`venue-day-timeline ${compact ? "is-compact" : ""}`} role="status">
        <p className="venue-day-timeline-empty">{emptyHint}</p>
      </div>
    );
  }

  const selectedStart = selectedStartsAtIso ? new Date(selectedStartsAtIso).getTime() : null;
  const selectedEnd =
    selectedStart != null && selectedDurationMin
      ? selectedStart + selectedDurationMin * 60_000
      : null;

  return (
    <div className={`venue-day-timeline ${compact ? "is-compact" : ""}`}>
      <ul className="venue-day-timeline-list" aria-label="Horas ocupadas en esta cancha">
        {items.map((item) => {
          const start = new Date(item.starts_at).getTime();
          const end = start + item.duration_min * 60_000;
          const overlaps =
            selectedStart != null &&
            selectedEnd != null &&
            start < selectedEnd &&
            end > selectedStart;
          const sport = sportLabel[item.sport as Sport] ?? item.sport;
          const format = formatLabel[item.format as Format] ?? item.format;
          const openBit =
            item.open_slot_count > 0
              ? `faltan ${item.open_slot_count}`
              : item.has_side_b
                ? "completo"
                : "equipo armado";
          return (
            <li key={item.match_id}>
              <Link
                href={`/p/${item.share_code}`}
                className={`venue-day-chip ${overlaps ? "is-overlap" : ""}`}
                aria-current={overlaps ? "true" : undefined}
              >
                <span className="venue-day-chip-time">{formatTimeOfDay(item.starts_at, timeZone)}</span>
                <span className="venue-day-chip-meta">
                  {item.duration_min} min · {sport} {format}
                </span>
                <span className="venue-day-chip-slots">{openBit}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
