export function VenueVerifiedBadge({ isVerified }: { isVerified: boolean }) {
  if (!isVerified) {
    return null;
  }

  return (
    <span className="venue-verified-badge" title="Cancha verificada">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
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
      Verificada
    </span>
  );
}
