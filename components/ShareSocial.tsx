"use client";

import { useEffect, useState, type ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";
import { facebookShareHref, whatsappShareHref } from "@/lib/match-share";

type ShareMethod = "whatsapp" | "facebook" | "instagram" | "native" | "copy_link";

export type ShareSocialProps = {
  pageUrl: string;
  waText: string;
  caption: string;
  nativeTitle: string;
  panelLabel: string;
  ariaLabel: string;
  analyticsEvent: string;
  highlight?: boolean;
  highlightText?: ReactNode;
  sticky?: boolean;
  copyPromptMessage?: string;
  defaultHint?: string;
  igCopiedHint?: string;
};

async function copyText(value: string, promptMessage: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    window.prompt(promptMessage, value);
    return false;
  }
}

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2c-5.46 0-9.91 4.43-9.91 9.9 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9C21.94 6.43 17.5 2 12.04 2zm5.79 14.08c-.24.68-1.4 1.25-1.93 1.33-.5.07-1.13.1-1.82-.11-.42-.14-.96-.31-1.65-.61-2.9-1.26-4.79-4.2-4.93-4.39-.14-.2-1.16-1.54-1.16-2.94s.73-2.08 1-2.37c.24-.27.53-.34.71-.34h.51c.16 0 .38-.06.59.45.24.58.8 2.01.87 2.16.07.14.12.31.02.5-.1.2-.14.31-.29.48-.14.16-.3.36-.43.49-.14.14-.29.29-.12.56.16.27.73 1.2 1.56 1.94 1.08.96 1.98 1.26 2.26 1.4.27.14.43.12.59-.07.16-.2.68-.79.86-1.06.18-.27.36-.22.61-.14.24.09 1.55.73 1.81.86.27.14.44.2.51.31.07.12.07.68-.17 1.36z"
      />
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22 12.07C22 6.48 17.52 2 11.93 2S2 6.48 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.9h-2.34v7.03C18.34 21.25 22 17.09 22 12.07z"
      />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      />
    </svg>
  );
}

function IconShare({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.99 2.99 0 0 0 18 7.91c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81A2.99 2.99 0 0 0 6 9.09c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.15c-.05.21-.08.43-.08.66 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"
      />
    </svg>
  );
}

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

function IconLink({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.9 12a5 5 0 0 1 5-5h3v2h-3a3 3 0 0 0 0 6h3v2h-3a5 5 0 0 1-5-5zm5-1h6v2h-6v-2zm5-4h3a5 5 0 0 1 0 10h-3v-2h3a3 3 0 0 0 0-6h-3V7z"
      />
    </svg>
  );
}

function ShareBtn({
  className,
  onClick,
  children,
  label,
  disabled,
}: {
  className: string;
  onClick?: () => void;
  children: ReactNode;
  label: string;
  disabled?: boolean;
}) {
  const content = (
    <>
      {children}
      <span>{label}</span>
    </>
  );
  return (
    <button type="button" className={`${className} share-btn`} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}

export function ShareSocial({
  pageUrl,
  waText,
  caption,
  nativeTitle,
  panelLabel,
  ariaLabel,
  analyticsEvent,
  highlight = false,
  highlightText,
  sticky = false,
  copyPromptMessage = "Copiá el link:",
  defaultHint = "Instagram no abre un post directo: en el celular usá «Más apps» o pegá el link en historia / DM.",
  igCopiedHint = "Link copiado. Pegalo en tu historia o DM de Instagram.",
}: ShareSocialProps) {
  const waHref = whatsappShareHref(waText);
  const fbHref = facebookShareHref(pageUrl);
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!sticky) return;
    function onScroll() {
      setShowSticky(window.scrollY > 280);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sticky]);

  function trackShare(method: ShareMethod) {
    trackEvent(analyticsEvent, { method });
  }

  function flash(msg?: string, holdMs = 3200) {
    setCopied(true);
    if (msg) setHint(msg);
    window.setTimeout(() => {
      setCopied(false);
      setHint(null);
    }, holdMs);
  }

  function shareWhatsApp() {
    trackShare("whatsapp");
    window.open(waHref, "_blank", "noopener,noreferrer");
  }

  function shareFacebook() {
    trackShare("facebook");
    window.open(fbHref, "_blank", "noopener,noreferrer");
  }

  async function exportCardImage() {
    const element = resolvePlayerCardElement(getCardElement);
    if (!element && !imageFallbackUrl) {
      throw new PlayerCardExportError("No encontramos la carta para exportar.");
    }
    return exportPlayerCardElement(element, imageFallbackUrl);
  }

  async function shareInstagram() {
    trackShare("instagram");

    if (cardImageShare) {
      setExporting(true);
      try {
        const { file, blob } = await exportCardImage();

        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
          if (canShareFiles([file])) {
            try {
              await navigator.share({
                files: [file],
                title: nativeTitle,
                text: caption,
              });
              flash(igImageShareSheetHint);
              return;
            } catch (err) {
              if (err instanceof DOMException && err.name === "AbortError") return;
            }
          }

          try {
            await navigator.share({
              title: nativeTitle,
              text: caption,
              url: pageUrl,
            });
            return;
          } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") return;
          }
        }

        downloadPlayerCardBlob(blob);
        flash(igImageDownloadHint);
        return;
      } catch (err) {
        if (err instanceof PlayerCardExportError) {
          flash(err.message || cardExportErrorHint);
        } else {
          flash(cardExportErrorHint);
        }
      } finally {
        setExporting(false);
      }
    }

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: nativeTitle,
          text: caption,
          url: pageUrl,
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    const ok = await copyText(pageUrl, copyPromptMessage);
    flash(ok ? igCopiedHint : "Copiá el link y pegalo en Instagram.");
  }

  async function downloadCardImage() {
    trackShare("download_image");
    setExporting(true);
    try {
      const { blob } = await exportCardImage();
      downloadPlayerCardBlob(blob);
      flash("Carta descargada.");
    } catch (err) {
      if (imageFallbackUrl) {
        downloadPlayerCardFromUrl(imageFallbackUrl);
        flash("Carta descargada.");
        return;
      }
      if (err instanceof PlayerCardExportError) {
        flash(err.message || cardExportErrorHint, 6000);
      } else {
        flash(cardExportErrorHint, 6000);
      }
    } finally {
      setExporting(false);
    }
  }

  async function shareNative() {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    trackShare("native");
    try {
      await navigator.share({
        title: nativeTitle,
        text: caption,
        url: pageUrl,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  async function copyLink() {
    trackShare("copy_link");
    const ok = await copyText(pageUrl, copyPromptMessage);
    if (ok) flash();
  }

  const buttons = (
    <div className="share-row share-row-social">
      <ShareBtn className="btn-flood share-btn-wa" onClick={() => void shareWhatsApp()} label="WhatsApp">
        <IconWhatsApp className="share-btn-icon" />
      </ShareBtn>
      <ShareBtn className="btn-ghost share-btn-fb" onClick={() => void shareFacebook()} label="Facebook">
        <IconFacebook className="share-btn-icon" />
      </ShareBtn>
      <ShareBtn
        className="btn-ghost share-btn-ig"
        onClick={() => void shareInstagram()}
        label={exporting ? "Generando…" : "Instagram"}
        disabled={exporting}
      >
        <IconInstagram className="share-btn-icon" />
      </ShareBtn>
      {cardImageShare ? (
        <ShareBtn
          className="btn-ghost share-btn-download"
          onClick={() => void downloadCardImage()}
          label={exporting ? "Generando…" : "Descargar carta"}
          disabled={exporting}
        >
          <IconDownload className="share-btn-icon" />
        </ShareBtn>
      ) : null}
      {canNativeShare ? (
        <ShareBtn className="btn-ghost" onClick={() => void shareNative()} label="Más apps">
          <IconShare className="share-btn-icon" />
        </ShareBtn>
      ) : null}
      <ShareBtn
        className="btn-ghost"
        onClick={() => void copyLink()}
        label={copied && !hint ? "Link copiado" : "Copiar link"}
      >
        <IconLink className="share-btn-icon" />
      </ShareBtn>
    </div>
  );

  return (
    <>
      <aside
        className={`share-panel${highlight ? " share-panel-host" : ""}`}
        id="compartir"
        aria-label={ariaLabel}
      >
        {highlight && highlightText ? (
          highlightText
        ) : (
          <p className="share-panel-label">{panelLabel}</p>
        )}
        {buttons}
        {hint ? (
          <p className="share-hint" role="status">
            {hint}
          </p>
        ) : (
          <p className="share-hint field-help">
            {cardImageShare ? igImageShareHint : defaultHint}
          </p>
        )}
      </aside>

      {sticky && showSticky ? (
        <div className="share-sticky" role="region" aria-label={ariaLabel}>
          <ShareBtn className="btn-flood share-btn-wa" onClick={() => void shareWhatsApp()} label="WhatsApp">
            <IconWhatsApp className="share-btn-icon" />
          </ShareBtn>
          <ShareBtn className="btn-ghost share-btn-fb" onClick={() => void shareFacebook()} label="Facebook">
            <IconFacebook className="share-btn-icon" />
          </ShareBtn>
          <ShareBtn className="btn-ghost share-btn-ig" onClick={() => void shareInstagram()} label="Instagram">
            <IconInstagram className="share-btn-icon" />
          </ShareBtn>
        </div>
      ) : null}
    </>
  );
}
