import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VenueClaimForm } from "@/components/VenueClaimForm";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getVenueBySlug, getVenueClaimState } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { robotsNoIndex } from "@/lib/seo";
import {
  CLAIM_REJECT_COOLDOWN_DAYS,
  formatClaimCooldownUntil,
  isClaimInCooldown,
  venueOwnershipDisputeMailto,
} from "@/lib/venue-claims";

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
  const timezone = city.timezone ?? "America/Bogota";

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

  // La cancha ya tiene dueño (aprobado por un editor) → disputa, no nuevo reclamo.
  if (venue.owner_id) {
    const disputeHref = venueOwnershipDisputeMailto({
      venueName: venue.name,
      venueSlug: slug,
      siteOrigin: siteUrl(),
    });

    return (
      <ClaimShell title="Esta cancha ya tiene un dueño" venueSlug={slug}>
        <div className="venue-claim-dispute" role="region" aria-label="Disputa de titularidad">
          <p>
            <strong>{venue.name}</strong> está verificada y su ficha pertenece a otro usuario.
            No podés enviar otro reclamo por este flujo.
          </p>
          <p>
            Si creés que hubo un error o sos el dueño legítimo, abrí una{" "}
            <strong>disputa de titularidad</strong>. Pedimos prueba razonable (foto de fachada,
            NIT/razón social o dato de contacto de la recepción).
          </p>
          <div className="empty-home-actions venue-claim-dispute-actions">
            <a href={disputeHref} className="btn-flood">
              Abrir disputa por correo
            </a>
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="btn-ghost">
              {LEGAL_CONTACT_EMAIL}
            </a>
          </div>
          <p className="field-help">
            Un editor revisa a mano. Mientras tanto, la ficha sigue a nombre del dueño
            registrado.
          </p>
        </div>
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
        <p className="venue-claim-pending-meta">
          No hace falta enviarlo otra vez — los duplicados se descartan. Seguilo en{" "}
          <Link href="/perfil/canchas">Mis canchas</Link>.
        </p>
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

  // Rechazo reciente: cooldown antes de reintentar.
  if (
    claimState.ownClaim?.status === "rejected" &&
    isClaimInCooldown(claimState.ownClaim.reviewed_at)
  ) {
    const until = formatClaimCooldownUntil(claimState.ownClaim.reviewed_at!, timezone);
    return (
      <ClaimShell title="Reclamo rechazado — en espera" venueSlug={slug}>
        <div className="venue-claim-cooldown" role="status">
          <p>
            Revisamos tu reclamo de <strong>{venue.name}</strong> y no pudimos confirmar la
            propiedad
            {claimState.ownClaim.reject_reason
              ? `: ${claimState.ownClaim.reject_reason}`
              : "."}
          </p>
          <p>
            Por seguridad hay un cooldown de {CLAIM_REJECT_COOLDOWN_DAYS} días. Podés volver a
            reclamar después del <strong>{until}</strong>.
          </p>
          <p className="field-help">
            Si tenés prueba nueva (fachada, NIT o contacto de recepción), escribinos a{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> y lo miramos
            antes.
          </p>
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
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> y lo miramos.
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
        <VenueClaimForm venueId={venue.id} venueSlug={venue.slug} />
      </div>
    </ClaimShell>
  );
}
