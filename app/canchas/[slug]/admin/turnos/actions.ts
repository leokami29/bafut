"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { isBookingDepositPct } from "@/lib/booking";
import { BOOKING_PROOFS_BUCKET } from "@/lib/booking-proofs";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { isUuid } from "@/lib/ids";

export type VenueBookingReviewState = { ok?: true; error?: string };
export type SetBookingEnabledState = { ok?: true; enabled?: boolean; error?: string };
export type SetBookingDepositPctState = {
  ok?: true;
  depositPct?: number;
  error?: string;
};
export type BookingProofUrlState = { url?: string; error?: string };

function formFlag(formData: FormData, key: string): boolean {
  const raw = String(formData.get(key) ?? "").toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

async function revalidateTurnos(slug: string) {
  revalidatePath(`/canchas/${slug}/admin`);
  revalidatePath(`/canchas/${slug}/admin/turnos`);
  revalidatePath(`/canchas/${slug}`);
  revalidatePath("/perfil/turnos");
}

/** Dueño: approve_venue_booking */
export async function approveVenueBookingAction(
  slug: string,
  _prev: VenueBookingReviewState | undefined,
  formData: FormData,
): Promise<VenueBookingReviewState> {
  const bookingId = String(formData.get("booking_id") ?? "").trim();
  if (!isUuid(bookingId)) return { error: "Reserva no válida." };

  const { supabase } = await requireUserId(`/canchas/${slug}/admin/turnos`);
  const { error } = await supabase.rpc("approve_venue_booking", {
    p_booking_id: bookingId,
  });
  if (error) return { error: error.message };

  await revalidateTurnos(slug);
  return { ok: true };
}

/** Dueño: reject_venue_booking */
export async function rejectVenueBookingAction(
  slug: string,
  _prev: VenueBookingReviewState | undefined,
  formData: FormData,
): Promise<VenueBookingReviewState> {
  const bookingId = String(formData.get("booking_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!isUuid(bookingId)) return { error: "Reserva no válida." };

  const { supabase } = await requireUserId(`/canchas/${slug}/admin/turnos`);
  const { error } = await supabase.rpc("reject_venue_booking", {
    p_booking_id: bookingId,
    p_reason: reason || undefined,
  });
  if (error) return { error: error.message };

  await revalidateTurnos(slug);
  return { ok: true };
}

/** Dueño/admin: set_venue_booking_enabled */
export async function setVenueBookingEnabledAction(
  slug: string,
  _prev: SetBookingEnabledState | undefined,
  formData: FormData,
): Promise<SetBookingEnabledState> {
  const venueId = String(formData.get("venue_id") ?? "").trim();
  if (!isUuid(venueId)) return { error: "Cancha no válida." };

  if (!(await isFeatureEnabled("venue_booking"))) {
    return { error: "Las reservas no están disponibles ahora (flag global)." };
  }

  const enabled = formFlag(formData, "booking_enabled");
  const { supabase } = await requireUserId(`/canchas/${slug}/admin`);
  const { error } = await supabase.rpc("set_venue_booking_enabled", {
    p_venue_id: venueId,
    p_enabled: enabled,
  });
  if (error) return { error: error.message };

  await revalidateTurnos(slug);
  return { ok: true, enabled };
}

/** Dueño/admin: set_venue_booking_deposit_pct */
export async function setVenueBookingDepositPctAction(
  slug: string,
  _prev: SetBookingDepositPctState | undefined,
  formData: FormData,
): Promise<SetBookingDepositPctState> {
  const venueId = String(formData.get("venue_id") ?? "").trim();
  if (!isUuid(venueId)) return { error: "Cancha no válida." };

  if (!(await isFeatureEnabled("venue_booking"))) {
    return { error: "Las reservas no están disponibles ahora (flag global)." };
  }

  const depositPct = Number(formData.get("booking_deposit_pct") ?? NaN);
  if (!isBookingDepositPct(depositPct)) {
    return { error: "El abono debe ser 30%, 50%, 70% o 100%." };
  }

  const { supabase } = await requireUserId(`/canchas/${slug}/admin`);
  const { error } = await supabase.rpc("set_venue_booking_deposit_pct", {
    p_venue_id: venueId,
    p_deposit_pct: depositPct,
  });
  if (error) return { error: error.message };

  await revalidateTurnos(slug);
  return { ok: true, depositPct };
}

/**
 * Signed URL del comprobante: solo player del booking, owner de la cancha o admin.
 * No hay RPC pública de URL — esta action es el gate.
 */
export async function getBookingProofSignedUrlAction(
  slug: string,
  _prev: BookingProofUrlState | undefined,
  formData: FormData,
): Promise<BookingProofUrlState> {
  const bookingId = String(formData.get("booking_id") ?? "").trim();
  if (!isUuid(bookingId)) return { error: "Reserva no válida." };

  const { supabase, userId } = await requireUserId(`/canchas/${slug}/admin/turnos`);

  const { data: booking, error: bookingError } = await supabase
    .from("venue_bookings")
    .select("id, player_id, proof_path, venue_id, venues!inner ( owner_id, slug )")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking) {
    return { error: "Reserva no encontrada." };
  }

  const venueJoin = booking.venues as
    | { owner_id: string | null; slug: string }
    | { owner_id: string | null; slug: string }[]
    | null;
  const venue = Array.isArray(venueJoin) ? venueJoin[0] : venueJoin;
  if (!venue || venue.slug !== slug) {
    return { error: "La reserva no corresponde a esta cancha." };
  }

  const isPlayer = booking.player_id === userId;
  const isOwner = venue.owner_id === userId;
  let isAdmin = false;
  if (!isPlayer && !isOwner) {
    const { data: adminOk } = await supabase.rpc("admin_has_role", {
      p_roles: ["super", "moderation", "billing"],
    });
    isAdmin = Boolean(adminOk);
  }

  if (!isPlayer && !isOwner && !isAdmin) {
    return { error: "No tenés permiso para ver este comprobante." };
  }

  const { data, error } = await supabase.storage
    .from(BOOKING_PROOFS_BUCKET)
    .createSignedUrl(booking.proof_path, 60 * 30);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "No se pudo firmar el comprobante." };
  }

  return { url: data.signedUrl };
}

/** Alias tipado para forms que no usan useActionState con prev. */
export async function getBookingProofSignedUrl(
  slug: string,
  bookingId: string,
): Promise<BookingProofUrlState> {
  const fd = new FormData();
  fd.set("booking_id", bookingId);
  return getBookingProofSignedUrlAction(slug, undefined, fd);
}
