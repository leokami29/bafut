import { RosterSkeleton } from "@/components/RosterSkeleton";

type HomeFeedSkeletonProps = {
  cityName?: string;
};

export function HomeFeedSkeleton({ cityName = "la ciudad" }: HomeFeedSkeletonProps) {
  return (
    <section className="sheet home-sheet" id="proximas" aria-labelledby="hoy-title" aria-busy="true">
      <div className="home-inner home-inner-wide">
        <header className="sheet-head sheet-head-row">
          <div>
            <p className="eyebrow">Radar</p>
            <h2 id="hoy-title">Próximas pateadas</h2>
            <p className="sheet-lede">Cargando huecos en {cityName}…</p>
          </div>
        </header>
        <RosterSkeleton rows={4} />
        <p className="sr-only">Cargando partidos…</p>
      </div>
    </section>
  );
}
