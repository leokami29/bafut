import type { Metadata } from "next";
import Link from "next/link";
import { MyBookingsList, type PlayerBookingRow } from "@/components/MyBookingsList";
import { requireUserId } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mis turnos",
  robots: robotsNoIndex,
};

type VenueJoin = {
  name: string;
  slug: string;
  cities: { timezone: string } | { timezone: string }[] | null;
};

function mapRow(row: {
  id: string;
  status: string;
  sport: string;
  starts_at: string;
  duration_min: number;
  final_cop: number | null;
  payment_method: string;
  hold_expires_at: string | null;
  reject_reason: string | null;
  venues: VenueJoin | VenueJoin[] | null;
}): PlayerBookingRow | null {
  const venueRaw = Array.isArray(row.venues) ? row.venues[0] : row.venues;
  if (!venueRaw) return null;
  const cityJoin = Array.isArray(venueRaw.cities) ? venueRaw.cities[0] : venueRaw.cities;
  return {
    id: row.id,
    status: row.status,
    sport: row.sport,
    starts_at: row.starts_at,
    duration_min: row.duration_min,
    final_cop: row.final_cop,
    payment_method: row.payment_method,
    hold_expires_at: row.hold_expires_at,
    reject_reason: row.reject_reason,
    venue: {
      name: venueRaw.name,
      slug: venueRaw.slug,
      timezone: cityJoin?.timezone ?? "America/Bogota",
    },
  };
}

export default async function MisTurnosPage() {
  const { supabase, userId } = await requireUserId("/perfil/turnos");
  const flagOn = await isFeatureEnabled("venue_booking");

  const { data, error } = await supabase
    .from("venue_bookings")
    .select(
      "id, status, sport, starts_at, duration_min, final_cop, payment_method, hold_expires_at, reject_reason, venues ( name, slug, cities ( timezone ) )",
    )
    .eq("player_id", userId)
    .order("starts_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  const bookings = (data ?? [])
    .map((row) => mapRow(row as Parameters<typeof mapRow>[0]))
    .filter((row): row is PlayerBookingRow => Boolean(row));

  return (
    <main className="page page-my-matches my-matches-page page-venue-bookings" id="main">
      <header className="page-head my-matches-head">
        <p className="my-matches-kicker">Perfil</p>
        <h1>Mis turnos</h1>
        <p className="lede">
          Pedidos de alquiler de horario. Cancelá mientras esté pendiente, o un confirmado si
          faltan ≥12 h para el inicio.
        </p>
        <div className="my-matches-quick">
          <Link href="/canchas" className="btn-flood">
            Buscar cancha
          </Link>
          <Link href="/perfil/partidos" className="btn-ghost">
            Mis partidos
          </Link>
        </div>
      </header>

      {!flagOn ? (
        <p className="field-help" role="note">
          Los pedidos de turno están desactivados en BaFut por ahora. Si ya tenías turnos, igual
          los ves acá.
        </p>
      ) : null}

      <section className="my-matches-section" aria-labelledby="mis-turnos-heading">
        <div className="my-matches-section-head">
          <h2 className="subhead" id="mis-turnos-heading">
            Historial
          </h2>
        </div>
        <MyBookingsList bookings={bookings} />
      </section>
    </main>
  );
}
