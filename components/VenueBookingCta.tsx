import Link from "next/link";

type VenueBookingCtaProps = {
  venueSlug: string;
  /** Variante compacta junto a Precios / acciones. */
  variant?: "inline" | "section";
  className?: string;
};

/** CTA corto a /canchas/[slug]/turno (solo renderizar si flag + booking + pricing ok). */
export function VenueBookingCta({
  venueSlug,
  variant = "inline",
  className,
}: VenueBookingCtaProps) {
  const href = `/canchas/${venueSlug}/turno`;
  if (variant === "section") {
    return (
      <div className={`venue-booking-cta-section${className ? ` ${className}` : ""}`}>
        <Link href={href} className="btn-flood venue-booking-cta">
          Pedir turno
        </Link>
        <p className="venue-booking-cta-hint">Alquilá un horario · el dueño confirma el pago</p>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className={`btn-ghost venue-booking-cta${className ? ` ${className}` : ""}`}
    >
      Pedir turno
    </Link>
  );
}
