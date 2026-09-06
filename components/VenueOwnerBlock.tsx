import Link from "next/link";
import { siteUrl } from "@/lib/env";
import { VenueOwnerCta } from "@/components/VenueOwnerCta";
import { whatsappChatHref } from "@/lib/whatsapp-contact";

function ownerWhatsappHref(venueName: string, venueSlug: string) {
  const raw = process.env.NEXT_PUBLIC_VENUE_OWNER_WHATSAPP?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const pageUrl = `${siteUrl().replace(/\/$/, "")}/canchas/${venueSlug}`;
  return whatsappChatHref(
    digits,
    `Hola, soy el dueño de ${venueName} (${venueSlug}). Vi la ficha en BaFut: ${pageUrl}`,
  );
}

function ownerEmailHref(venueName: string, venueSlug: string) {
  const email = process.env.NEXT_PUBLIC_VENUE_OWNER_EMAIL?.trim();
  if (!email) return null;
  const pageUrl = `${siteUrl().replace(/\/$/, "")}/canchas/${venueSlug}`;
  const subject = encodeURIComponent(`Dueño de cancha: ${venueName}`);
  const body = encodeURIComponent(
    `Hola,\n\nSoy el dueño / encargado de ${venueName}.\nSlug: ${venueSlug}\nFicha: ${pageUrl}\n\nQuiero destacar o actualizar la ficha en BaFut.\n`,
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function VenueOwnerBlock({
  venueName,
  venueSlug,
  hasActivity,
  matchCount = 0,
  openSlots = 0,
  isVenueOwner = false,
  canClaim = false,
  claimPending = false,
}: {
  venueName: string;
  venueSlug: string;
  hasActivity: boolean;
  matchCount?: number;
  openSlots?: number;
  isVenueOwner?: boolean;
  canClaim?: boolean;
  claimPending?: boolean;
}) {
  const wa = ownerWhatsappHref(venueName, venueSlug);
  const mail = ownerEmailHref(venueName, venueSlug);

  return (
    <aside className="venue-owner-block" aria-labelledby="venue-owner-heading">
      <h2 id="venue-owner-heading">¿Sos el dueño?</h2>
      {matchCount > 0 && (
        <p className="venue-section-meta">
          Ahora hay {matchCount} {matchCount === 1 ? "hueco abierto" : "huecos abiertos"}
          {openSlots > 0 && ` · ${openSlots} ${openSlots === 1 ? "cupo" : "cupos"}`}
        </p>
      )}
      {isVenueOwner ? (
        <p>
          Esta ficha está a tu nombre: el contacto y las fotos que cargaste son los oficiales.
          BaFut no cobra el alquiler ni reserva por vos: concentra la demanda.
        </p>
      ) : claimPending ? (
        <p>
          Esta cancha tiene un reclamo en revisión. Un editor de BaFut lo está verificando.
          BaFut no cobra el alquiler ni reserva por vos: concentra la demanda.
        </p>
      ) : canClaim ? (
        <p>
          Reclamar la ficha es gratis y toma dos minutos: el contacto pasa a ser el tuyo y la
          cancha luce el sello de verificada. BaFut no reserva ni cobra el alquiler — concentra
          la demanda.
        </p>
      ) : (
        <p>
          {hasActivity
            ? "Acá se ven las pateadas que se arman en tu cancha. BaFut no cobra el alquiler ni reserva por vos: concentra la demanda."
            : "Cuando publiquen huecos acá, aparecen aquí. Escribimos si querés destacar la ficha."}
        </p>
      )}
      {canClaim ? (
        <div className="venue-owner-actions">
          <Link className="btn-flood" href={`/canchas/${venueSlug}/reclamar`}>
            Reclamar esta cancha
          </Link>
          {wa || mail ? (
            <>
              {wa ? (
                <VenueOwnerCta className="btn-ghost" href={wa} target="_blank" rel="noopener noreferrer" method="whatsapp">
                  O escribir por WhatsApp
                </VenueOwnerCta>
              ) : null}
              {mail ? (
                <VenueOwnerCta className="btn-ghost" href={mail} method="email">
                  O por correo
                </VenueOwnerCta>
              ) : null}
            </>
          ) : null}
        </div>
      ) : isVenueOwner ? (
        <div className="venue-owner-actions">
          <Link className="btn-flood" href={`/canchas/${venueSlug}/admin`}>
            Ir a mi panel
          </Link>
        </div>
      ) : claimPending ? null : (
        wa || mail ? (
          <div className="venue-owner-actions">
            {wa ? (
              <VenueOwnerCta className="btn-flood" href={wa} target="_blank" rel="noopener noreferrer" method="whatsapp">
                Escribir por WhatsApp
              </VenueOwnerCta>
            ) : null}
            {mail ? (
              <VenueOwnerCta className="btn-ghost" href={mail} method="email">
                Escribir por correo
              </VenueOwnerCta>
            ) : null}
          </div>
        ) : null
      )}
      <p className="venue-section-meta" style={{ marginTop: "0.75rem" }}>
        También podés{" "}
        <Link href="/apoyar">apoyar BaFut</Link>
        {" · "}
        open source, sin paywall.
      </p>
    </aside>
  );
}
