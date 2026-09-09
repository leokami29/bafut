import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TournamentAccessNotice } from "@/components/tournaments/TournamentAccessNotice";
import { TournamentMatchActa } from "@/components/tournaments/TournamentMatchActa";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getVenueBySlug } from "@/lib/data";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { isUuid } from "@/lib/ids";
import { robotsNoIndex } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import {
  canScoreTournament,
  resolveVenueTournamentsGate,
  type VenueStaffRole,
} from "@/lib/tournaments/authz";
import { tournamentSportLabel } from "@/lib/tournaments/labels";
import {
  loadMatchEvents,
  loadTournamentBracket,
  parseBmOpponent,
} from "@/lib/tournaments/load";
import type { SportId } from "@/lib/tournaments/sports";

export const metadata: Metadata = {
  title: "Acta de partido",
  robots: robotsNoIndex,
};

type Props = {
  params: Promise<{ slug: string; id: string; matchId: string }>;
};

export default async function VenueTournamentMatchActaPage({ params }: Props) {
  const { slug, id, matchId: matchIdRaw } = await params;
  if (!isUuid(id)) notFound();

  const bmMatchId = Number(matchIdRaw);
  if (!Number.isFinite(bmMatchId) || bmMatchId < 1) notFound();

  const { userId } = await requireUserId(
    `/canchas/${slug}/admin/torneos/${id}/partidos/${bmMatchId}`,
  );
  const city = await getActiveCity();
  if (!city) notFound();

  const venue = await getVenueBySlug(city.id, slug);
  if (!venue) notFound();

  const supabase = await createClient();
  const tournamentsFlagEnabled = await isFeatureEnabled("venue_tournaments");

  const [
    { data: isAdmin },
    { data: staffRows },
    { data: activeSubs },
    { data: tournament },
    { data: matchRow },
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
    supabase
      .from("tournaments")
      .select("id, name, sport, status, venue_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("bm_match")
      .select("id, opponent1, opponent2, status, number")
      .eq("id", bmMatchId)
      .eq("tournament_id", id)
      .maybeSingle(),
  ]);

  if (!tournament || tournament.venue_id !== venue.id || !matchRow) {
    notFound();
  }

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

  const gate = resolveVenueTournamentsGate(authzCtx, userId);
  if (gate === "forbidden") {
    notFound();
  }

  const base = `/canchas/${slug}/admin`;
  if (gate !== "ok") {
    return (
      <main className="page page-venue-admin" id="main">
        <p className="venue-back">
          <Link href={`${base}/torneos/${id}`}>← Torneo</Link>
        </p>
        <TournamentAccessNotice reason={gate} adminBase={base} />
      </main>
    );
  }

  const canScore = canScoreTournament(authzCtx, userId);

  const [events, bracket, { data: confirmed }] = await Promise.all([
    loadMatchEvents(supabase, id, bmMatchId),
    loadTournamentBracket(supabase, id),
    supabase
      .from("tournament_match_results")
      .select("bm_match_id")
      .eq("tournament_id", id)
      .eq("bm_match_id", bmMatchId)
      .maybeSingle(),
  ]);

  const fixture = bracket.matches.find((m) => m.id === bmMatchId);
  const op1 = parseBmOpponent(matchRow.opponent1);
  const op2 = parseBmOpponent(matchRow.opponent2);
  const nameA = fixture?.nameA ?? (op1?.id != null ? `Equipo #${op1.id}` : "Por definir");
  const nameB = fixture?.nameB ?? (op2?.id != null ? `Equipo #${op2.id}` : "Por definir");
  const sport = tournament.sport as SportId;

  return (
    <main className="page page-venue-admin" id="main">
      <p className="venue-back">
        <Link href={`/canchas/${slug}/admin/torneos/${id}`}>← {tournament.name}</Link>
      </p>
      <header className="page-head page-head-compact">
        <p className="eyebrow">
          Acta · {tournamentSportLabel[sport] ?? sport} · Partido #{matchRow.number}
        </p>
        <h1>
          {nameA} vs {nameB}
        </h1>
      </header>

      <TournamentMatchActa
        slug={slug}
        tournamentId={id}
        bmMatchId={bmMatchId}
        sport={sport}
        nameA={nameA}
        nameB={nameB}
        confirmed={Boolean(confirmed)}
        initialEvents={events}
        canScore={canScore}
      />
    </main>
  );
}
