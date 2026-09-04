"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallHint = "android-prompt" | "android-manual" | "ios-manual";

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 900px)").matches;
}

export function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hint, setHint] = useState<InstallHint | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissedKey = "bafut-pwa-install-dismissed";
    if (sessionStorage.getItem(dismissedKey) === "1" || isStandaloneDisplay()) {
      setDismissed(true);
      return;
    }

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silencioso: sin SW no hay install prompt nativo; el hint manual sigue útil.
      });
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setHint("android-prompt");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Chrome ya no muestra banner automático; iOS nunca dispara beforeinstallprompt.
    const timer = window.setTimeout(() => {
      if (isStandaloneDisplay()) return;
      if (!isMobileViewport()) return;
      setHint((current) => {
        if (current === "android-prompt") return current;
        return isIosDevice() ? "ios-manual" : "android-manual";
      });
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.clearTimeout(timer);
    };
  }, []);

  if (dismissed || !hint) {
    return null;
  }

  const dismiss = () => {
    sessionStorage.setItem("bafut-pwa-install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="pwa-install-banner" role="region" aria-label="Instalar BaFut">
      {hint === "android-prompt" ? (
        <p>Instala BaFut en tu teléfono para abrir más rápido.</p>
      ) : hint === "ios-manual" ? (
        <p>
          En iPhone: toca <strong>Compartir</strong> y luego <strong>Añadir a pantalla de inicio</strong>.
        </p>
      ) : (
        <p>
          En Android (Chrome): menú <strong>⋮</strong> → <strong>Instalar app</strong> o{" "}
          <strong>Añadir a pantalla de inicio</strong>.
        </p>
      )}
      <div className="pwa-install-actions">
        {hint === "android-prompt" && installEvent ? (
          <button
            type="button"
            className="btn-bib"
            onClick={async () => {
              await installEvent.prompt();
              await installEvent.userChoice;
              setInstallEvent(null);
              dismiss();
            }}
          >
            Instalar
          </button>
        ) : null}
        <button type="button" className="btn-ghost" onClick={dismiss}>
          Entendido
        </button>
      </div>
    </div>
  );
}
