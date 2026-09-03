import { RosterSkeleton } from "@/components/RosterSkeleton";

export default function PartidosLoading() {
  return (
    <main className="page page-partidos" id="main" aria-busy="true">
      <header className="page-head page-head-row">
        <div>
          <p className="eyebrow">Partidos</p>
          <h1>Partidos con cupos abiertos</h1>
          <p className="lede">Entrá a un partido de hoy o publicá tu hueco.</p>
        </div>
      </header>

      <div className="partidos-toolbar partidos-toolbar-skeleton" aria-hidden="true">
        <div className="partidos-toolbar-filters">
          <span className="sk sk-chip" />
          <span className="sk sk-chip" />
        </div>
        <span className="sk sk-count" />
      </div>

      <RosterSkeleton rows={5} />
      <p className="sr-only">Cargando partidos…</p>
    </main>
  );
}
