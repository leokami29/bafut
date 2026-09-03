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

export function VenueStickyCta({ href, label }: { href: string; label: string }) {
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

  return (
    <div className="venue-sticky-cta" role="region" aria-label="Publicar hueco">
      <Link className="btn-flood" href={href}>
        {label}
      </Link>
    </div>
  );
}
