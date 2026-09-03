import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/ProfileForm";
import { requireUserId } from "@/lib/auth";
import { DEFAULT_CITY_SLUG } from "@/lib/constants";
import { getActiveCity, getCities, getProfile } from "@/lib/data";
import { profileCompletenessHint } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Perfil",
};

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { userId } = await requireUserId("/perfil");
  const { next } = await searchParams;
  const [profile, cities, city, supabase] = await Promise.all([
    getProfile(userId),
    getCities(),
    getActiveCity(),
    createClient(),
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
        <p>Nombre, posición y nivel. Lo mínimo para que el host sepa quién pide el cupo.</p>
        {next ? (
          <p className="form-ok" role="status">
            Cuando guardes, volvemos al partido.{" "}
            <Link href={next}>Ir ahora</Link>
          </p>
        ) : null}
      </header>
      <ProfileForm profile={profile} cities={cities} citySlug={citySlug} completenessHint={hint} />
    </main>
  );
}
