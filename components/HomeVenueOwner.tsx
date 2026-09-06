import Link from "next/link";

type HomeVenueOwnerProps = {
  cityName: string;
};

/**
 * Invitación secundaria para dueños de cancha.
 * Va al final de la home para no competir con el foco: publicar huecos.
 */
export function HomeVenueOwner({ cityName }: HomeVenueOwnerProps) {
  return (
    <section className="home-venue-owner" aria-labelledby="home-venue-owner-heading">
      <div className="home-inner home-venue-owner-inner">
        <div className="home-venue-owner-copy">
          <p className="eyebrow">Para dueños de cancha</p>
          <h2 id="home-venue-owner-heading">¿Tenés una cancha en {cityName}?</h2>
          <p>
            Reclamá tu ficha: el contacto queda a tu nombre y la cancha luce el sello de
            verificada. Sin comisión — el arriendo se acuerda como siempre, contigo.
          </p>
          <div className="home-venue-owner-actions">
            <Link className="btn-ghost" href="/canchas/registro">
              Reclamar mi cancha
            </Link>
            <Link className="text-link text-link-muted" href="/canchas">
              Ver directorio
            </Link>
          </div>
        </div>
        <svg
          className="home-venue-owner-lines"
          viewBox="0 0 120 76"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="114" height="70" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="60" y1="3" x2="60" y2="73" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="60" cy="38" r="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="60" cy="38" r="1.6" fill="currentColor" />
          <rect x="3" y="22" width="15" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <rect x="102" y="22" width="15" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>
    </section>
  );
}
