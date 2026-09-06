"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

export function MatchSeekerCta({
  open,
  canOpenRival,
  cancelled,
}: {
  open: number;
  canOpenRival: boolean;
  cancelled: boolean;
}) {
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    if (cancelled || open <= 0) return;
    function onScroll() {
      setShowSticky(window.scrollY > 220);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [cancelled, open]);

  if (cancelled || open <= 0) return null;

  function onPedir() {
    trackEvent("claim_cta_clicked", { source: "match_detail_primary" });
  }

  const primary = (
    <a className="btn-bib" href="#cupos" onClick={onPedir}>
      Pedir cupo
    </a>
  );

  return (
    <>
      <aside className="match-seeker-cta" aria-label="Pedir cupo">
        <div className="match-seeker-cta-primary">{primary}</div>
        <p className="match-seeker-cta-copy">
          Elegí el hueco abajo. El host confirma. Formación y rival quedan debajo.
        </p>
        <div className="match-seeker-cta-secondary">
          <a className="btn-ghost" href="#formacion">
            Ver formación
          </a>
          {canOpenRival ? (
            <a className="btn-ghost" href="#armar-rival">
              Armar rival
            </a>
          ) : null}
        </div>
      </aside>
      {showSticky ? (
        <div className="seeker-sticky" role="region" aria-label="Pedir cupo">
          <a className="btn-bib" href="#cupos" onClick={onPedir}>
            Pedir cupo
          </a>
        </div>
      ) : null}
    </>
  );
}
