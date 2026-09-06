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
    <main className="page page-nuevo-partido" id="main">
      <header className="page-head match-compose-head">
        <h1>Tu ficha</h1>
        <p className="lede">Nombre, WhatsApp y nivel. Lo mínimo para que el host sepa quién pide el cupo.</p>
        {nextPath ? (
          <p className="form-ok" role="status">
            Cuando guardes, volvemos al partido.
          </p>
        ) : null}
      </header>

      <div className="profile-nav-grid">
        <Link href="/perfil/partidos" className="profile-nav-card">
          <span className="profile-nav-title">Mis partidos</span>
          {pendingCount > 0 && (
            <span className="profile-nav-badge">{pendingCount}</span>
          )}
          <span className="profile-nav-desc">Partidos que organizás y cupos que pediste</span>
        </Link>
        <Link href="/perfil/templates" className="profile-nav-card">
          <span className="profile-nav-title">Templates recurrentes</span>
          <span className="profile-nav-desc">Partidos que se publican automáticamente cada semana</span>
        </Link>
        <Link href="/apoyar" className="profile-nav-card">
          <span className="profile-nav-title">BaFut es open source</span>
          <span className="profile-nav-desc">ApoYá el proyecto o contribuí con código</span>
        </Link>
      </div>

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
