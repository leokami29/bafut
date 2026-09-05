import type { Metadata } from "next";
import { siteUrl } from "@/lib/env";

export const SITE_NAME = "BaFut";
export const TITLE_TEMPLATE = "%s · BaFut";
export const DEFAULT_OG_LOCALE = "es_CO";

/** ~55–60 chars. Default document title (no template suffix). */
export const DEFAULT_TITLE = "BaFut · pateadas y canchas sintéticas en Barranquilla";

/** ~155–160 chars. Promesa + ciudad + intención local + sin reserva. */
export const DEFAULT_DESCRIPTION =
  "Partidos de fútbol 5 y 7, pateadas y huecos abiertos en canchas sintéticas de Barranquilla. Entrá a la lista o publicá el cupo que te falta: BaFut no reserva, junta a quien falta.";

export function absoluteUrl(path = "/") {
  const base = siteUrl().replace(/\/$/, "");
  const normalized = path.trim() || "/";
  if (normalized === "/") return base;
  return `${base}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}

/** Leaf title for `title.template` (`%s · BaFut`). Keep the leaf ~40 chars. */
export function leafTitle(title: string) {
  return title.trim();
}

/** Full title when metadata is not under the layout template (OG, Twitter, root default). */
export function fullTitle(leaf: string) {
  const trimmed = leaf.trim();
  if (!trimmed || trimmed === SITE_NAME) return DEFAULT_TITLE;
  if (trimmed.includes(SITE_NAME)) return trimmed;
  return `${trimmed} · ${SITE_NAME}`;
}

export function defaultOg(overrides?: {
  title?: string;
  description?: string;
  url?: string;
  images?: NonNullable<Metadata["openGraph"]>["images"];
}): NonNullable<Metadata["openGraph"]> {
  return {
    type: "website",
    locale: DEFAULT_OG_LOCALE,
    siteName: SITE_NAME,
    title: overrides?.title ?? DEFAULT_TITLE,
    description: overrides?.description ?? DEFAULT_DESCRIPTION,
    url: overrides?.url ?? absoluteUrl("/"),
    images:
      overrides?.images ??
      ([
        {
          url: absoluteUrl("/icon.svg"),
          alt: SITE_NAME,
        },
      ] satisfies NonNullable<Metadata["openGraph"]>["images"]),
  };
}

export function defaultTwitter(overrides?: {
  title?: string;
  description?: string;
}): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title: overrides?.title ?? DEFAULT_TITLE,
    description: overrides?.description ?? DEFAULT_DESCRIPTION,
  };
}

export const robotsIndex = { index: true, follow: true } as const;
export const robotsNoIndex = { index: false, follow: true } as const;
export const robotsNoIndexNoFollow = { index: false, follow: false } as const;

export const RADAR_TITLE = "Partidos y huecos abiertos en Barranquilla";
export const RADAR_DESCRIPTION =
  "Radar de pateadas hoy en Barranquilla: partidos de fútbol 5 y 7 con cupos en cancha sintética. Entrá a la lista, completá el equipo o publicá tu hueco.";

export const DIRECTORY_TITLE = "Canchas sintéticas en Barranquilla";
export const DIRECTORY_DESCRIPTION =
  "Directorio de canchas sintéticas y de fútbol 5/7 en Barranquilla. Mirá dónde hay huecos abiertos para armar la pateada: BaFut concentra la demanda, no reserva.";

export const SUPPORT_TITLE = "Apoyar BaFut";
export const SUPPORT_DESCRIPTION =
  "Invita un café para hosting, mapa y curar canchas en BaFut. La app no cobra el partido: junta a quien falta.";

export function venuePageTitle(name: string, neighborhood: string | null | undefined) {
  const place = neighborhood?.trim() ? `${neighborhood.trim()}, Barranquilla` : "Barranquilla";
  return `${name} · cancha en ${place}`;
}

export function venuePageDescription(input: {
  name: string;
  neighborhood: string | null | undefined;
  cityName: string;
  surface?: string | null;
  description?: string | null;
}) {
  const custom = input.description?.trim();
  if (custom) return custom.slice(0, 160);

  const place = input.neighborhood?.trim()
    ? `${input.neighborhood.trim()}, ${input.cityName}`
    : input.cityName;
  const surface =
    input.surface === "sintetica"
      ? "cancha sintética"
      : input.surface === "grama" || input.surface === "grass"
        ? "cancha de grama"
        : "cancha";

  return `${input.name}: ${surface} en ${place}. Huecos y partidos de fútbol 5/7 abiertos aquí — publicá o sumate en BaFut.`;
}

export function matchPageDescription(input: {
  when: string;
  venueName: string;
  place: string;
  sport: string;
  hole: string;
}) {
  return `${input.when} · ${input.hole} en ${input.venueName} (${input.place}). Partido de ${input.sport} con cupos en BaFut.`;
}

export function matchIsIndexable(status: string, startsAtIso: string) {
  return status !== "cancelled" && Date.parse(startsAtIso) > Date.now();
}
