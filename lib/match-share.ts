import { siteUrl } from "@/lib/env";

export function matchUrl(shareCode: string) {
  return `${siteUrl()}/p/${shareCode}`;
}

/** Imagen OG del partido (Next file route). */
export function matchOgImageUrl(shareCode: string) {
  return `${siteUrl()}/p/${shareCode}/opengraph-image`;
}

export function whatsappShareHref(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Sharer clásico de Facebook (usa OG del link). */
export function facebookShareHref(pageUrl: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}

export function matchShareText(input: {
  hole: string;
  when: string;
  venue: string;
  neighborhood?: string | null;
  price: string;
  shareCode: string;
}) {
  const hole = input.hole === "Completo" ? "Partido armado" : input.hole;
  const place = input.neighborhood
    ? `${input.venue} (${input.neighborhood})`
    : input.venue;
  return `${hole} · ${input.when} en ${place}.\n${input.price} por persona.\nPide el cupo: ${matchUrl(input.shareCode)}`;
}

/** Caption corta para Instagram / share sheet (sin saltes de línea raros). */
export function matchShareCaption(input: {
  hole: string;
  when: string;
  venue: string;
  neighborhood?: string | null;
  price: string;
  shareCode: string;
}) {
  const hole = input.hole === "Completo" ? "Partido armado" : input.hole;
  const place = input.neighborhood
    ? `${input.venue} (${input.neighborhood})`
    : input.venue;
  return `${hole} · ${input.when} en ${place}. ${input.price}/persona. ${matchUrl(input.shareCode)}`;
}
