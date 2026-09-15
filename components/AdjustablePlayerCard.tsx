"use client";

import { useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { saveProfileAvatarFocusAction } from "@/app/perfil/actions";
import { PlayerCard } from "@/components/PlayerCard";
import { PlayerCardZoomControl } from "@/components/PlayerCardZoomControl";
import { clampAvatarFocus, DEFAULT_AVATAR_FOCUS, type AvatarFocus } from "@/lib/avatar-focus";
import type { PlayerCardDraft } from "@/lib/player-card";

function focusFormData(focus: AvatarFocus) {
  const data = new FormData();
  data.set("avatar_focus_x", String(focus.x));
  data.set("avatar_focus_y", String(focus.y));
  data.set("avatar_zoom", String(focus.zoom));
  return data;
}

export function AdjustablePlayerCard({
  draft,
  cityName,
  exportRef,
}: {
  draft: PlayerCardDraft;
  cityName?: string | null;
  exportRef?: RefObject<HTMLElement | null>;
}) {
  const [focus, setFocus] = useState(clampAvatarFocus(draft.avatarFocus ?? DEFAULT_AVATAR_FOCUS));
  const [cropSaved, setCropSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const lastSaved = useRef(focus);
  const focusRef = useRef(focus);
  focusRef.current = focus;

  useEffect(() => {
    if (!cropSaved) return;
    const timer = window.setTimeout(() => setCropSaved(false), 220);
    return () => window.clearTimeout(timer);
  }, [cropSaved]);

  function commit(next: AvatarFocus) {
    const clamped = clampAvatarFocus(next);
    setFocus(clamped);
    if (
      clamped.x === lastSaved.current.x &&
      clamped.y === lastSaved.current.y &&
      clamped.zoom === lastSaved.current.zoom
    ) {
      return;
    }
    lastSaved.current = clamped;
    setCropSaved(true);
    startTransition(async () => {
      await saveProfileAvatarFocusAction(focusFormData(clamped));
    });
  }

  return (
    <div className="player-card-stack">
      <PlayerCard
        draft={{ ...draft, avatarFocus: focus }}
        cityName={cityName}
        interactive={Boolean(draft.avatarUrl)}
        onFocusChange={setFocus}
        onFocusCommit={commit}
        cropSaved={cropSaved}
        exportRef={exportRef}
      />
      {draft.avatarUrl ? (
        <PlayerCardZoomControl
          focus={focus}
          onChange={setFocus}
          onCommit={() => commit(focusRef.current)}
          pending={pending}
        />
      ) : (
        <p className="ficha-legend">Subí una foto para poder centrarla en la carta.</p>
      )}
    </div>
  );
}
