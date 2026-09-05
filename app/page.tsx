import type { Metadata } from "next";
import { Suspense } from "react";
import { HeroBanner } from "@/components/HeroBanner";
import { HomeFeed } from "@/components/HomeFeed";
import { HomeFeedSkeleton } from "@/components/HomeFeedSkeleton";
import { HomeHowItWorks } from "@/components/HomeHowItWorks";
import { JsonLd, homeJsonLd } from "@/components/JsonLd";
import { getActiveCity, getUpcomingMatches } from "@/lib/data";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  absoluteUrl,
  defaultOg,
  defaultTwitter,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: DEFAULT_TITLE },
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: defaultOg({ url: absoluteUrl("/") }),
  twitter: defaultTwitter(),
};

export default async function HomePage() {
  const city = await getActiveCity();
  const cityName = city?.name ?? "Barranquilla";
  const matches = city ? await getUpcomingMatches(city.id) : [];
  const hasUpcoming = matches.length > 0;

  return (
    <main id="main">
      <JsonLd data={homeJsonLd(cityName)} />
      <section className="hero" aria-label="Presentación de BaFut">
        <HeroBanner cityName={cityName} hasUpcoming={hasUpcoming} />
      </section>

      <Suspense fallback={<HomeFeedSkeleton cityName={cityName} />}>
        <HomeFeed />
      </Suspense>

      <HomeHowItWorks cityName={cityName} />
    </main>
  );
}
