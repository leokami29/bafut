export default function CanchasLoading() {
  return (
    <main className="page" id="main" aria-busy="true">
      <p className="eyebrow">Canchas</p>
      <div className="venue-map venue-map-loading" role="status">
        Cargando mapa…
      </div>
      <div className="roster-skeleton" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="match-row-skeleton">
            <span className="sk sk-place" />
          </div>
        ))}
      </div>
    </main>
  );
}
