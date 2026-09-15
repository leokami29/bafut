"use client";

import { AVATAR_ZOOM_MAX, AVATAR_ZOOM_MIN, clampAvatarFocus, type AvatarFocus } from "@/lib/avatar-focus";

export function PlayerCardZoomControl({
  focus,
  onChange,
  onCommit,
  pending = false,
  helpText = "Arrastrá la foto en la carta y acercá hasta que quede la cara.",
}: {
  focus: AvatarFocus;
  onChange: (focus: AvatarFocus) => void;
  onCommit: (focus: AvatarFocus) => void;
  pending?: boolean;
  helpText?: string;
}) {
  return (
    <label className="ficha-zoom">
      Acercar
      <input
        type="range"
        min={AVATAR_ZOOM_MIN}
        max={AVATAR_ZOOM_MAX}
        step={0.05}
        value={focus.zoom}
        aria-valuetext={`${Math.round(focus.zoom * 100)} por ciento`}
        onChange={(event) => {
          onChange(clampAvatarFocus({ ...focus, zoom: Number(event.target.value) }));
        }}
        onPointerUp={() => onCommit(focus)}
        onKeyUp={() => onCommit(focus)}
      />
      <span className="field-help">{pending ? "Guardando recorte…" : helpText}</span>
    </label>
  );
}
