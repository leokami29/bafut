import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VenueClaimForm } from "@/components/VenueClaimForm";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getVenueBySlug, getVenueClaimState } from "@/lib/data";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Reclamar cancha",
  robots: robotsNoIndex,
};

type Props = { params: Promise<{ slug: string }> };

function ClaimShell({
  title,
  children,
  venueSlug,
}: {
  title: string;
  children: React.ReactNode;
  venueSlug: string;
}) {
  return (
    <main className="page page-narrow" id="main">
      <p className="venue-back">
        <Link href={`/canchas/${venueSlug}`}>← Volver a la cancha</Link>
      </p>
      <header className="page-head">
        <p className="eyebrow">Reclamar cancha</p>
        <h1>{title}</h1>
      </header>
      {children}
    </main>
  );
}

export default async function VenueClaimPage({ params }: Props) {
  const { slug } = await params;
  const { userId } = await requireUserId(`/canchas/${slug}/reclamar`);
  const city = await getActiveCity();
  if (!city) notFound();

  const venue = await getVenueBySlug(city.id, slug);
  if (!venue) notFound();

  const claimState = await getVenueClaimState(venue.id, userId);

  // El usuario ya es el dueño asignado: no hay nada que reclamar.
  if (venue.owner_id === userId) {
    return (
      <ClaimShell title="Ya sos el dueño de esta cancha" venueSlug={slug}>
        <p>
          La ficha de <strong>{venue.name}</strong> está a tu nombre. Gestionás el panel desde
          ahí.
        </p>
        <div className="empty-home-actions">
          <Link href={`/canchas/${slug}/admin`} className="btn-flood">
            Ir al panel de la cancha
          </Link>
        </div>
      </ClaimShell>
    );
  }

  // La cancha ya tiene dueño (aprobado por un editor).
  if (venue.owner_id) {
    return (
      <ClaimShell title="Esta cancha ya tiene un dueño" venueSlug={slug}>
        <p>
          <strong>{venue.name}</strong> está verificada y su ficha pertenece a otro usuario. Si
          creés que hubo un error, escribinos a{" "}
          <a href="mailto:duenos@bafut.com">duenos@bafut.com</a> con tus datos.
        </p>
      </ClaimShell>
    );
  }

  // El usuario tiene un reclamo propio en revisión o aprobado.
  if (claimState.ownClaim?.status === "pending") {
    return (
      <ClaimShell title="Tu reclamo está en revisión" venueSlug={slug}>
        <p>
          Ya enviaste el reclamo de <strong>{venue.name}</strong>. Un editor de BaFut lo está
          verificando: te avisamos por WhatsApp cuando se resuelva.
        </p>
        <p className="field-help">No hace falta enviarlo otra vez — los duplicados se descartan.</p>
      </ClaimShell>
    );
  }
  if (claimState.ownClaim?.status === "approved") {
    return (
      <ClaimShell title="Tu reclamo fue aprobado" venueSlug={slug}>
        <p>
          <strong>{venue.name}</strong> quedó a tu nombre con sello de verificada. Entrá al
          panel a completar el contacto.
        </p>
        <div className="empty-home-actions">
          <Link href={`/canchas/${slug}/admin`} className="btn-flood">
            Ir al panel de la cancha
          </Link>
        </div>
      </ClaimShell>
    );
  }

  // Alguien más ya tiene un reclamo pendiente sobre esta cancha.
  if (claimState.hasPendingClaim) {
    return (
      <ClaimShell title="Esta cancha tiene un reclamo en revisión" venueSlug={slug}>
        <p>
          Alguien reclamó <strong>{venue.name}</strong> antes y un editor de BaFut lo está
          verificando. Si sos el dueño legítimo, escribinos a{" "}
          <a href="mailto:duenos@bafut.com">duenos@bafut.com</a> y lo miramos.
        </p>
      </ClaimShell>
    );
  }

  return (
    <ClaimShell title={`Reclamá ${venue.name}`} venueSlug={slug}>
      <p className="lede">
        Contanos cómo podemos verificar que sos el dueño/a. Un editor de BaFut revisa el reclamo
        — si lo confirma, la ficha pasa a tu nombre con el sello de verificada. Sin costo y sin
        comisión.
      </p>
      <div className="venue-claim-form-wrap">
        <VenueClaimForm venueId={venue.id} venueName={venue.name} venueSlug={venue.slug} />
      </div>
    </ClaimShell>
  );
}
