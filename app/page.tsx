import type { Metadata } from "next";
import { Suspense } from "react";
import { HeroBanner } from "@/components/HeroBanner";
import { HomeFeed } from "@/components/HomeFeed";
import { HomeFeedSkeleton } from "@/components/HomeFeedSkeleton";
import { HomeHowItWorks } from "@/components/HomeHowItWorks";
import { JsonLd, homeJsonLd } from "@/components/JsonLd";
import { getActiveCity } from "@/lib/data";
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

  return (
    <main id="main">
      <JsonLd data={homeJsonLd()} />
      <section className="hero" aria-label="Presentación de BaFut">
        <HeroBanner cityName={cityName} />
      </section>

      <HomeHowItWorks />

      <Suspense fallback={<HomeFeedSkeleton cityName={cityName} />}>
        <HomeFeed />
      </Suspense>
    </main>
  );
}
