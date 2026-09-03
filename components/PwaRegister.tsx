"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!installEvent || dismissed) {
    return null;
  }

  return (
    <div className="pwa-install-banner" role="region" aria-label="Instalar BaFut">
      <p>Instala BaFut en tu teléfono para abrir más rápido.</p>
      <div className="pwa-install-actions">
        <button
          type="button"
          className="btn-bib"
          onClick={async () => {
            await installEvent.prompt();
            await installEvent.userChoice;
            setInstallEvent(null);
          }}
        >
          Instalar
        </button>
        <button type="button" className="btn-ghost" onClick={() => setDismissed(true)}>
          Ahora no
        </button>
      </div>
    </div>
  );
}
