"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type VenueClaimFormProps = {
  venueId: string;
  venueName: string;
  slug: string;
};

export function VenueClaimForm({ venueId, venueName, slug }: VenueClaimFormProps) {
  const router = useRouter();
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: rpcError } = await supabase.rpc("claim_venue", {
      p_venue_id: venueId,
      p_whatsapp: whatsapp || undefined,
      p_email: email || undefined,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  if (success) {
    return (
      <div className="venue-claim-card venue-claim-success">
        <p className="eyebrow">Cancha reclamada</p>
        <h2>¡Listo, la ficha es tuya!</h2>
        <p>
          Ahora <strong>{venueName}</strong> está a tu nombre. Podés acceder al panel de
          administración para gestionar tu cancha.
        </p>
        <Link href={`/canchas/${slug}/admin`} className="btn-flood">
          Ir al panel de administración
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="stack-form venue-claim-form">
      <label htmlFor="whatsapp">
        WhatsApp <span className="optional">(opcional)</span>
        <input
          id="whatsapp"
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="300 123 4567"
        />
      </label>

      <label htmlFor="email">
        Email <span className="optional">(opcional)</span>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
        />
      </label>

      <p className="venue-claim-note">
        Dejá al menos un contacto para que podamos confirmar que la cancha es tuya. Tu
        WhatsApp y correo quedan visibles en la ficha para que los grupos te escriban.
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn-flood" disabled={loading}>
        {loading ? "Reclamando…" : "Reclamar cancha"}
      </button>
    </form>
  );
}
