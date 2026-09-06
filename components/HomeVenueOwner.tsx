import Link from "next/link";
import { SportChalkLines } from "@/components/SportChalkLines";

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
        <div className="home-venue-owner-pitch">
          <SportChalkLines
            className="home-venue-owner-lines"
            showLabel={false}
            intervalMs={5200}
            fit="meet"
          />
        </div>
      </div>
    </section>
  );
}
