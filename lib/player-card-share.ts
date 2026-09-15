import { siteUrl } from "@/lib/env";

export { facebookShareHref, whatsappShareHref } from "@/lib/match-share";

export function playerCardUrl(cardCode: string) {
  return `${siteUrl()}/carta/${cardCode}`;
}

/** Imagen OG de la carta (Next file route). */
export function playerCardOgImageUrl(cardCode: string) {
  return `${siteUrl()}/carta/${cardCode}/opengraph-image`;
}

export function playerCardShareText(input: {
  displayName: string;
  overall: number;
  sport: string;
  cardCode: string;
}) {
  return `Mi carta BaFut — ${input.displayName} · OVR ${input.overall} · ${input.sport}\n${playerCardUrl(input.cardCode)}`;
}

/** Caption corta para Instagram / share sheet (sin saltos de línea). */
export function playerCardShareCaption(input: {
  displayName: string;
  overall: number;
  sport: string;
  cardCode: string;
}) {
  return `Mi carta BaFut — ${input.displayName} · OVR ${input.overall} · ${input.sport}. ${playerCardUrl(input.cardCode)}`;
}
