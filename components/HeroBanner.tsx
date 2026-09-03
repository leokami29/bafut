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

function HeroHeadline({ headline }: { headline: string }) {
  const [displayed, setDisplayed] = useState(headline);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (headline === displayed) return undefined;

    let swapTimer: number | undefined;
    const fadeTimer = window.setTimeout(() => {
      setVisible(false);
      swapTimer = window.setTimeout(() => {
        setDisplayed(headline);
        setVisible(true);
      }, HEADLINE_FADE_MS);
    }, 0);

    return () => {
      window.clearTimeout(fadeTimer);
      if (swapTimer !== undefined) window.clearTimeout(swapTimer);
    };
  }, [displayed, headline]);

  return (
    <h1
      className={`hero-headline ${visible ? "is-visible" : "is-fading"}`}
      suppressHydrationWarning
    >
      {displayed}
    </h1>
  );
}

function HeroSportChip({ sport }: { sport: Sport | null }) {
  const [displayed, setDisplayed] = useState<Sport | null>(sport);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (sport === displayed) return undefined;

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
        <span className="hero-city-badge">{cityName}</span>
        <HeroSportChip sport={sport} />
        <p className="brand-hero" aria-hidden="true">
          BaFut
        </p>
        <HeroHeadline headline={pitch.headline} />
        <p className="hero-lede">
          Lista pública del hueco — no reserva de cancha. Pedí el cupo o publicá el que falta
          en {cityName}.
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
            href="/partidos"
            aria-label="Ver partidos de hoy"
          >
            Partidos de hoy
          </Link>
        </div>
      </div>
    </>
  );
}
