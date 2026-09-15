"use client";

import { ShareSocial } from "@/components/ShareSocial";
import {
  playerCardShareCaption,
  playerCardShareText,
  playerCardUrl,
} from "@/lib/player-card-share";

type SharePlayerCardProps = {
  displayName: string;
  overall: number;
  sport: string;
  cardCode: string;
  getCardElement?: () => HTMLElement | null;
};

export function SharePlayerCard({
  displayName,
  overall,
  sport,
  cardCode,
  getCardElement,
}: SharePlayerCardProps) {
  const shareInput = { displayName, overall, sport, cardCode };
  const pageUrl = playerCardUrl(cardCode);

  return (
    <ShareSocial
      pageUrl={pageUrl}
      waText={playerCardShareText(shareInput)}
      caption={playerCardShareCaption(shareInput)}
      nativeTitle="Mi carta BaFut"
      panelLabel="Compartir carta"
      ariaLabel="Compartir carta del jugador"
      analyticsEvent="player_card_share_clicked"
      copyPromptMessage="Copiá el link de tu carta:"
      getCardElement={getCardElement}
      defaultHint={
        getCardElement
          ? "Instagram: tocá el botón para compartir la imagen. En desktop, descargala y subila a historia o publicación."
          : undefined
      }
      igImageShareHint="Abrí Instagram → historia o publicación → elegí la imagen."
      igImageDownloadHint="Imagen descargada. Abrí Instagram → historia o publicación → elegí la imagen."
      igImageShareSheetHint="Elegí Instagram (u otra app) para publicar la carta."
      cardExportErrorHint="No pudimos generar la imagen. Podés descargar de nuevo o copiar el link."
    />
  );
}
