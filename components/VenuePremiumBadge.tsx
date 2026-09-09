/** Badge tipográfico Premium (texto + color flood — no solo color). */
export function VenuePremiumBadge() {
  return (
    <span
      className="venue-premium-badge"
      title="Cancha con plan Premium activo"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 1.5L9.8 5.4L14 5.9L10.9 8.8L11.8 13L8 10.8L4.2 13L5.1 8.8L2 5.9L6.2 5.4L8 1.5Z"
          fill="currentColor"
        />
      </svg>
      Premium
    </span>
  );
}
