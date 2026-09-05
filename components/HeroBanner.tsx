"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PitchFieldDynamic } from "@/components/PitchFieldDynamic";
import { usePitchSetup } from "@/hooks/use-pitch-setup";
import { sportLabel } from "@/lib/labels";
import type { Sport } from "@/lib/constants";

type HeroBannerProps = {
  cityName: string;
};

const HEADLINE_FADE_MS = 280;

function HeroSportChip({ sport }: { sport: Sport | null }) {
  const [displayed, setDisplayed] = useState<Sport | null>(sport);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (sport === displayed) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayed(sport);
      setVisible(true);
      return undefined;
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

export function HeroBanner({ cityName }: HeroBannerProps) {
  const pitch = usePitchSetup({ rotate: true });
  const sport = pitch.setup?.sport ?? null;

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
          Partidos de fútbol 5 y 7, huecos en cancha sintética. Entrá a una pateada abierta o publicá el
          cupo que te falta — hoy, cerca, sin grupo eterno de WhatsApp.
        </p>
        <div className="hero-ctas">
          <Link
            className="btn-flood btn-primary"
            href="/partidos/nuevo"
            aria-label="Publicar un hueco en cancha"
          >
            Publicar hueco
          </Link>
          <Link
            className="btn-ghost btn-secondary"
            href="#proximas"
            aria-label="Ver huecos cercanos"
          >
            Ver huecos
          </Link>
        </div>
      </div>
    </>
  );
}
