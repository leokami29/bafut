import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { CitySwitcher } from "@/components/CitySwitcher";
import { NavLinks } from "@/components/NavLinks";
import type { City } from "@/lib/types";

export function SiteHeader({
  city,
  cities,
  userId,
  tone = "field",
}: {
  city: City | null;
  cities: City[];
  userId: string | null;
  tone?: "field" | "paper";
}) {
  const light = tone === "field";

  return (
    <header className={`site-header ${light ? "site-header-field" : "site-header-paper"}`}>
      <Link href="/" className="brand-mark" aria-label="BaFut inicio">
        BaFut
      </Link>
      <nav className="site-nav" aria-label="Principal">
        <div className="site-nav-links">
          <NavLinks userId={userId} />
        </div>
        {userId ? (
          <form action={signOutAction} className="site-nav-signout">
            <button type="submit">Salir</button>
          </form>
        ) : null}
        {cities.length > 0 ? <CitySwitcher cities={cities} current={city?.slug} /> : null}
      </nav>
    </header>
  );
}
