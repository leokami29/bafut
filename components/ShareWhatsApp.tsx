"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { matchShareText, matchUrl, whatsappShareHref } from "@/lib/whatsapp";

export function ShareWhatsApp(props: {
  openCount: number;
  position: string;
  when: string;
  venue: string;
  neighborhood?: string | null;
  price: string;
  shareCode: string;
  sticky?: boolean;
  /** When true, WhatsApp CTA lives elsewhere (e.g. HostShareBanner). Only show Copiar link. */
  hidePrimary?: boolean;
}) {
  const text = matchShareText(props);
  const href = whatsappShareHref(text);
  const pageUrl = matchUrl(props.shareCode);
  const [copied, setCopied] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const showPrimary = !props.hidePrimary;
  const enableSticky = Boolean(props.sticky && showPrimary);

  useEffect(() => {
    if (!enableSticky) return;
    function onScroll() {
      setShowSticky(window.scrollY > 280);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enableSticky]);

  async function shareWhatsApp() {
    trackEvent("match_share_clicked", { method: "whatsapp" });
    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    trackEvent("match_share_clicked", { method: "copy_link" });
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copia el link del partido:", pageUrl);
    }
  }

  const row = (
    <div className="share-row">
      {showPrimary ? (
        <button type="button" className="btn-flood" onClick={() => void shareWhatsApp()}>
          Mandar al grupo
        </button>
      ) : null}
      <button type="button" className="btn-ghost" onClick={() => void copyLink()}>
        {copied ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );

  return (
    <>
      {row}
      {enableSticky && showSticky ? (
        <div className="share-sticky" role="region" aria-label="Compartir partido">
          <button type="button" className="btn-flood" onClick={() => void shareWhatsApp()}>
            Mandar al grupo
          </button>
        </div>
      ) : null}
    </>
  );
}

export function HostShareBanner(props: {
  openCount: number;
  position: string;
  when: string;
  venue: string;
  neighborhood?: string | null;
  price: string;
  shareCode: string;
}) {
  const href = whatsappShareHref(matchShareText(props));

  return (
    <aside className="host-banner" aria-label="Comparte tu hueco">
      <p className="host-banner-text">
        <strong>Ya quedó publicado.</strong> Mándalo al grupo de WhatsApp para que entren.
      </p>
      <a
        className="btn-flood"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("match_share_clicked", { method: "whatsapp" })}
      >
        Mandar al grupo
      </a>
    </aside>
  );
}
