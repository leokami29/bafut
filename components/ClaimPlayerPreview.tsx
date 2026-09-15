import Link from "next/link";
import type { Format, Level, Sport } from "@/lib/constants";
import { formatLabel, levelLabel, sportLabel } from "@/lib/labels";
import { isMismatch } from "@/lib/level-trust";
import { isPublicPlayerCard } from "@/lib/profile";
import { profileAvatarPublicUrl } from "@/lib/profile-photos";
import type { ClaimPreviewProfile } from "@/lib/types";

export type ClaimPlayerPreviewProps = {
  profile: ClaimPreviewProfile | null;
  /** Nivel pedido por el hueco (`match_slots.level`). */
  slotLevel: string | null | undefined;
  /** Nivel declarado en el claim (`slot_claims.declared_level`). */
  declaredLevel?: string | null;
  className?: string;
};

function sportFormatLine(profile: ClaimPreviewProfile): string | null {
  const sport = profile.preferred_sport
    ? (sportLabel[profile.preferred_sport as Sport] ?? profile.preferred_sport)
    : null;
  const format = profile.preferred_format
    ? (formatLabel[profile.preferred_format as Format] ?? profile.preferred_format)
    : null;
  if (sport && format) return `${sport} · ${format}`;
  if (sport) return sport;
  if (format) return format;
  return null;
}

/**
 * Mini-ficha del postulante para detalle de partido.
 * No monta PlayerCard ni expone WhatsApp — solo preview + links públicos.
 */
export function ClaimPlayerPreview({
  profile,
  slotLevel,
  declaredLevel = null,
  className,
}: ClaimPlayerPreviewProps) {
  const name = profile?.display_name?.trim() || "Jugador";
  const avatarPath = profile?.avatar_path?.trim() || null;
  const sportLine = profile ? sportFormatLine(profile) : null;
  const mismatch = isMismatch(slotLevel, declaredLevel);
  const slotLabel = slotLevel ? (levelLabel[slotLevel as Level] ?? slotLevel) : null;
  const declaredLabel = declaredLevel
    ? (levelLabel[declaredLevel as Level] ?? declaredLevel)
    : null;
  const publicCard =
    profile != null &&
    isPublicPlayerCard({
      display_name: profile.display_name,
      avatar_path: profile.avatar_path,
      preferred_sport: profile.preferred_sport,
      preferred_format: profile.preferred_format,
      preferred_position: profile.preferred_position,
      card_share_code: profile.card_share_code,
      terms_accepted_at: profile.terms_accepted_at,
    });
  const cardCode = profile?.card_share_code?.trim() ?? "";

  return (
    <div className={["claim-player-preview", className].filter(Boolean).join(" ")}>
      <div className="claim-player-preview-main">
        {avatarPath ? (
          <img
            className="claim-player-preview-avatar"
            src={profileAvatarPublicUrl(avatarPath)}
            alt=""
          />
        ) : (
          <span className="claim-player-preview-avatar is-empty" aria-hidden />
        )}
        <div className="claim-player-preview-copy">
          <p className="claim-player-preview-name">{name}</p>
          {sportLine ? <p className="claim-player-preview-meta">{sportLine}</p> : null}
          {declaredLabel || slotLabel ? (
            <p
              className={[
                "claim-player-preview-level",
                mismatch ? "is-mismatch" : null,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {declaredLabel && slotLabel
                ? mismatch
                  ? `Declara ${declaredLabel} · hueco ${slotLabel}`
                  : `Nivel ${declaredLabel}`
                : declaredLabel
                  ? `Declara ${declaredLabel}`
                  : slotLabel
                    ? `Hueco ${slotLabel}`
                    : null}
            </p>
          ) : null}
        </div>
      </div>
      {publicCard && cardCode ? (
        <p className="claim-player-preview-links">
          <Link href={`/jugador/${cardCode}`}>Perfil</Link>
          <span aria-hidden>·</span>
          <Link href={`/carta/${cardCode}`}>Carta</Link>
        </p>
      ) : (
        <p className="claim-player-preview-incomplete">Ficha incompleta</p>
      )}
    </div>
  );
}
