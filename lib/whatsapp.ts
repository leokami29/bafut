import { siteUrl } from "@/lib/env";

export function matchUrl(shareCode: string) {
  return `${siteUrl()}/p/${shareCode}`;
}

export function whatsappShareHref(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function matchShareText(input: {
  openCount: number;
  position: string;
  when: string;
  venue: string;
  neighborhood?: string | null;
  price: string;
  shareCode: string;
}) {
  const hole =
    input.openCount <= 0
      ? "Partido armado"
      : input.openCount === 1
        ? `Falta 1 ${input.position.toLowerCase()}`
        : `Faltan ${input.openCount}`;
  const place = input.neighborhood
    ? `${input.venue} (${input.neighborhood})`
    : input.venue;
  return `${hole} · ${input.when} en ${place}.\n${input.price} por persona.\nPide el cupo: ${matchUrl(input.shareCode)}`;
}
