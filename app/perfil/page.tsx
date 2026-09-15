import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PerfilPlayerCardShareBlock } from "@/components/PlayerCardShareBlock";
import { ProfileExtrasForm } from "@/components/ProfileExtrasForm";
import { ProfileForm } from "@/components/ProfileForm";
import { DeleteAccountSection } from "@/components/DeleteAccountSection";
import { ProfileOnboarding } from "@/components/ProfileOnboarding";
import { requireUserId } from "@/lib/auth";
import { DEFAULT_CITY_SLUG, LEVELS, type Level } from "@/lib/constants";
import {
  getActiveCity,
  getCities,
  getHostPendingInbox,
  getPlayerCardStats,
  getProfile,
  getVenueOwnerSummary,
  getVenuesByCity,
} from "@/lib/data";
import { formatLabel, levelLabel, sportLabel } from "@/lib/labels";
import {
  formatStatCount,
  formatTrustStat,
  PLAYER_CARD_STAT_LABELS,
} from "@/lib/player-card";
import { toPlayerCardDraft } from "@/lib/player-card-draft";
import { isProfileComplete, profileCompletenessHint } from "@/lib/profile";
import { safeNextPath } from "@/lib/safe-next";
import { isFormat, isSport } from "@/lib/sport-rules";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Perfil",
  robots: robotsNoIndex,
};

function IconPitch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 5h18v14H3V5zm2 2v10h14V7H5zm7 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM4.5 12h3v1h-3v-1zm12 0h3v1h-3v-1z"
      />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2zm13 8H6v10h14V10zM6 8h14V6H6v2z"
      />
    </svg>
  );
}

function IconVenue({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2 4 7v13h16V7l-8-5zm0 2.2L18 8v10H6V8l6-3.8zM8 12h3v6H8v-6zm5 0h3v6h-3v-6z"
      />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm8-5H4l2-2V10a6 6 0 1 1 12 0v5l2 2zM12 4a4 4 0 0 0-4 4v5.2l-.8.8h9.6l-.8-.8V8a4 4 0 0 0-4-4z"
      />
    </svg>
  );
}

function IconRepeat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 7h9V4l5 4-5 4V9H7a3 3 0 0 0-3 3v2H2v-2a5 5 0 0 1 5-5zm10 10H8v3l-5-4 5-4v3h9a3 3 0 0 0 3-3v-2h2v2a5 5 0 0 1-5 5z"
      />
    </svg>
  );
}

function IconHeart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 21s-7.2-4.4-9.5-8.3C.7 9.7 2.1 6 5.4 6c1.8 0 3.2 1 3.9 2.1C10 7 11.4 6 13.2 6c3.3 0 4.7 3.7 2.9 6.7C19.2 16.6 12 21 12 21z"
      />
    </svg>
  );
}

type NavItem = {
  href: string;
  title: string;
  desc: string;
  badge?: number;
  hot?: boolean;
  icon: ReactNode;
};

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { userId } = await requireUserId("/perfil");
  const { next } = await searchParams;
  const nextPath = safeNextPath(next, "");
  const [profile, cities, city, supabase, pendingInbox, venueSummary, stats] = await Promise.all([
    getProfile(userId),
    getCities(),
    getActiveCity(),
    createClient(),
    getHostPendingInbox(userId),
    getVenueOwnerSummary(userId),
    getPlayerCardStats(userId),
  ]);
  const pendingCount = pendingInbox.count;
  const { ownedCount, pendingCount: venuePendingClaims } = venueSummary;

  if (!profile) {
    return (
      <main className="page page-narrow" id="main">
        <h1>Perfil</h1>
        <p className="empty">Todavía no hay perfil para esta cuenta. Cierra sesión y entra otra vez.</p>
      </main>
    );
  }

  const venues = city ? await getVenuesByCity(city.id) : [];
  const neighborhoods = [
    ...new Set(
      venues
        .map((venue) => venue.neighborhood?.trim())
        .filter((item): item is string => Boolean(item)),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));

  const { data: authData } = await supabase.auth.getUser();
  const email = authData.user?.email ?? null;
  const complete = isProfileComplete(profile, email);
  const hint = profileCompletenessHint(profile, email);
  const citySlug = cities.find((item) => item.id === profile.city_id)?.slug ?? city?.slug ?? DEFAULT_CITY_SLUG;
  const cityName = cities.find((item) => item.slug === citySlug)?.name ?? city?.name ?? "Barranquilla";
  const draft = toPlayerCardDraft(profile, stats, cityName);

  const sport = profile.preferred_sport && isSport(profile.preferred_sport) ? profile.preferred_sport : null;
  const format =
    profile.preferred_format && isFormat(profile.preferred_format) ? profile.preferred_format : null;
  const levelRaw = profile.level;
  const level: Level | null =
    levelRaw && (LEVELS as readonly string[]).includes(levelRaw) ? (levelRaw as Level) : null;

  const navItems: NavItem[] = [
    {
      href: pendingCount > 0 ? pendingInbox.href : "/perfil/partidos",
      title: "Mis partidos",
      desc:
        pendingCount > 0
          ? "Tenés pedidos por revisar"
          : "Lo que organizás y los cupos que pediste",
      badge: pendingCount > 0 ? pendingCount : undefined,
      hot: pendingCount > 0,
      icon: <IconPitch className="perfil-nav-glyph" />,
    },
    {
      href: "/perfil/turnos",
      title: "Mis reservas",
      desc: "Alquileres de horario en canchas",
      icon: <IconCalendar className="perfil-nav-glyph" />,
    },
    {
      href: "/perfil/canchas",
      title: "Mis canchas",
      desc:
        ownedCount > 0
          ? `${ownedCount} a tu nombre${venuePendingClaims > 0 ? ` · ${venuePendingClaims} en revisión` : ""}`
          : venuePendingClaims > 0
            ? `${venuePendingClaims} reclamo${venuePendingClaims === 1 ? "" : "s"} en revisión`
            : "Reclamá y gestioná tu ficha",
      badge:
        ownedCount + venuePendingClaims > 0 ? ownedCount + venuePendingClaims : undefined,
      icon: <IconVenue className="perfil-nav-glyph" />,
    },
    {
      href: "/perfil/alertas",
      title: "Alertas",
      desc: "Avisos cuando salga un partido a tu medida",
      icon: <IconBell className="perfil-nav-glyph" />,
    },
    {
      href: "/perfil/templates",
      title: "Templates",
      desc: "Partidos que se publican solos cada semana",
      icon: <IconRepeat className="perfil-nav-glyph" />,
    },
    {
      href: "/apoyar",
      title: "Apoyar BaFut",
      desc: "Open source: código o un café",
      icon: <IconHeart className="perfil-nav-glyph" />,
    },
  ];

  return (
    <main className="page page-perfil" id="main">
      <header className="page-head">
        <p className="perfil-eyebrow">Vestuario</p>
        <h1>{complete ? profile.display_name : "Armá tu carta"}</h1>
        <p className="lede">
          {complete
            ? "Tu ficha, tus atajos y lo que falta por retocar — todo en un solo lugar."
            : "Tres toques y queda tu ficha. El resto, cuando quieras."}
        </p>
        {complete ? (
          <ul className="perfil-head-meta" aria-label="Datos de la carta">
            <li className="perfil-pill">{cityName}</li>
            {sport ? (
              <li className="perfil-pill">
                {sportLabel[sport]}
                {format ? ` · ${formatLabel[format]}` : ""}
              </li>
            ) : null}
            {level ? <li className="perfil-pill">{levelLabel[level]}</li> : null}
          </ul>
        ) : null}
        {nextPath ? (
          <p className="form-ok" role="status">
            Cuando esté lista, volvemos al partido.
          </p>
        ) : null}
      </header>

      {complete ? (
        <div className="perfil-locker">
          <div className="perfil-locker-card">
            <PerfilPlayerCardShareBlock
              draft={draft}
              cityName={cityName}
              share={{
                displayName: draft.displayName,
                overall: stats.overall,
                sport: sport ? sportLabel[sport] : "Deporte",
                cardCode: profile.card_share_code ?? "",
              }}
            />
            <ul className="perfil-stats" aria-label="Números de cancha">
              <li className="perfil-stat">
                <span className="perfil-stat-num">{formatStatCount(stats.played)}</span>
                <span className="perfil-stat-label">{PLAYER_CARD_STAT_LABELS.played}</span>
              </li>
              <li className="perfil-stat">
                <span className="perfil-stat-num">{formatStatCount(stats.confirmed)}</span>
                <span className="perfil-stat-label">{PLAYER_CARD_STAT_LABELS.confirmed}</span>
              </li>
              <li className="perfil-stat">
                <span className="perfil-stat-num">{formatStatCount(stats.hosted)}</span>
                <span className="perfil-stat-label">{PLAYER_CARD_STAT_LABELS.hosted}</span>
              </li>
              <li className="perfil-stat">
                <span className="perfil-stat-num">{formatTrustStat(stats)}</span>
                <span className="perfil-stat-label">{PLAYER_CARD_STAT_LABELS.trust}</span>
              </li>
            </ul>
            <p className="ficha-legend">
              {PLAYER_CARD_STAT_LABELS.played} partidos jugados · {PLAYER_CARD_STAT_LABELS.confirmed}{" "}
              cupos confirmados · {PLAYER_CARD_STAT_LABELS.hosted} partidos que armaste ·{" "}
              {PLAYER_CARD_STAT_LABELS.trust} confianza de nivel (%).
            </p>
          </div>

          <div className="perfil-locker-main">
            <section className="perfil-atajos" aria-labelledby="perfil-atajos-title">
              <header className="perfil-section-head">
                <h2 id="perfil-atajos-title" className="perfil-section-label">
                  Atajos
                </h2>
                <p className="perfil-section-lede">
                  Partidos, reservas y herramientas de host.
                </p>
              </header>
              <ul className="perfil-nav">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`perfil-nav-item${item.hot ? " is-hot" : ""}`}
                    >
                      <span className="perfil-nav-icon">{item.icon}</span>
                      <span className="perfil-nav-copy">
                        <span className="perfil-nav-head">
                          <span className="perfil-nav-title">{item.title}</span>
                          {item.badge != null ? (
                            <span
                              className="perfil-nav-badge"
                              aria-label={`${item.badge} pendientes`}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="perfil-nav-desc">{item.desc}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="perfil-edit" aria-labelledby="perfil-editar-title">
              <h2 id="perfil-editar-title" className="perfil-section-label">
                Editar ficha
              </h2>
              <details>
                <summary>Nombre, deporte y WhatsApp</summary>
                <div className="perfil-edit-body">
                  <ProfileForm
                    profile={profile}
                    cities={cities}
                    citySlug={citySlug}
                    completenessHint={hint}
                    nextPath={nextPath || undefined}
                    userId={userId}
                  />
                </div>
              </details>
              <details>
                <summary>Barrio, días, pierna y el resto</summary>
                <div className="perfil-edit-body">
                  <p className="profile-form-intro">
                    Opcional. Cada dato suma a la carta; ninguno te bloquea el cupo.
                  </p>
                  <ProfileExtrasForm profile={profile} neighborhoods={neighborhoods} />
                </div>
              </details>
            </section>

            <DeleteAccountSection
              deletion_scheduled_at={profile.deletion_scheduled_at}
              purge_at={profile.purge_at}
              deleted_at={profile.deleted_at}
            />
          </div>
        </div>
      ) : (
        <>
          <ProfileOnboarding
            profile={profile}
            cities={cities}
            citySlug={citySlug}
            cityName={cityName}
            stats={stats}
            email={email}
            userId={userId}
            nextPath={nextPath || undefined}
          />
          <DeleteAccountSection
            deletion_scheduled_at={profile.deletion_scheduled_at}
            purge_at={profile.purge_at}
            deleted_at={profile.deleted_at}
          />
        </>
      )}
    </main>
  );
}
