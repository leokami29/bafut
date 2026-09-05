"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PitchFieldDynamic } from "@/components/PitchFieldDynamic";
import { usePitchSetup } from "@/hooks/use-pitch-setup";
import { sportLabel } from "@/lib/labels";
import type { Sport } from "@/lib/constants";

type HeroBannerProps = {
  cityName: string;
  /** Si hay próximas pateadas, flood prioriza seeker; si no, host. */
  hasUpcoming?: boolean;
};

const HEADLINE_FADE_MS = 280;

const SEEKER_CTA = {
  href: "#proximas",
  label: "Ver huecos",
  ariaLabel: "Ver huecos cercanos",
} as const;

const HOST_CTA = {
  href: "/partidos/nuevo",
  label: "Publicar hueco",
  ariaLabel: "Publicar un hueco en cancha",
} as const;

function HeroSportChip({ sport }: { sport: Sport | null }) {
  const [displayed, setDisplayed] = useState<Sport | null>(sport);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (sport === displayed) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const instantTimer = window.setTimeout(() => {
        setDisplayed(sport);
        setVisible(true);
      }, 0);
      return () => window.clearTimeout(instantTimer);
    }

    let swapTimer: number | undefined;
    const fadeTimer = window.setTimeout(() => {
      setVisible(false);
      swapTimer = window.setTimeout(() => {
        setDisplayed(sport);
        setVisible(true);
      }, HEADLINE_FADE_MS);
    }, 0);

    return () => {
      window.clearTimeout(fadeTimer);
      if (swapTimer !== undefined) window.clearTimeout(swapTimer);
    };
  }, [displayed, sport]);

  if (!displayed) return null;

  return (
    <span
      className={`hero-sport-chip ${visible ? "is-visible" : "is-fading"}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {sportLabel[displayed]}
    </span>
  );
}

export function HeroBanner({ cityName, hasUpcoming = false }: HeroBannerProps) {
  const pitch = usePitchSetup({ rotate: true });
  const sport = pitch.setup?.sport ?? null;
  const primary = hasUpcoming ? SEEKER_CTA : HOST_CTA;
  const secondary = hasUpcoming ? HOST_CTA : SEEKER_CTA;

  return (
    <>
      <PitchFieldDynamic
        className="hero-pitch"
        setup={pitch.setup}
        dots={pitch.dots}
        mounted={pitch.mounted}
        rotationKey={pitch.rotationKey}
      />
      <div className="hero-copy">
        <div className="hero-meta">
          <span className="hero-city-badge">{cityName}</span>
          <HeroSportChip sport={sport} />
        </div>
        <p className="brand-hero" aria-hidden="true">
          BaFut
        </p>
        <h1>El radar de pateadas en {cityName}</h1>
        <p className="hero-lede">
          Huecos en cancha sintética — fútbol 5 y 7, sala, básquet y más. Entrá a una pateada abierta o
          publicá el cupo que te falta: hoy, cerca, sin grupo eterno de WhatsApp.
        </p>
        <div className="hero-ctas">
          <Link
            className="btn-flood btn-primary"
            href={primary.href}
            aria-label={primary.ariaLabel}
          >
            {primary.label}
          </Link>
          <Link
            className="btn-ghost btn-secondary"
            href={secondary.href}
            aria-label={secondary.ariaLabel}
          >
            {secondary.label}
          </Link>
        </div>
      </div>
    </>
  );
}
