"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { PlayerCard } from "@/components/PlayerCard";
import { SportMark } from "@/components/SportMark";
import { formatWhen } from "@/lib/format";
import { zonedDateParts } from "@/lib/datetime";
import {
  formatLabel,
  levelLabel,
  playerGenderLabel,
  positionLabel,
  preferredFootLabel,
  sportLabel,
  timePeriodLabel,
  weekdayLabel,
} from "@/lib/labels";
import type { PlayerRecentMatch } from "@/lib/data";
import type { PlayerCardDraft, PlayerCardStats } from "@/lib/player-card";
import {
  ageFromBirthDate,
  asLevel,
  formatStatCount,
  formatTrustStat,
  PLAYER_CARD_STAT_LABELS,
  sportUsesPreferredFoot,
  trustPercent,
} from "@/lib/player-card";
import { toPlayerCardDraft } from "@/lib/player-card-draft";
import { isFormat, isPosition, isSport } from "@/lib/sport-rules";
import type { Profile, VenueWithPremium } from "@/lib/types";
import type { Sport } from "@/lib/constants";

type Fact = { label: string; value: string };

type ProfileFactGroups = {
  primary: Fact[];
  secondary: Fact[];
};

function buildProfileFacts(profile: Profile): ProfileFactGroups {
  const primary: Fact[] = [];
  const secondary: Fact[] = [];
  const sport = isSport(profile.preferred_sport) ? profile.preferred_sport : null;
  const format =
    profile.preferred_format && isFormat(profile.preferred_format)
      ? profile.preferred_format
      : null;
  const position = isPosition(profile.preferred_position) ? profile.preferred_position : null;
  const secondaryPos =
    profile.secondary_position && isPosition(profile.secondary_position)
      ? profile.secondary_position
      : null;

  if (sport) primary.push({ label: "Deporte", value: sportLabel[sport] });
  if (format) primary.push({ label: "Formato", value: formatLabel[format] });
  if (position) primary.push({ label: "Posición", value: positionLabel[position] });
  const level = asLevel(profile.level);
  if (level) primary.push({ label: "Nivel", value: levelLabel[level] });

  if (secondaryPos) secondary.push({ label: "También juega", value: positionLabel[secondaryPos] });
  if (sportUsesPreferredFoot(sport) && profile.preferred_foot) {
    const foot = preferredFootLabel[profile.preferred_foot];
    if (foot) secondary.push({ label: "Pierna hábil", value: foot });
  }

  const age = ageFromBirthDate(profile.birth_date);
  if (age != null) secondary.push({ label: "Edad", value: `${age} años` });
  if (profile.height_cm != null) secondary.push({ label: "Altura", value: `${profile.height_cm} cm` });
  if (profile.weight_kg != null) secondary.push({ label: "Peso", value: `${profile.weight_kg} kg` });

  if (profile.gender && profile.gender !== "undisclosed") {
    const g = playerGenderLabel[profile.gender];
    if (g) secondary.push({ label: "Género", value: g });
  }

  if (profile.neighborhood?.trim()) {
    secondary.push({ label: "Barrio", value: profile.neighborhood.trim() });
  }

  const days = (profile.preferred_days ?? [])
    .map((d) => weekdayLabel[d] ?? d)
    .filter(Boolean);
  if (days.length) secondary.push({ label: "Días", value: days.join(" · ") });

  const slots = (profile.preferred_time_slots ?? [])
    .map((s) => timePeriodLabel[s as keyof typeof timePeriodLabel] ?? s)
    .filter(Boolean);
  if (slots.length) secondary.push({ label: "Horario", value: slots.join(" · ") });

  if (profile.plays_for_pay) {
    secondary.push({ label: "Disponibilidad", value: "Cobra por jugar" });
  }

  return { primary, secondary };
}

/* —— Motion —— */

const springSoft = { type: "spring" as const, stiffness: 260, damping: 30, mass: 0.95 };

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...springSoft, delay: 0.08 + i * 0.07 },
  }),
};

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: springSoft },
};

const statVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: springSoft },
};

function AnimatedSection({
  index,
  className,
  children,
  labelledBy,
}: {
  index: number;
  className?: string;
  children: React.ReactNode;
  labelledBy?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      className={className}
      aria-labelledby={labelledBy}
      custom={index}
      variants={sectionVariants}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {children}
    </motion.section>
  );
}

/* —— Sub-bloques —— */

function StatTile({
  value,
  code,
  label,
}: {
  value: string;
  code: string;
  label: string;
}) {
  return (
    <motion.li className="pp-stat" variants={statVariants}>
      <span className="pp-stat-code">{code}</span>
      <span className="pp-stat-num">{value}</span>
      <span className="pp-stat-label">{label}</span>
    </motion.li>
  );
}

function VenueCard({ venue, sport }: { venue: VenueWithPremium; sport: Sport | null }) {
  return (
    <motion.li variants={itemVariants} whileHover={{ y: -4 }} whileTap={{ scale: 0.99 }}>
      <Link href={`/canchas/${venue.slug}`} className="pp-venue">
        <span className="pp-venue-top">
          <span className="pp-venue-mark">
            {sport ? <SportMark sport={sport} compact /> : null}
          </span>
          {venue.is_premium ? <span className="pp-venue-flag is-premium">Exclusivo</span> : null}
          {!venue.is_premium && venue.is_verified ? (
            <span className="pp-venue-flag">Verificada</span>
          ) : null}
        </span>
        <span className="pp-venue-name">{venue.name}</span>
        {venue.neighborhood ? (
          <span className="pp-venue-sub">{venue.neighborhood}</span>
        ) : (
          <span className="pp-venue-sub">Ver ficha</span>
        )}
      </Link>
    </motion.li>
  );
}

function MatchCard({ match }: { match: PlayerRecentMatch }) {
  const when = formatWhen(match.starts_at, match.city_timezone);
  const sport = isSport(match.sport) ? match.sport : null;
  const played = new Date(match.starts_at).getTime() < Date.now();
  const parts = zonedDateParts(new Date(match.starts_at), match.city_timezone);
  const day = String(parts.day).padStart(2, "0");
  const month = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"][
    parts.month - 1
  ];

  return (
    <motion.li variants={itemVariants} whileHover={{ x: 3 }} whileTap={{ scale: 0.99 }}>
      <Link href={`/p/${match.share_code}`} className="pp-match">
        <span className="pp-match-date" aria-hidden="true">
          <span className="pp-match-day">{day}</span>
          <span className="pp-match-month">{month}</span>
        </span>
        <span className="pp-match-copy">
          <span className="pp-match-top">
            <time dateTime={match.starts_at}>{when}</time>
            <span className={`pp-match-tag${match.hosted ? " is-host" : ""}`}>
              {match.hosted ? "Organizó" : played ? "Jugó" : "Confirmado"}
            </span>
          </span>
          <span className="pp-match-place">
            {match.venue_name}
            {sport ? ` · ${sportLabel[sport]}` : ""}
            {match.format && isFormat(match.format) ? ` · ${formatLabel[match.format]}` : ""}
          </span>
        </span>
        <span className="pp-match-arrow" aria-hidden="true">
          →
        </span>
      </Link>
    </motion.li>
  );
}

function PitchStats({
  stats,
  reduce,
  compact = false,
}: {
  stats: PlayerCardStats;
  reduce: boolean | null;
  compact?: boolean;
}) {
  return (
    <motion.ul
      className={`pp-stats${compact ? " pp-stats--hero" : ""}`}
      aria-label="Números de cancha"
      variants={listVariants}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      <StatTile
        value={formatStatCount(stats.played)}
        code={PLAYER_CARD_STAT_LABELS.played}
        label="Partidos jugados"
      />
      <StatTile
        value={formatStatCount(stats.confirmed)}
        code={PLAYER_CARD_STAT_LABELS.confirmed}
        label="Cupos confirmados"
      />
      <StatTile
        value={formatStatCount(stats.hosted)}
        code={PLAYER_CARD_STAT_LABELS.hosted}
        label="Partidos que armó"
      />
      <StatTile
        value={formatTrustStat(stats)}
        code={PLAYER_CARD_STAT_LABELS.trust}
        label="Confianza de nivel"
      />
    </motion.ul>
  );
}

/* —— Vista principal —— */

export function PublicPlayerProfileView({
  profile,
  cityName,
  stats,
  cardCode,
  isOwner = false,
  venues = [],
  recentMatches = [],
}: {
  profile: Profile;
  cityName: string | null;
  stats: PlayerCardStats;
  cardCode: string;
  isOwner?: boolean;
  venues?: VenueWithPremium[];
  recentMatches?: PlayerRecentMatch[];
}) {
  const reduce = useReducedMotion();
  const { primary: primaryFacts, secondary: secondaryFacts } = buildProfileFacts(profile);
  const hasFacts = primaryFacts.length > 0 || secondaryFacts.length > 0;
  const sport = isSport(profile.preferred_sport) ? profile.preferred_sport : null;
  const position = isPosition(profile.preferred_position)
    ? positionLabel[profile.preferred_position]
    : null;
  const headline = [sport ? sportLabel[sport] : null, position].filter(Boolean).join(" · ");
  const trust = trustPercent(stats);
  const draft: PlayerCardDraft = toPlayerCardDraft(
    { ...profile, whatsapp: null },
    stats,
    cityName,
  );

  let sectionIndex = 0;

  return (
    <div className="public-profile" data-sport={sport ?? "none"}>
      {/* Héroe: carta | intro + números de cancha */}
      <div className="pp-hero">
        <motion.div
          className="pp-hero-card"
          initial={reduce ? false : { opacity: 0, y: 26, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 24, mass: 1.05 }}
        >
          <PlayerCard draft={draft} cityName={cityName} enter={!reduce} />
        </motion.div>

        <div className="pp-hero-aside">
          <motion.div
            className="pp-hero-intro"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.12 }}
          >
            <p className="pp-eyebrow">{cityName ? `Jugador · ${cityName}` : "Jugador BaFut"}</p>
            <h1 className="pp-name">{profile.display_name}</h1>
            {headline ? <p className="pp-role">{headline}</p> : null}

            <div className="pp-ovr-row">
              <span className="pp-ovr">
                <span className="pp-ovr-num">{stats.overall}</span>
                <span className="pp-ovr-label">OVR</span>
              </span>
              {trust != null ? (
                <span className="pp-trust">
                  <span className="pp-trust-num">{trust}%</span>
                  <span className="pp-trust-label">confianza de nivel</span>
                </span>
              ) : null}
            </div>

            <div className="pp-hero-actions">
              {isOwner ? (
                <>
                  <Link href="/perfil" className="btn-flood">
                    Editar mi ficha
                  </Link>
                  <Link href={`/carta/${cardCode}`} className="btn-ghost">
                    Ver carta
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/partidos" className="btn-flood">
                    Ver partidos
                  </Link>
                  <Link href="/perfil" className="btn-ghost">
                    Armá la tuya
                  </Link>
                </>
              )}
            </div>
          </motion.div>

          <motion.div
            className="pp-hero-stats"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.2 }}
          >
            <header className="pp-section-head pp-hero-stats-head">
              <h2 id="pp-stats-title" className="pp-section-title">
                Números de cancha
              </h2>
              <p className="pp-section-lede">Actividad real en BaFut, no un promedio inventado.</p>
            </header>
            <PitchStats stats={stats} reduce={reduce} compact />
          </motion.div>
        </div>
      </div>

      {/* Cómo juega */}
      {hasFacts ? (
        <AnimatedSection index={sectionIndex++} className="pp-section pp-section-facts" labelledBy="pp-facts-title">
          <header className="pp-section-head">
            <h2 id="pp-facts-title" className="pp-section-title">
              Cómo juega
            </h2>
            <p className="pp-section-lede">Lo esencial de la ficha, sin ruido.</p>
          </header>

          {primaryFacts.length > 0 ? (
            <motion.ul
              className="pp-highlights"
              variants={listVariants}
              initial={reduce ? false : "hidden"}
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
            >
              {primaryFacts.map((fact) => (
                <motion.li key={fact.label} className="pp-highlight" variants={itemVariants}>
                  <span className="pp-highlight-label">{fact.label}</span>
                  <span className="pp-highlight-value">{fact.value}</span>
                </motion.li>
              ))}
            </motion.ul>
          ) : null}

          {secondaryFacts.length > 0 ? (
            <motion.dl
              className="pp-meta"
              variants={listVariants}
              initial={reduce ? false : "hidden"}
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
            >
              {secondaryFacts.map((fact) => (
                <motion.div key={fact.label} className="pp-meta-row" variants={itemVariants}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </motion.div>
              ))}
            </motion.dl>
          ) : null}
        </AnimatedSection>
      ) : null}

      {/* Partidos + Canchas en grilla */}
      {recentMatches.length > 0 || venues.length > 0 ? (
        <div className="pp-split">
          {recentMatches.length > 0 ? (
            <AnimatedSection
              index={sectionIndex++}
              className="pp-section pp-section-matches"
              labelledBy="pp-matches-title"
            >
              <header className="pp-section-head">
                <h2 id="pp-matches-title" className="pp-section-title">
                  Partidos
                </h2>
                <p className="pp-section-lede">Lo que jugó u organizó recientemente.</p>
              </header>
              <motion.ul
                className="pp-match-list"
                variants={listVariants}
                initial={reduce ? false : "hidden"}
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
              >
                {recentMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </motion.ul>
            </AnimatedSection>
          ) : null}

          {venues.length > 0 ? (
            <AnimatedSection
              index={sectionIndex++}
              className="pp-section pp-section-venues"
              labelledBy="pp-venues-title"
            >
              <header className="pp-section-head">
                <h2 id="pp-venues-title" className="pp-section-title">
                  {sport ? `Canchas de ${sportLabel[sport]}` : "Canchas"}
                  {cityName ? ` en ${cityName}` : ""}
                </h2>
                <p className="pp-section-lede">Sitios donde suele haber partidos de su deporte.</p>
              </header>
              <motion.ul
                className="pp-venue-list"
                variants={listVariants}
                initial={reduce ? false : "hidden"}
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
              >
                {venues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} sport={sport} />
                ))}
              </motion.ul>
            </AnimatedSection>
          ) : null}
        </div>
      ) : null}

      <p className="pp-privacy field-help">
        El WhatsApp no se muestra en el perfil público: se comparte cuando pedís o confirmás un
        cupo.
      </p>
    </div>
  );
}
