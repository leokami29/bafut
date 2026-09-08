"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { isUuid } from "@/lib/ids";

export type SubscriptionReviewState = { ok?: true; error?: string; subscriptionId?: string };

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
  const { data, error } = await supabase.rpc("approve_venue_subscription_request", {
    p_request_id: requestId,
    p_duration_days: durationDays,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/venues");
  revalidatePath("/admin");
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
  const { error } = await supabase.rpc("reject_venue_subscription_request", {
    p_request_id: requestId,
    p_reason: reason || undefined,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin");
  return { ok: true };
}
