"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { matchShareText, whatsappShareHref } from "@/lib/whatsapp";

export function ShareWhatsApp(props: {
  openCount: number;
  position: string;
  when: string;
  venue: string;
  neighborhood?: string | null;
  price: string;
  shareCode: string;
  sticky?: boolean;
}) {
  const text = matchShareText(props);
  const href = whatsappShareHref(text);
  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${props.shareCode}` : "";
  const [copied, setCopied] = useState(false);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    if (!props.sticky) return;
    function onScroll() {
      setShowSticky(window.scrollY > 280);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [props.sticky]);

  async function shareWhatsApp() {
    trackEvent("match_share_clicked", { method: "whatsapp" });
    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    trackEvent("match_share_clicked", { method: "copy_link" });
    const url = pageUrl || `/p/${props.shareCode}`;
    const full = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copia el link del partido:", full);
    }
  }

  const row = (
    <div className="share-row">
      <button type="button" className="btn-flood" onClick={() => void shareWhatsApp()}>
        Mandar al grupo
      </button>
      <button type="button" className="btn-ghost" onClick={() => void copyLink()}>
        {copied ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );

  return (
    <>
      {row}
      {props.sticky && showSticky ? (
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
      <a className="btn-flood" href={href} target="_blank" rel="noopener noreferrer">
        Mandar al grupo
      </a>
    </aside>
  );
}
