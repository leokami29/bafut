import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VenueAdminNav } from "@/components/VenueAdminNav";
import { TournamentCreateForm } from "@/components/tournaments/TournamentCreateForm";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getVenueBySlug } from "@/lib/data";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { robotsNoIndex } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import {
  canAccessVenueTournamentsAdmin,
  canManageVenueTournaments,
  canScoreTournament,
  type TournamentFormat,
  type TournamentSport,
  type TournamentStatus,
  type VenueStaffRole,
} from "@/lib/tournaments/authz";
import {
  tournamentFormatLabel,
  tournamentSportLabel,
  tournamentStatusLabel,
  tournamentVisibilityLabel,
} from "@/lib/tournaments/labels";
import { listVenueTournaments } from "@/lib/tournaments/load";
import { venueHasActivePremium } from "@/lib/venue-premium";

export const metadata: Metadata = {
  title: "Torneos de la cancha",
  robots: robotsNoIndex,
};

type Props = { params: Promise<{ slug: string }> };

export default async function VenueTournamentsAdminPage({ params }: Props) {
  const { slug } = await params;
  const { userId } = await requireUserId(`/canchas/${slug}/admin/torneos`);
  const city = await getActiveCity();

  if (!city) {
    notFound();
  }

  const venue = await getVenueBySlug(city.id, slug);

  if (!venue) {
    notFound();
  }

  const supabase = await createClient();
  const tournamentsFlagEnabled = await isFeatureEnabled("venue_tournaments");

  const [
    { data: isAdmin },
    { data: staffRows },
    { data: activeSubs },
    { data: photos },
    { count: promoCount },
    { data: pendingReq },
    { count: pendingTurnosCount },
  ] = await Promise.all([
    supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("venue_staff")
      .select("venue_id, user_id, role")
      .eq("venue_id", venue.id)
      .eq("user_id", userId),
    supabase
      .from("venue_subscriptions")
      .select("plan, status, expires_at")
      .eq("venue_id", venue.id),
    supabase.from("venue_photos").select("id").eq("venue_id", venue.id),
    supabase
      .from("venue_promotions")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venue.id)
      .eq("active", true),
    supabase
      .from("venue_subscription_requests")
      .select("id")
      .eq("venue_id", venue.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("venue_bookings")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venue.id)
      .eq("status", "pending"),
  ]);

  const typedStaff = (staffRows ?? []).map((row) => ({
    venue_id: row.venue_id as string,
    user_id: row.user_id as string,
    role: row.role as VenueStaffRole,
  }));

  const authzCtx = {
    venueId: venue.id,
    ownerId: venue.owner_id,
    subscriptions: activeSubs ?? [],
    staffRows: typedStaff,
    isPlatformAdmin: Boolean(isAdmin),
    tournamentsFlagEnabled,
  };

  if (!canAccessVenueTournamentsAdmin(authzCtx, userId)) {
    return (
      <main className="page page-narrow" id="main">
        <header className="page-head">
          <h1>Acceso denegado</h1>
          <p>No tenés permisos para administrar torneos de esta cancha.</p>
        </header>
        <p className="foot-link">
          <Link href={`/canchas/${slug}`}>← Volver a la cancha</Link>
        </p>
      </main>
    );
  }

  const isPremium = venueHasActivePremium(activeSubs ?? []);
  const canManage = canManageVenueTournaments(authzCtx, userId);
  const canScore = canScoreTournament(authzCtx, userId);
  const base = `/canchas/${slug}/admin`;

  const tournaments =
    tournamentsFlagEnabled && isPremium
      ? await listVenueTournaments(supabase, venue.id)
      : [];

  return (
    <main className="page page-venue-admin" id="main">
      <p className="venue-back">
        <Link href={base}>← Volver al panel</Link>
      </p>
      <header className="page-head page-head-compact">
        <p className="eyebrow">Administración · {city.name}</p>
        <h1>Torneos · {venue.name}</h1>
        <p className="lede">
          Organizá campeonatos premium (fútbol, vóley, básquet, pádel) con llaves y
          actas.
        </p>
      </header>

      <Suspense fallback={<div className="venue-admin-board admin-board" aria-hidden="true" />}>
        <VenueAdminNav
          venueSlug={slug}
          counts={{
            photos: photos?.length ?? 0,
            pendingPremium: pendingReq ? 1 : 0,
            promotions: promoCount ?? 0,
            pendingTurnos: pendingTurnosCount ?? 0,
          }}
        />
      </Suspense>

      <section className="venue-admin-section" aria-labelledby="tournaments-gate-title">
        <h2 id="tournaments-gate-title">Torneos</h2>

        {!tournamentsFlagEnabled ? (
          <p className="lede">
            El módulo de torneos está desactivado por ahora. Cuando lo habilitemos a
            nivel plataforma, vas a poder crear campeonatos desde acá.
          </p>
        ) : !isPremium ? (
          <>
            <p className="lede">
              Los torneos son una función del plan Premium. Activá Premium para crear
              llaves, inscribir equipos y cargar resultados.
            </p>
            <p>
              <Link href={`${base}?tab=premium`} className="btn-flood">
                Ver plan Premium
              </Link>
            </p>
          </>
        ) : (
          <>
            {canScore && !canManage ? (
              <p className="lede">
                Acceso scorer: abrí un torneo activo para cargar el acta de cada partido.
              </p>
            ) : null}

            {tournaments.length === 0 ? (
              <p className="field-help">Todavía no hay torneos en esta cancha.</p>
            ) : (
              <ul className="tournament-list">
                {tournaments.map((t) => {
                  const sport = t.sport as TournamentSport;
                  const format = t.format as TournamentFormat;
                  const status = t.status as TournamentStatus;
                  const vis =
                    t.visibility === "published" ? "published" : "private";
                  return (
                    <li key={t.id} className="tournament-list-item">
                      <Link
                        href={`${base}/torneos/${t.id}`}
                        className="tournament-list-link"
                      >
                        <span className="tournament-list-name">{t.name}</span>
                        <span className="tournament-list-meta">
                          <span>{tournamentSportLabel[sport] ?? t.sport}</span>
                          <span>{tournamentFormatLabel[format] ?? t.format}</span>
                          <span>{tournamentStatusLabel[status] ?? t.status}</span>
                          <span>{tournamentVisibilityLabel[vis]}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {canManage ? (
              <div style={{ marginTop: "1.5rem" }}>
                <h3 className="subhead">Crear torneo</h3>
                <TournamentCreateForm slug={slug} venueId={venue.id} />
              </div>
            ) : null}

            <p className="foot-link" style={{ marginTop: "1.25rem" }}>
              <Link href={`/canchas/${slug}/torneos`}>Ver página pública de torneos →</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
