/** Marcas de directorio: Exclusivo = reflector; Verificada = dueño. No se mezclan. */

export function ExclusiveMark({
  loud = false,
}: {
  loud?: boolean;
}) {
  return (
    <span
      className={`venue-mark venue-mark-exclusive${loud ? " is-loud" : ""}`}
      title="Plan Exclusivo: sale primero en el directorio"
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 1.5L9.8 5.4L14 5.9L10.9 8.8L11.8 13L8 10.8L4.2 13L5.1 8.8L2 5.9L6.2 5.4L8 1.5Z"
          fill="currentColor"
        />
      </svg>
      {loud ? "Exclusivo" : <span className="sr-only">Exclusivo</span>}
    </span>
  );
}

export function VerifiedMark({
  loud = false,
}: {
  loud?: boolean;
}) {
  return (
    <span
      className={`venue-mark venue-mark-verified${loud ? " is-loud" : ""}`}
      title="El dueño reclamó y confirma la ficha"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 0L10.245 2.245L13.5 1.5L14.5 4.755L16 6.5L14.5 8.245L13.5 11.5L10.245 10.755L8 13L5.755 10.755L2.5 11.5L1.5 8.245L0 6.5L1.5 4.755L2.5 1.5L5.755 2.245L8 0Z"
          fill="currentColor"
        />
        <path
          d="M6 8L7.5 9.5L10 6.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {loud ? "Dueño" : <span className="sr-only">Verificada por el dueño</span>}
    </span>
  );
}

export function VenueMarks({
  exclusive,
  verified,
  tone = "quiet",
}: {
  exclusive?: boolean;
  verified?: boolean;
  tone?: "quiet" | "loud";
}) {
  if (!exclusive && !verified) return null;
  const loud = tone === "loud";
  return (
    <span className="venue-marks">
      {exclusive ? <ExclusiveMark loud={loud} /> : null}
      {verified ? <VerifiedMark loud={loud} /> : null}
    </span>
  );
}
