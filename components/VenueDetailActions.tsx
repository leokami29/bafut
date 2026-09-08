"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copia la dirección:", address);
    }
  }

  return (
    <button type="button" className="btn-ghost venue-copy-btn" onClick={() => void copyAddress()}>
      {copied ? "Dirección copiada" : "Copiar dirección"}
    </button>
  );
}

export function VenueStickyCta({
  href,
  label,
  secondaryHref,
  secondaryLabel,
}: {
  href: string;
  label: string;
  /** CTA secundaria (p. ej. Publicar hueco) cuando Reservar es primario */
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 120);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) {
    return null;
  }

  const hasSecondary = Boolean(secondaryHref && secondaryLabel);

  return (
    <div className="venue-sticky-cta" role="region" aria-label={label}>
      <div
        className={`venue-sticky-cta-row${hasSecondary ? " venue-sticky-cta-row--split" : ""}`}
      >
        <Link className="btn-flood" href={href}>
          {label}
        </Link>
        {hasSecondary ? (
          <Link className="btn-turf venue-cta-secondary" href={secondaryHref!}>
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
