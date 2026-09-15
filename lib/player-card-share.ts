import { siteUrl } from "@/lib/env";

export { facebookShareHref, whatsappShareHref } from "@/lib/match-share";

export function playerCardUrl(cardCode: string) {
  return `${siteUrl()}/carta/${cardCode}`;
}

/** Perfil público (ficha dinámica por deporte / posición). */
export function playerProfileUrl(cardCode: string) {
  return `${siteUrl()}/jugador/${cardCode}`;
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

export function playerProfileShareText(input: {
  displayName: string;
  sport: string;
  position?: string | null;
  cardCode: string;
}) {
  const role = input.position ? ` · ${input.position}` : "";
  return `Mi perfil BaFut — ${input.displayName}${role} · ${input.sport}\n${playerProfileUrl(input.cardCode)}`;
}

export function playerProfileShareCaption(input: {
  displayName: string;
  sport: string;
  position?: string | null;
  cardCode: string;
}) {
  const role = input.position ? ` · ${input.position}` : "";
  return `Mi perfil BaFut — ${input.displayName}${role} · ${input.sport}. ${playerProfileUrl(input.cardCode)}`;
}
