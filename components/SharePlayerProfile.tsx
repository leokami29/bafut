"use client";

import { ShareSocial } from "@/components/ShareSocial";
import {
  playerProfileShareCaption,
  playerProfileShareText,
  playerProfileUrl,
} from "@/lib/player-card-share";

type Props = {
  cardCode: string;
  displayName: string;
  sport: string;
  position?: string | null;
};

/** Compartir ficha pública `/jugador/[code]` (no la imagen de la carta). */
export function SharePlayerProfile({ cardCode, displayName, sport, position }: Props) {
  const code = cardCode.trim();
  if (!code) {
    return (
      <aside className="share-panel" aria-label="Compartir perfil">
        <p className="share-panel-label">Compartir perfil</p>
        <p className="share-hint field-help">Recargá la página para activar el link público.</p>
      </aside>
    );
  }

  const pageUrl = playerProfileUrl(code);
  const payload = { displayName, sport, position, cardCode: code };

  return (
    <ShareSocial
      pageUrl={pageUrl}
      waText={playerProfileShareText(payload)}
      caption={playerProfileShareCaption(payload)}
      nativeTitle={`Perfil de ${displayName} en BaFut`}
      panelLabel="Compartir perfil"
      ariaLabel="Compartir perfil"
      analyticsEvent="player_profile_share_clicked"
      copyPromptMessage="Copiá el link de tu perfil:"
      defaultHint="Así te ven otros jugadores: deporte, posición y cómo jugás. Sin WhatsApp público."
    />
  );
}
