"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  type Variants,
} from "motion/react";
import { formatLabel, levelLabel, positionShort, sportLabel } from "@/lib/labels";
import type { Level } from "@/lib/constants";
import {
  cardTier,
  formatStatCount,
  formatTrustStat,
  PLAYER_CARD_STAT_LABELS,
  type CardTier,
  type PlayerCardDraft,
} from "@/lib/player-card";
import type { Position, Sport } from "@/lib/constants";
import {
  avatarFocusStyle,
  clampAvatarFocus,
  DEFAULT_AVATAR_FOCUS,
  panAvatarFocus,
  type AvatarFocus,
} from "@/lib/avatar-focus";

function positionLine(primary: Position | null, secondary: Position | null | undefined): string {
  const main = primary ? positionShort[primary] : "—";
  if (!secondary || secondary === "any" || secondary === primary) return main;
  return `${main}/${positionShort[secondary]}`;
}

function levelChipLabel(level: Level | null | undefined): string | null {
  if (!level || level === "any") return null;
  return levelLabel[level];
}

function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return fine;
}

/** Enter / hover / tap springs — distintos por tier para personalidad AAA */
const springRookieEnter = { type: "spring" as const, stiffness: 380, damping: 38, mass: 1.05 };
const springRookieHover = { type: "spring" as const, stiffness: 480, damping: 42, mass: 1 };
const springClubEnter = { type: "spring" as const, stiffness: 360, damping: 26, mass: 0.9 };
const springClubHover = { type: "spring" as const, stiffness: 520, damping: 28, mass: 0.85 };
const springOroEnter = { type: "spring" as const, stiffness: 280, damping: 18, mass: 0.88 };
const springOroHover = { type: "spring" as const, stiffness: 400, damping: 24, mass: 0.9 };
const springEliteEnter = { type: "spring" as const, stiffness: 240, damping: 22, mass: 1.08 };
const springEliteHover = { type: "spring" as const, stiffness: 320, damping: 26, mass: 1.12 };

const cardMotion: Record<CardTier, Variants> = {
  rookie: {
    initial: { opacity: 0, y: 6, scale: 0.998 },
    animate: { opacity: 1, y: 0, scale: 1, transition: springRookieEnter },
    hover: { y: 0, scale: 1, transition: springRookieHover },
    tap: { scale: 0.999, transition: { duration: 0.1 } },
    exit: { opacity: 0, transition: { duration: 0.12 } },
  },
  club: {
    initial: { opacity: 0, y: 12, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1, transition: springClubEnter },
    hover: { y: -2, transition: springClubHover },
    tap: { scale: 0.992, transition: springClubHover },
    exit: { opacity: 0, y: 4, scale: 0.98, transition: { duration: 0.14 } },
  },
  oro: {
    initial: { opacity: 0, y: 14, scale: 0.972 },
    animate: { opacity: 1, y: 0, scale: 1, transition: springOroEnter },
    hover: { y: -3, transition: springOroHover },
    tap: { scale: 0.988, transition: springOroHover },
    exit: { opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.14 } },
  },
  elite: {
    initial: { opacity: 0, y: 22, scale: 0.94 },
    animate: { opacity: 1, y: 0, scale: 1, transition: springEliteEnter },
    hover: { y: -4, transition: springEliteHover },
    tap: { scale: 0.982, transition: springEliteHover },
    exit: { opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.16 } },
  },
};

type TiltConfig = {
  maxX: number;
  maxY: number;
  stiffness: number;
  damping: number;
  mass: number;
};

const tiltByTier: Record<CardTier, TiltConfig | null> = {
  rookie: null,
  club: { maxX: 2, maxY: 2, stiffness: 400, damping: 32, mass: 0.85 },
  oro: { maxX: 7, maxY: 8, stiffness: 300, damping: 26, mass: 0.9 },
  elite: { maxX: 10, maxY: 10, stiffness: 220, damping: 24, mass: 1.1 },
};

function clampTilt(value: number, max: number): number {
  return Math.max(-max, Math.min(max, value));
}

function CardTiltLayer({
  children,
  tier,
  enabled,
}: {
  children: ReactNode;
  tier: CardTier;
  enabled: boolean;
}) {
  const config = tiltByTier[tier];
  const rotateX = useSpring(0, {
    stiffness: config?.stiffness ?? 300,
    damping: config?.damping ?? 26,
    mass: config?.mass ?? 0.9,
  });
  const rotateY = useSpring(0, {
    stiffness: config?.stiffness ?? 300,
    damping: config?.damping ?? 26,
    mass: config?.mass ?? 0.9,
  });

  function resetTilt() {
    rotateX.set(0);
    rotateY.set(0);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!enabled || !config || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width - 0.5;
    const py = (event.clientY - box.top) / box.height - 0.5;
    rotateY.set(clampTilt(px * config.maxY * 2, config.maxY));
    rotateX.set(clampTilt(-py * config.maxX * 2, config.maxX));
  }

  if (!enabled || !config) return <>{children}</>;

  return (
    <motion.div
      className="player-card-tilt"
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={pointerMove}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
    >
      {children}
    </motion.div>
  );
}

function MotionStickyHost({
  sticky,
  children,
}: {
  sticky?: boolean;
  children: ReactNode;
}) {
  if (sticky) {
    return <div className="player-card-sticky">{children}</div>;
  }
  return children;
}

export function PlayerCard({
  draft,
  cityName,
  interactive = false,
  onFocusChange,
  onFocusCommit,
  cropSaved = false,
  enter = true,
  sticky = false,
  exportRef,
}: {
  draft: PlayerCardDraft;
  cityName?: string | null;
  interactive?: boolean;
  onFocusChange?: (focus: AvatarFocus) => void;
  onFocusCommit?: (focus: AvatarFocus) => void;
  cropSaved?: boolean;
  enter?: boolean;
  sticky?: boolean;
  exportRef?: Ref<HTMLElement | null>;
}) {
  const sport = draft.sport;
  const overall = draft.stats.overall;
  const name = draft.displayName.trim() || "TU NOMBRE";
  const pos = positionLine(draft.position, draft.secondaryPosition);
  const format = draft.format ? formatLabel[draft.format] : "formato";
  const sportName = sport ? sportLabel[sport as Sport] : "Deporte";
  const place = draft.neighborhood?.trim() || cityName || draft.cityName || "Barranquilla";
  const levelTier = draft.level && draft.level !== "any" ? draft.level : "none";
  const tier = cardTier(draft.stats);
  const isElite = tier === "elite";
  const levelChip = levelChipLabel(draft.level);
  const focus = clampAvatarFocus(draft.avatarFocus ?? DEFAULT_AVATAR_FOCUS);
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();
  const motionKey = `${tier}-${sport ?? "none"}`;
  const variants = cardMotion[tier];
  const motionActive = !reducedMotion;
  const hoverActive = motionActive && finePointer && !interactive;
  const tiltActive = motionActive && finePointer && !interactive && tier !== "rookie";
  const motionInitial = enter && motionActive ? "initial" : false;

  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    focus: AvatarFocus;
    width: number;
    height: number;
    last: AvatarFocus;
  } | null>(null);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!interactive || !draft.avatarUrl || !onFocusChange) return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      focus,
      width: box.width,
      height: box.height,
      last: focus,
    };
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId || !onFocusChange) return;
    const next = panAvatarFocus(
      start.focus,
      event.clientX - start.x,
      event.clientY - start.y,
      { width: start.width, height: start.height },
    );
    start.last = next;
    onFocusChange(next);
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    onFocusCommit?.(start.last);
  }

  const mountClass =
    enter && motionActive
      ? tier === "elite"
        ? " player-card-shell-mount"
        : tier === "oro"
          ? " player-card-mount"
          : ""
      : "";

  const cardBody = (
    <CardTiltLayer tier={tier} enabled={tiltActive}>
      <div className="player-card-glow" aria-hidden="true" />
      <div className="player-card-safe">
        <header className="player-card-top">
          <p className="player-card-overall">
            <span className="player-card-overall-n">{overall > 0 ? overall : "—"}</span>
            <span className="player-card-pos">{pos}</span>
            {levelChip ? <span className="player-card-level-chip">{levelChip}</span> : null}
          </p>
          <p className="player-card-brand">BaFut</p>
        </header>
        <div
          className={`player-card-shot${interactive && draft.avatarUrl ? " is-interactive" : ""}${cropSaved ? " is-crop-saved" : ""}`}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        >
          {draft.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.avatarUrl}
              alt=""
              className="player-card-photo"
              draggable={false}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              decoding="sync"
              loading="eager"
              style={avatarFocusStyle(focus)}
            />
          ) : (
            <div className="player-card-silhouette" aria-hidden="true">
              <span />
            </div>
          )}
          {interactive && draft.avatarUrl ? (
            <span className="player-card-crop-hint">Arrastrá para centrar</span>
          ) : null}
          {draft.playsForPay ? <span className="player-card-pay">Cobra</span> : null}
          {overall === 0 ? <span className="player-card-rookie">Novato</span> : null}
        </div>
        <div className="player-card-meta">
          <p className="player-card-name">{name}</p>
          <p className="player-card-club">
            {sportName} · {format}
          </p>
          <p className="player-card-place">{place}</p>
        </div>
        <dl className="player-card-stats">
          <div>
            <dt>{PLAYER_CARD_STAT_LABELS.played}</dt>
            <dd>{formatStatCount(draft.stats.played)}</dd>
          </div>
          <div>
            <dt>{PLAYER_CARD_STAT_LABELS.confirmed}</dt>
            <dd>{formatStatCount(draft.stats.confirmed)}</dd>
          </div>
          <div>
            <dt>{PLAYER_CARD_STAT_LABELS.hosted}</dt>
            <dd>{formatStatCount(draft.stats.hosted)}</dd>
          </div>
          <div>
            <dt>{PLAYER_CARD_STAT_LABELS.trust}</dt>
            <dd>{formatTrustStat(draft.stats)}</dd>
          </div>
        </dl>
        <p className="player-card-foot">
          {draft.age ? `${draft.age} años` : "Edad —"}
          {draft.heightCm ? ` · ${draft.heightCm} cm` : ""}
          {draft.preferredFoot === "left"
            ? " · Zurdo"
            : draft.preferredFoot === "right"
              ? " · Diestro"
              : draft.preferredFoot === "both"
                ? " · Ambidiestro"
                : ""}
        </p>
      </div>
    </CardTiltLayer>
  );

  return (
    <MotionStickyHost sticky={sticky}>
      <AnimatePresence mode="wait" initial={false}>
        {isElite ? (
          <motion.div
            key={motionKey}
            className="player-card-wrap player-card-wrap--elite player-card-motion-host"
            data-sport={sport ?? "none"}
            data-tier={tier}
            variants={variants}
            initial={motionInitial}
            animate="animate"
            exit="exit"
            whileHover={hoverActive ? "hover" : undefined}
            whileTap={hoverActive ? "tap" : undefined}
          >
            <div className={`player-card-shell${mountClass}`}>
              <article
                ref={exportRef}
                data-card-export
                className="player-card player-card--inner"
                data-sport={sport ?? "none"}
                data-level={levelTier}
                data-tier={tier}
                aria-label={`Carta de ${name}`}
              >
                {cardBody}
              </article>
            </div>
          </motion.div>
        ) : (
          <motion.article
            ref={exportRef}
            key={motionKey}
            data-card-export
            className={`player-card player-card-motion-host${mountClass}`}
            data-sport={sport ?? "none"}
            data-level={levelTier}
            data-tier={tier}
            aria-label={`Carta de ${name}`}
            variants={variants}
            initial={motionInitial}
            animate="animate"
            exit="exit"
            whileHover={hoverActive ? "hover" : undefined}
            whileTap={hoverActive ? "tap" : undefined}
          >
            {cardBody}
          </motion.article>
        )}
      </AnimatePresence>
    </MotionStickyHost>
  );
}
