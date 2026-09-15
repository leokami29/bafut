"use client";

import { useRef } from "react";
import { AdjustablePlayerCard } from "@/components/AdjustablePlayerCard";
import { PlayerCard } from "@/components/PlayerCard";
import { SharePlayerCard } from "@/components/SharePlayerCard";
import type { PlayerCardDraft } from "@/lib/player-card";

type ShareProps = {
  displayName: string;
  overall: number;
  sport: string;
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
    <>
      <AdjustablePlayerCard draft={draft} cityName={cityName} exportRef={exportRef} />
      <SharePlayerCard {...share} getCardElement={() => exportRef.current} />
    </>
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
    <>
      <PlayerCard draft={draft} cityName={cityName} enter={false} exportRef={exportRef} />
      <SharePlayerCard {...share} getCardElement={() => exportRef.current} />
    </>
  );
}
