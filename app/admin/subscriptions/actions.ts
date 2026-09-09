"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { isUuid } from "@/lib/ids";

export type SubscriptionReviewState = { ok?: true; error?: string; subscriptionId?: string };

async function revalidateVenueSubscriptionPaths(slug: string | null | undefined) {
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/premium");
  revalidatePath("/admin/venues");
  revalidatePath("/admin");
  if (slug) {
    revalidatePath(`/canchas/${slug}/admin`);
    revalidatePath(`/canchas/${slug}/admin/torneos`);
    revalidatePath(`/canchas/${slug}`);
  }
}

export async function approveSubscriptionRequestAction(
  _prev: SubscriptionReviewState | undefined,
  formData: FormData,
): Promise<SubscriptionReviewState> {
  const requestId = String(formData.get("request_id") ?? "");
  const durationRaw = String(formData.get("duration_days") ?? "").trim();
  if (!isUuid(requestId)) return { error: "Solicitud no válida." };

  const durationDays = durationRaw
    ? Number.parseInt(durationRaw, 10)
    : undefined;
  if (
    durationRaw &&
    (!Number.isFinite(durationDays) || (durationDays ?? 0) < 1 || (durationDays ?? 0) > 366)
  ) {
    return { error: "Duración no válida (1–366 días)." };
  }

  const { supabase } = await requireUserId("/admin/subscriptions");

  const { data: reqRow } = await supabase
    .from("venue_subscription_requests")
    .select("venues ( slug )")
    .eq("id", requestId)
    .maybeSingle();
  const venueRel = reqRow?.venues as { slug?: string } | { slug?: string }[] | null | undefined;
  const venueSlug = Array.isArray(venueRel) ? venueRel[0]?.slug : venueRel?.slug;

  const { data, error } = await supabase.rpc("approve_venue_subscription_request", {
    p_request_id: requestId,
    p_duration_days: durationDays,
  });
  if (error) return { error: error.message };

  await revalidateVenueSubscriptionPaths(venueSlug ?? null);
  return { ok: true, subscriptionId: data ?? undefined };
}

export async function rejectSubscriptionRequestAction(
  _prev: SubscriptionReviewState | undefined,
  formData: FormData,
): Promise<SubscriptionReviewState> {
  const requestId = String(formData.get("request_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!isUuid(requestId)) return { error: "Solicitud no válida." };

  const { supabase } = await requireUserId("/admin/subscriptions");

  const { data: reqRow } = await supabase
    .from("venue_subscription_requests")
    .select("venues ( slug )")
    .eq("id", requestId)
    .maybeSingle();
  const venueRel = reqRow?.venues as { slug?: string } | { slug?: string }[] | null | undefined;
  const venueSlug = Array.isArray(venueRel) ? venueRel[0]?.slug : venueRel?.slug;

  const { error } = await supabase.rpc("reject_venue_subscription_request", {
    p_request_id: requestId,
    p_reason: reason || undefined,
  });
  if (error) return { error: error.message };

  await revalidateVenueSubscriptionPaths(venueSlug ?? null);
  return { ok: true };
}
