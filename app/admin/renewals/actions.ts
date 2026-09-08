"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { isUuid } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

export type RenewalActionState = { error?: string; ok?: boolean } | null;

export async function markRenewalSentAction(
  _prev: RenewalActionState,
  formData: FormData,
): Promise<RenewalActionState> {
  const { userId } = await requireUserId("/admin/renewals");
  const supabase = await createClient();

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!admin) return { error: "Sin permiso." };

  const id = String(formData.get("reminder_id") ?? "").trim();
  if (!isUuid(id)) return { error: "Recordatorio inválido." };

  const { error } = await supabase
    .from("subscription_renewal_reminders")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidatePath("/admin/renewals");
  return { ok: true };
}

export async function skipRenewalAction(
  _prev: RenewalActionState,
  formData: FormData,
): Promise<RenewalActionState> {
  const { userId } = await requireUserId("/admin/renewals");
  const supabase = await createClient();

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!admin) return { error: "Sin permiso." };

  const id = String(formData.get("reminder_id") ?? "").trim();
  if (!isUuid(id)) return { error: "Recordatorio inválido." };

  const { error } = await supabase
    .from("subscription_renewal_reminders")
    .update({
      status: "skipped",
      sent_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidatePath("/admin/renewals");
  return { ok: true };
}
