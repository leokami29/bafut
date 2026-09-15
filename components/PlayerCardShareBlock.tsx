"use client";

import { useRef } from "react";
import { AdjustablePlayerCard } from "@/components/AdjustablePlayerCard";
import { PlayerCard } from "@/components/PlayerCard";
import { SharePlayerCard } from "@/components/SharePlayerCard";
import { SharePlayerProfile } from "@/components/SharePlayerProfile";
import type { PlayerCardDraft } from "@/lib/player-card";

type ShareProps = {
  displayName: string;
  overall: number;
  sport: string;
  position?: string | null;
  cardCode: string;
};

export function PerfilPlayerCardShareBlock({
  draft,
  cityName,
  share,
}: {
  draft: PlayerCardDraft;
  cityName?: string | null;
  share: ShareProps;
}) {
  const exportRef = useRef<HTMLElement>(null);

  return (
    <div className="perfil-card-share">
      <AdjustablePlayerCard draft={draft} cityName={cityName} exportRef={exportRef} />
      <div className="perfil-card-actions">
        <SharePlayerCard {...share} getCardElement={() => exportRef.current} />
        <SharePlayerProfile
          cardCode={share.cardCode}
          displayName={share.displayName}
          sport={share.sport}
          position={share.position}
        />
      </div>
    </div>
  );
}

export function PublicPlayerCardShareBlock({
  draft,
  cityName,
  share,
}: {
  draft: PlayerCardDraft;
  cityName?: string | null;
  share: ShareProps;
}) {
  const exportRef = useRef<HTMLElement>(null);

  return (
    <div className="perfil-card-share">
      <PlayerCard draft={draft} cityName={cityName} enter={false} exportRef={exportRef} />
      <div className="perfil-card-actions">
        <SharePlayerCard {...share} getCardElement={() => exportRef.current} />
        <p className="field-help">
          Para compartir tu ficha con otros jugadores usá{" "}
          <a href={`/jugador/${share.cardCode}`}>tu perfil público</a>.
        </p>
      </div>
    </div>
  );
}
