import type { Metadata } from "next";
import Link from "next/link";
import { MatchAlertsPanel } from "@/components/MatchAlertsPanel";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getCities } from "@/lib/data";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

function vapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}

export const metadata: Metadata = {
  title: "Alertas de partidos",
  robots: robotsNoIndex,
};

export default async function PerfilAlertasPage() {
  const { userId } = await requireUserId("/perfil/alertas");
  const [cities, city, pushEnabled] = await Promise.all([
    getCities(),
    getActiveCity(),
    isFeatureEnabled("push_alerts"),
  ]);
  const supabase = await createClient();
  const { data: alerts } = await supabase
    .from("match_alerts")
    .select("id, city_id, sport, format, level, neighborhood, enabled, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (
    <main className="page page-nuevo-partido" id="main">
      <p className="venue-back">
        <Link href="/perfil">← Perfil</Link>
      </p>
      <header className="page-head match-compose-head">
        <h1>Alertas</h1>
        <p className="lede">
          Avisame cuando salga un partido que encaje. Opt-in explícito: sin permiso no hay push.
        </p>
      </header>
      <MatchAlertsPanel
        cities={cities}
        defaultCityId={city?.id ?? cities[0]?.id ?? ""}
        alerts={alerts ?? []}
        vapidPublicKey={vapidPublicKey()}
        pushEnabled={pushEnabled}
      />
    </main>
  );
}
