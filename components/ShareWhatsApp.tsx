"use client";

import { ShareSocial } from "@/components/ShareSocial";
import { matchShareCaption, matchShareText, matchUrl } from "@/lib/match-share";

type ShareProps = {
  hole: string;
  when: string;
  venue: string;
  neighborhood?: string | null;
  price: string;
  shareCode: string;
};

/**
 * Un solo bloque de compartir (host o visitante).
 * Antes había banner + panel duplicados; ahora es una sola superficie.
 */
export function ShareWhatsApp(
  props: ShareProps & {
    sticky?: boolean;
    /** Host con huecos abiertos: mensaje “Ya quedó publicado”. */
    highlight?: boolean;
  },
) {
  const text = matchShareText(props);
  const caption = matchShareCaption(props);
  const pageUrl = matchUrl(props.shareCode);

  return (
    <ShareSocial
      pageUrl={pageUrl}
      waText={text}
      caption={caption}
      nativeTitle="Hueco en BaFut"
      panelLabel="Compartir hueco"
      ariaLabel="Compartir hueco"
      analyticsEvent="match_share_clicked"
      highlight={props.highlight}
      highlightText={
        props.highlight ? (
          <p className="host-banner-text">
            <strong>Ya quedó publicado.</strong> Compartilo para que entren.
          </p>
        ) : undefined
      }
      sticky={props.sticky}
      copyPromptMessage="Copia el link del partido:"
    />
  );
}

/** @deprecated Usá ShareWhatsApp con highlight — se mantiene por imports viejos. */
export function HostShareBanner(props: ShareProps) {
  return <ShareWhatsApp {...props} highlight sticky />;
}
