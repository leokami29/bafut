import type { Metadata } from "next";
import { siteUrl } from "@/lib/env";

export const SITE_NAME = "BaFut";
export const TITLE_TEMPLATE = "%s · BaFut";
export const DEFAULT_OG_LOCALE = "es_CO";

/** ~55 chars. Default document title (no template suffix). */
export const DEFAULT_TITLE = "BaFut · pateadas y huecos en Barranquilla";

/** ~155 chars. Promesa + ciudad + sin reserva. */
export const DEFAULT_DESCRIPTION =
  "Pateadas y huecos abiertos en canchas de Barranquilla. Entrá a la lista, completá el equipo y concentrá la demanda: BaFut no reserva, junta a quien falta.";

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

export const RADAR_TITLE = "Radar de pateadas hoy en Barranquilla";
export const RADAR_DESCRIPTION =
  "Huecos abiertos ahora, hoy o de noche en Barranquilla. Entrá a la lista, completá el equipo y armá la pateada.";

export const DIRECTORY_TITLE = "Canchas en Barranquilla · dónde se arma";
export const DIRECTORY_DESCRIPTION =
  "Directorio de canchas en Barranquilla con demanda visible: dónde hay huecos abiertos para armar la pateada.";

export const SUPPORT_TITLE = "Apoyar BaFut";
export const SUPPORT_DESCRIPTION =
  "Invita un café para hosting, mapa y curar canchas en BaFut. La app no cobra el partido: junta a quien falta.";

export function venuePageTitle(name: string, neighborhood: string | null | undefined) {
  const place = neighborhood?.trim() ? `${neighborhood.trim()}, Barranquilla` : "Barranquilla";
  return `${name} · ${place}`;
}

export function matchIsIndexable(status: string, startsAtIso: string) {
  return status !== "cancelled" && Date.parse(startsAtIso) > Date.now();
}
