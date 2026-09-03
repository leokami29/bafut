import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/ProfileForm";
import { requireUserId } from "@/lib/auth";
import { DEFAULT_CITY_SLUG } from "@/lib/constants";
import { getActiveCity, getCities, getHostPendingClaimCount, getProfile } from "@/lib/data";
import { profileCompletenessHint } from "@/lib/profile";
import { safeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Perfil",
  robots: robotsNoIndex,
};

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { userId } = await requireUserId("/perfil");
  const { next } = await searchParams;
  const nextPath = safeNextPath(next, "");
  const [profile, cities, city, supabase, pendingCount] = await Promise.all([
    getProfile(userId),
    getCities(),
    getActiveCity(),
    createClient(),
    getHostPendingClaimCount(userId),
  ]);

  if (!profile) {
    return (
      <main className="page page-narrow" id="main">
        <h1>Perfil</h1>
        <p className="empty">Todavía no hay perfil para esta cuenta. Cierra sesión y entra otra vez.</p>
      </main>
    );
  }

  const { data: authData } = await supabase.auth.getUser();
  const email = authData.user?.email ?? null;
  const hint = profileCompletenessHint(profile, email);
  const citySlug = cities.find((item) => item.id === profile.city_id)?.slug ?? city?.slug ?? DEFAULT_CITY_SLUG;

  return (
    <main className="page page-narrow" id="main">
      <header className="page-head">
        <h1>Tu ficha</h1>
        <p>Nombre, WhatsApp y nivel. Lo mínimo para que el host sepa quién pide el cupo.</p>
        {nextPath ? (
          <p className="form-ok" role="status">
            Cuando guardes, volvemos al partido.
          </p>
        ) : null}
        <p className="profile-links">
          <Link href="/perfil/partidos">
            Mis partidos
            {pendingCount > 0 ? ` (${pendingCount} pendientes)` : ""}
          </Link>
          {" · "}
          <Link href="/apoyar">BaFut es open source</Link>
        </p>
      </header>
      <ProfileForm
        profile={profile}
        cities={cities}
        citySlug={citySlug}
        completenessHint={hint}
        nextPath={nextPath || undefined}
      />
    </main>
  );
}
