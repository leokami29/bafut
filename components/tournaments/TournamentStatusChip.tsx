import type { TournamentStatus } from "@/lib/tournaments/authz";
import { tournamentStatusLabel } from "@/lib/tournaments/labels";

type Props = {
  status: TournamentStatus | string;
  className?: string;
};

export function TournamentStatusChip({ status, className = "" }: Props) {
  const label =
    tournamentStatusLabel[status as TournamentStatus] ?? String(status);
  return (
    <span
      className={`tournament-chip tournament-chip-status is-${status} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
