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

/** Solo descarga de la carta (PNG). El perfil se comparte aparte. */
export function SharePlayerCard({ cardCode, getCardElement }: SharePlayerCardProps) {
  const [exporting, setExporting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const code = cardCode.trim();
  const imageFallbackUrl = code ? `/carta/${code}/opengraph-image` : "";

  async function downloadCardImage() {
    if (!code) return;
    trackEvent("player_card_share_clicked", { method: "download_image" });
    setExporting(true);
    setHint(null);
    try {
      const element = resolvePlayerCardElement(getCardElement);
      const { blob } = await exportPlayerCardElement(element, imageFallbackUrl);
      downloadPlayerCardBlob(blob);
      setHint("Carta descargada.");
    } catch {
      try {
        // Forzar descarga por blob (más fiable que <a download> a la ruta OG).
        const { blob } = await exportPlayerCardElement(null, imageFallbackUrl);
        downloadPlayerCardBlob(blob);
        setHint("Carta descargada.");
      } catch {
        downloadPlayerCardFromUrl(imageFallbackUrl);
        setHint("Si no bajó sola, abrí la imagen y guardala.");
      }
    } finally {
      setExporting(false);
      window.setTimeout(() => setHint(null), 4200);
    }
  }

  return (
    <aside className="share-panel player-card-download" aria-label="Descargar carta">
      <p className="share-panel-label">Tu carta</p>
      <button
        type="button"
        className="btn-flood share-btn share-btn-download"
        onClick={() => void downloadCardImage()}
        disabled={exporting || !code}
      >
        <IconDownload className="share-btn-icon" />
        <span>{exporting ? "Generando…" : "Descargar carta"}</span>
      </button>
      <p className="share-hint field-help">
        {hint ??
          (code
            ? "Imagen para historias o el chat. Para que te vean en BaFut, compartí tu perfil."
            : "Recargá la página para activar la descarga.")}
      </p>
    </aside>
  );
}
