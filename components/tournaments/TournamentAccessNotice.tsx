import Link from "next/link";
import {
  venueTournamentsGateCopy,
  type VenueTournamentsGateReason,
} from "@/lib/tournaments/authz";

type Props = {
  reason: Exclude<VenueTournamentsGateReason, "ok">;
  /** Base del panel admin, p.ej. `/canchas/foo/admin` — habilita CTA Premium. */
  adminBase?: string;
  /** Mostrar link a Mesa Flags (solo admins billing/super de plataforma). */
  showFlagsLink?: boolean;
};

/** Paywall / bloqueo claro: flag off, sin premium, o sin rol. */
export function TournamentAccessNotice({
  reason,
  adminBase,
  showFlagsLink = false,
}: Props) {
  const copy = venueTournamentsGateCopy(reason);

  return (
    <div className="tournament-access-notice" role="status">
      <h2 className="subhead">{copy.title}</h2>
      <p className="lede">{copy.body}</p>
      <div className="tournament-access-actions">
        {copy.ctaPremium && adminBase ? (
          <p>
            <Link href={`${adminBase}?tab=premium`} className="btn-flood">
              Ver plan Premium
            </Link>
          </p>
        ) : null}
        {copy.ctaFlags && showFlagsLink ? (
          <p>
            <Link href="/admin/flags" className="btn-flood">
              Activar en Mesa → Flags
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
