"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import {
  bookingOwnerNotifyHref,
  bookingOwnerNotifyMessage,
  formatBookingWhen,
  isBookingDuration,
  isBookingPaymentMethod,
  normalizeBookingWhatsapp,
} from "@/lib/booking";
import {
  BOOKING_PROOFS_BUCKET,
  bookingProofObjectPath,
  validateBookingProofFile,
} from "@/lib/booking-proofs";
import { datetimeLocalInZoneToDate } from "@/lib/datetime";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { legalAcceptErrorMessage } from "@/lib/legal";
import type { Sport } from "@/lib/constants";
import { sportLabel } from "@/lib/labels";
import { isSport } from "@/lib/sport-rules";
import { createClient } from "@/lib/supabase/server";

export type SubmitVenueBookingState = {
  ok?: true;
  bookingId?: string;
  ownerWhatsappHref?: string | null;
  error?: string;
};

export type CancelVenueBookingState = { ok?: true; error?: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function formFlag(formData: FormData, key: string): boolean {
  const raw = String(formData.get(key) ?? "").toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

/**
 * Jugador: subir comprobante + submit_venue_booking.
 * Form: venue_id, sport, starts_at (datetime-local), duration_min, payment_method,
 * contact_whatsapp, note?, legal_accepted, proof (File) | proof_path.
 */
export async function submitVenueBookingAction(
  slug: string,
  _prev: SubmitVenueBookingState | undefined,
  formData: FormData,
): Promise<SubmitVenueBookingState> {
  const nextPath = `/canchas/${slug}/turno`;
  if (!(await isFeatureEnabled("venue_booking"))) {
    return { error: "Las reservas no están disponibles ahora." };
  }

  const { supabase, userId } = await requireUserId(nextPath);

  const venueId = String(formData.get("venue_id") ?? "").trim();
  if (!isUuid(venueId)) return { error: "Cancha no válida." };

  const sportRaw = String(formData.get("sport") ?? "").trim();
  if (!isSport(sportRaw)) return { error: "Elige un deporte válido." };
  const sport: Sport = sportRaw;

  const durationMin = Number(formData.get("duration_min") ?? 0);
  if (!isBookingDuration(durationMin)) {
    return { error: "La duración debe ser 30, 60 o 90 minutos." };
  }

  const paymentMethod = String(formData.get("payment_method") ?? "").trim();
  if (!isBookingPaymentMethod(paymentMethod)) {
    return { error: "Método de pago no válido." };
  }

  const whatsapp = normalizeBookingWhatsapp(String(formData.get("contact_whatsapp") ?? ""));
  if (!whatsapp) {
    return { error: "WhatsApp inválido. Usá un celular colombiano (3XX…)." };
  }

  if (!formFlag(formData, "legal_accepted")) {
    return { error: legalAcceptErrorMessage("booking") };
  }

  const noteRaw = String(formData.get("note") ?? "").trim();
  const note = noteRaw ? noteRaw.slice(0, 300) : undefined;

  const { data: venueRow, error: venueError } = await supabase
    .from("venues")
    .select("id, name, slug, contact_whatsapp, cities ( timezone )")
    .eq("id", venueId)
    .maybeSingle();

  if (venueError || !venueRow) {
    return { error: "Cancha no encontrada." };
  }

  const cityJoin = venueRow.cities as { timezone: string } | { timezone: string }[] | null;
  const timezone = Array.isArray(cityJoin)
    ? cityJoin[0]?.timezone
    : cityJoin?.timezone;
  if (!timezone) {
    return { error: "No se pudo resolver el horario de la cancha." };
  }

  const startsRaw = String(formData.get("starts_at") ?? "").trim();
  const startsAt = datetimeLocalInZoneToDate(startsRaw, timezone);
  if (!startsAt) {
    return { error: "Elige un día y hora válidos." };
  }

  let proofPath = String(formData.get("proof_path") ?? "").trim();
  const proofEntry = formData.get("proof");
  const proofFile = proofEntry instanceof File && proofEntry.size > 0 ? proofEntry : null;

  if (!proofPath && proofFile) {
    const check = validateBookingProofFile(proofFile);
    if ("error" in check) return { error: check.error };

    proofPath = bookingProofObjectPath(venueId, userId, proofFile.name);
    const { error: uploadError } = await supabase.storage
      .from(BOOKING_PROOFS_BUCKET)
      .upload(proofPath, proofFile, { contentType: proofFile.type, upsert: false });
    if (uploadError) {
      return { error: `No se pudo subir el comprobante: ${uploadError.message}` };
    }
  }

  if (!proofPath) {
    return { error: "Subí el comprobante de pago (imagen o PDF)." };
  }

  const { data: bookingId, error } = await supabase.rpc("submit_venue_booking", {
    p_venue_id: venueId,
    p_sport: sport,
    p_starts_at: startsAt.toISOString(),
    p_duration_min: durationMin,
    p_payment_method: paymentMethod,
    p_proof_path: proofPath,
    p_contact_whatsapp: whatsapp,
    p_note: note,
  });

  if (error) {
    if (proofFile) {
      await supabase.storage.from(BOOKING_PROOFS_BUCKET).remove([proofPath]);
    }
    return { error: error.message };
  }

  const { data: bookingRow } = await supabase
    .from("venue_bookings")
    .select("final_cop, starts_at, duration_min, sport")
    .eq("id", bookingId)
    .maybeSingle();

  const whenLabel = formatBookingWhen(
    bookingRow?.starts_at ?? startsAt.toISOString(),
    timezone,
  );
  const message = bookingOwnerNotifyMessage({
    venueName: venueRow.name,
    sportLabel: sportLabel[sport] ?? sport,
    whenLabel,
    durationMin: bookingRow?.duration_min ?? durationMin,
    finalCop: bookingRow?.final_cop ?? 0,
    playerWhatsapp: whatsapp,
  });
  const ownerWhatsappHref = bookingOwnerNotifyHref(venueRow.contact_whatsapp, message);

  revalidatePath(nextPath);
  revalidatePath(`/canchas/${slug}`);
  revalidatePath("/perfil/turnos");
  revalidatePath(`/canchas/${slug}/admin/turnos`);

  return {
    ok: true,
    bookingId: bookingId ?? undefined,
    ownerWhatsappHref,
  };
}

/** Jugador: cancel_venue_booking (pending siempre; confirmed si ≥12h). */
export async function cancelVenueBookingAction(
  slug: string | null,
  _prev: CancelVenueBookingState | undefined,
  formData: FormData,
): Promise<CancelVenueBookingState> {
  const bookingId = String(formData.get("booking_id") ?? "").trim();
  if (!isUuid(bookingId)) return { error: "Reserva no válida." };

  const nextPath = slug ? `/canchas/${slug}/turno` : "/perfil/turnos";
  const { supabase } = await requireUserId(nextPath);

  const { error } = await supabase.rpc("cancel_venue_booking", {
    p_booking_id: bookingId,
  });
  if (error) return { error: error.message };

  revalidatePath("/perfil/turnos");
  if (slug) {
    revalidatePath(`/canchas/${slug}`);
    revalidatePath(`/canchas/${slug}/turno`);
    revalidatePath(`/canchas/${slug}/admin/turnos`);
  }
  return { ok: true };
}
