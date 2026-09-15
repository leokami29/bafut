"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import {
  downloadPlayerCardBlob,
  downloadPlayerCardFromUrl,
  exportPlayerCardElement,
  resolvePlayerCardElement,
} from "@/lib/player-card-export";

type SharePlayerCardProps = {
  cardCode: string;
  getCardElement?: () => HTMLElement | null;
  displayName?: string;
  overall?: number;
  sport?: string;
};

function IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 4h14v-2H5v2z"
      />
    </svg>
  );
}

export function SharePlayerCard({ cardCode, getCardElement }: SharePlayerCardProps) {
  const [exporting, setExporting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const imageFallbackUrl = `/carta/${cardCode}/opengraph-image`;

  function flash(msg: string, holdMs = 3200) {
    setHint(msg);
    window.setTimeout(() => setHint(null), holdMs);
  }

  async function downloadCardImage() {
    trackEvent("player_card_share_clicked", { method: "download_image" });
    setExporting(true);
    try {
      const element = resolvePlayerCardElement(getCardElement);
      const { blob } = await exportPlayerCardElement(element, imageFallbackUrl);
      downloadPlayerCardBlob(blob);
      flash("Carta descargada.");
    } catch {
      downloadPlayerCardFromUrl(imageFallbackUrl);
      flash("Carta descargada.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <aside className="share-panel player-card-download" aria-label="Descargar carta">
      <button
        type="button"
        className="btn-flood share-btn share-btn-download"
        onClick={() => void downloadCardImage()}
        disabled={exporting}
      >
        <IconDownload className="share-btn-icon" />
        <span>{exporting ? "Generando…" : "Descargar carta"}</span>
      </button>
      {hint ? (
        <p className="share-hint" role="status">
          {hint}
        </p>
      ) : null}
    </aside>
  );
}
