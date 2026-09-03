import { Suspense } from "react";
import { HeroBanner } from "@/components/HeroBanner";
import { HomeDifferential } from "@/components/HomeDifferential";
import { HomeFeed } from "@/components/HomeFeed";
import { HomeFeedSkeleton } from "@/components/HomeFeedSkeleton";
import { HomeHowItWorks } from "@/components/HomeHowItWorks";
import { getActiveCity } from "@/lib/data";

export default async function HomePage() {
  const city = await getActiveCity();
  const cityName = city?.name ?? "Barranquilla";

  return (
    <main id="main">
      <section className="hero" aria-label="Presentación de BaFut">
        <HeroBanner cityName={cityName} />
      </section>

      <HomeHowItWorks />

      <HomeDifferential cityName={cityName} />

      <Suspense fallback={<HomeFeedSkeleton cityName={cityName} />}>
        <HomeFeed />
      </Suspense>
    </main>
  );
}
