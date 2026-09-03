export function RosterSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="roster roster-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="match-row-skeleton">
          <span className="match-row-skeleton-top">
            <span className="sk sk-time" />
            <span className="sk sk-sport" />
          </span>
          <span className="sk sk-place" />
          <span className="sk sk-hole" />
        </div>
      ))}
    </div>
  );
}
