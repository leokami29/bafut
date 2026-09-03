"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  pickRandomHeroTick,
  type DotPosition,
  type HeroTick,
  type PitchSetup,
} from "@/lib/pitch-config";
import { getHeroHeadline, HERO_HEADLINE_FALLBACK } from "@/lib/hero-copy";

export const HERO_ROTATION_MS_MIN = 5000;
export const HERO_ROTATION_MS_MAX = 8000;

export type PitchSetupState = {
  setup: PitchSetup | null;
  dots: DotPosition[];
  mounted: boolean;
  headline: string;
  rotationKey: number;
};

function randomRotationDelayMs(): number {
  return (
    HERO_ROTATION_MS_MIN +
    Math.floor(Math.random() * (HERO_ROTATION_MS_MAX - HERO_ROTATION_MS_MIN + 1))
  );
}

function applyHeroTick(tick: HeroTick): { setup: PitchSetup; dots: DotPosition[]; headline: string } {
  const headline = getHeroHeadline(
    tick.setup.sport,
    tick.missingRole as Parameters<typeof getHeroHeadline>[1],
  );
  return { setup: tick.setup, dots: tick.dots, headline };
}

type UsePitchSetupOptions = {
  /** Rota headline y cancha en intervalo; false para vista estática. */
  rotate?: boolean;
};

export function usePitchSetup(options: UsePitchSetupOptions = {}): PitchSetupState {
  const { rotate = true } = options;
  const [setup, setSetup] = useState<PitchSetup | null>(null);
  const [dots, setDots] = useState<DotPosition[]>([]);
  const [headline, setHeadline] = useState(HERO_HEADLINE_FALLBACK);
  const [rotationKey, setRotationKey] = useState(0);
  const headlineRef = useRef(HERO_HEADLINE_FALLBACK);
  const rotateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRotationRef = useRef<() => void>(() => {});
  const readyRef = useRef(false);

  const clearRotateTimeout = useCallback(() => {
    if (rotateTimeoutRef.current !== null) {
      clearTimeout(rotateTimeoutRef.current);
      rotateTimeoutRef.current = null;
    }
  }, []);

  const applyRandomSetup = useCallback(() => {
    const tick = pickRandomHeroTick(headlineRef.current);
    const next = applyHeroTick(tick);
    headlineRef.current = next.headline;
    setSetup(next.setup);
    setDots(next.dots);
    setHeadline(next.headline);
    setRotationKey((key) => key + 1);
  }, []);

  const scheduleRotation = useCallback(() => {
    if (!rotate || !readyRef.current) return;
    clearRotateTimeout();
    rotateTimeoutRef.current = setTimeout(() => {
      applyRandomSetup();
      scheduleRotationRef.current();
    }, randomRotationDelayMs());
  }, [applyRandomSetup, clearRotateTimeout, rotate]);

  useEffect(() => {
    scheduleRotationRef.current = scheduleRotation;
  }, [scheduleRotation]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      applyRandomSetup();
      readyRef.current = true;
      if (rotate) scheduleRotation();
    });
    return () => {
      cancelAnimationFrame(frame);
      clearRotateTimeout();
      readyRef.current = false;
    };
  }, [applyRandomSetup, clearRotateTimeout, rotate, scheduleRotation]);

  useEffect(() => {
    if (!rotate) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearRotateTimeout();
        return;
      }
      if (readyRef.current) scheduleRotation();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [clearRotateTimeout, rotate, scheduleRotation]);

  return {
    setup,
    dots,
    mounted: setup !== null,
    headline,
    rotationKey,
  };
}
