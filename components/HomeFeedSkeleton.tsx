import { RosterSkeleton } from "@/components/RosterSkeleton";

type HomeFeedSkeletonProps = {
  cityName?: string;
};

export function HomeFeedSkeleton({ cityName = "la ciudad" }: HomeFeedSkeletonProps) {
  return (
    <section className="sheet home-sheet" aria-labelledby="hoy-title" aria-busy="true">
      <div className="home-inner">
        <header className="sheet-head sheet-head-row">
          <div>
            <p className="eyebrow">Feed</p>
            <h2 id="hoy-title">Hoy en {cityName}</h2>
            <p className="sheet-lede">Huecos abiertos para entrar hoy.</p>
          </div>
        </header>
        <RosterSkeleton rows={3} />
        <p className="sr-only">Cargando partidos…</p>
      </div>
    </section>
  );
}
