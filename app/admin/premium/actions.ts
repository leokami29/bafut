"use server";

import { revalidatePath } from "next/cache";
import { requireBillingAdmin } from "@/lib/admin-auth";
import { requireUserId } from "@/lib/auth";
import { FEATURE_FLAG_KEYS, type FeatureFlagKey } from "@/lib/feature-flags";
import { isUuid } from "@/lib/ids";

export type AdminActionState = { ok?: true; error?: string; id?: string };

/** Fecha YYYY-MM-DD → mediodía / fin de día America/Bogota (-05). */
function parseAdminDate(raw: string, kind: "start" | "end"): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (m) {
    const iso =
      kind === "start"
        ? `${m[1]}-${m[2]}-${m[3]}T00:00:00-05:00`
        : `${m[1]}-${m[2]}-${m[3]}T23:59:59-05:00`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function revalidatePremiumPaths(slug?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/flags");
  revalidatePath("/admin/premium");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/venues");
  revalidatePath("/admin/renewals");
  if (slug) {
    revalidatePath(`/canchas/${slug}/admin`);
    revalidatePath(`/canchas/${slug}/admin/torneos`);
    revalidatePath(`/canchas/${slug}`);
    revalidatePath(`/canchas/${slug}/torneos`);
  }
}

async function venueSlugById(
  supabase: Awaited<ReturnType<typeof requireUserId>>["supabase"],
  venueId: string,
): Promise<string | null> {
  const { data } = await supabase.from("venues").select("slug").eq("id", venueId).maybeSingle();
  return data?.slug ?? null;
}

function isFeatureKey(value: string): value is FeatureFlagKey {
  return (FEATURE_FLAG_KEYS as readonly string[]).includes(value);
}

export async function setFeatureFlagAction(
  _prev: AdminActionState | undefined,
  formData: FormData,
): Promise<AdminActionState> {
  const key = String(formData.get("key") ?? "").trim();
  const enabledRaw = String(formData.get("enabled") ?? "").trim();
  const enabled = enabledRaw === "1" || enabledRaw === "true";

  if (!isFeatureKey(key)) return { error: "Flag no válida." };

  const { supabase, userId } = await requireUserId("/admin/flags");
  const gate = await requireBillingAdmin(userId);
  if (!gate.ok) return { error: "Sin permiso (billing/super)." };

  const { error } = await supabase.rpc("admin_set_feature_flag", {
    p_key: key,
    p_enabled: enabled,
  });
  if (error) return { error: error.message };

  revalidatePremiumPaths();
  return { ok: true };
}

export async function updatePremiumPlanConfigAction(
  _prev: AdminActionState | undefined,
  formData: FormData,
): Promise<AdminActionState> {
  const dailyRate = Number.parseInt(String(formData.get("daily_rate_cop") ?? ""), 10);
  const days = Number.parseInt(String(formData.get("default_duration_days") ?? ""), 10);
  const listRaw = String(formData.get("list_price_cop") ?? "").trim();
  const listPrice = listRaw ? Number.parseInt(listRaw, 10) : null;

  if (!Number.isFinite(dailyRate) || dailyRate < 0) {
    return { error: "Precio por día no válido." };
  }
  if (!Number.isFinite(days) || days < 1 || days > 366) {
    return { error: "Duración default no válida (1–366)." };
  }
  if (listPrice != null && (!Number.isFinite(listPrice) || listPrice < 0)) {
    return { error: "Precio de lista no válido." };
  }

  const { supabase, userId } = await requireUserId("/admin/premium");
  const gate = await requireBillingAdmin(userId);
  if (!gate.ok) return { error: "Sin permiso (billing/super)." };

  const { error } = await supabase.rpc("admin_update_premium_plan_config", {
    p_daily_rate_cop: dailyRate,
    p_default_duration_days: days,
    p_list_price_cop: listPrice ?? undefined,
  });
  if (error) return { error: error.message };

  revalidatePremiumPaths();
  return { ok: true };
}

export async function grantVenuePremiumAction(
  _prev: AdminActionState | undefined,
  formData: FormData,
): Promise<AdminActionState> {
  const venueId = String(formData.get("venue_id") ?? "").trim();
  if (!isUuid(venueId)) return { error: "Cancha no válida." };

  const startedRaw = String(formData.get("started_at") ?? "").trim();
  const expiresRaw = String(formData.get("expires_at") ?? "").trim();
  const amount = Number.parseInt(String(formData.get("amount_cop") ?? "0"), 10);
  const dailyRateRaw = String(formData.get("daily_rate_cop") ?? "").trim();
  const dailyRate = dailyRateRaw ? Number.parseInt(dailyRateRaw, 10) : null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);

  if (!startedRaw || !expiresRaw) return { error: "Indicá inicio y fin." };
  const startedAt = parseAdminDate(startedRaw, "start");
  const expiresAt = parseAdminDate(expiresRaw, "end");
  if (!startedAt || !expiresAt) {
    return { error: "Fechas no válidas." };
  }
  if (expiresAt.getTime() <= startedAt.getTime()) {
    return { error: "La fecha de fin debe ser posterior al inicio." };
  }
  const days = Math.ceil((expiresAt.getTime() - startedAt.getTime()) / 86_400_000);
  if (days > 366) return { error: "Duración máxima 366 días." };
  if (!Number.isFinite(amount) || amount < 0) return { error: "Monto no válido." };

  const { supabase, userId } = await requireUserId("/admin/premium");
  const gate = await requireBillingAdmin(userId);
  if (!gate.ok) return { error: "Sin permiso (billing/super)." };

  const { data, error } = await supabase.rpc("admin_grant_venue_premium", {
    p_venue_id: venueId,
    p_started_at: startedAt.toISOString(),
    p_expires_at: expiresAt.toISOString(),
    p_amount_cop: amount,
    p_daily_rate_cop: dailyRate != null && Number.isFinite(dailyRate) ? dailyRate : undefined,
    p_note: note || undefined,
    p_payment_method: "manual",
  });
  if (error) return { error: error.message };

  const slug = await venueSlugById(supabase, venueId);
  revalidatePremiumPaths(slug);
  return { ok: true, id: data ?? undefined };
}

export async function extendVenuePremiumAction(
  _prev: AdminActionState | undefined,
  formData: FormData,
): Promise<AdminActionState> {
  const subscriptionId = String(formData.get("subscription_id") ?? "").trim();
  if (!isUuid(subscriptionId)) return { error: "Suscripción no válida." };

  const expiresRaw = String(formData.get("new_expires_at") ?? "").trim();
  const amountRaw = String(formData.get("amount_cop") ?? "").trim();
  const amount = amountRaw ? Number.parseInt(amountRaw, 10) : null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  const venueId = String(formData.get("venue_id") ?? "").trim();

  if (!expiresRaw) return { error: "Indicá la nueva fecha de vencimiento." };
  const newExpires = parseAdminDate(expiresRaw, "end");
  if (!newExpires) return { error: "Fecha no válida." };
  if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
    return { error: "Monto no válido." };
  }

  const { supabase, userId } = await requireUserId("/admin/premium");
  const gate = await requireBillingAdmin(userId);
  if (!gate.ok) return { error: "Sin permiso (billing/super)." };

  const { data, error } = await supabase.rpc("admin_extend_venue_premium", {
    p_subscription_id: subscriptionId,
    p_new_expires_at: newExpires.toISOString(),
    p_amount_cop: amount ?? undefined,
    p_note: note || undefined,
  });
  if (error) return { error: error.message };

  const slug = isUuid(venueId) ? await venueSlugById(supabase, venueId) : null;
  revalidatePremiumPaths(slug);
  return { ok: true, id: data ?? undefined };
}

export async function cancelVenuePremiumAction(
  _prev: AdminActionState | undefined,
  formData: FormData,
): Promise<AdminActionState> {
  const subscriptionId = String(formData.get("subscription_id") ?? "").trim();
  if (!isUuid(subscriptionId)) return { error: "Suscripción no válida." };

  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  const venueId = String(formData.get("venue_id") ?? "").trim();

  const { supabase, userId } = await requireUserId("/admin/premium");
  const gate = await requireBillingAdmin(userId);
  if (!gate.ok) return { error: "Sin permiso (billing/super)." };

  const { data, error } = await supabase.rpc("admin_cancel_venue_premium", {
    p_subscription_id: subscriptionId,
    p_note: note || undefined,
  });
  if (error) return { error: error.message };

  const slug = isUuid(venueId) ? await venueSlugById(supabase, venueId) : null;
  revalidatePremiumPaths(slug);
  return { ok: true, id: data ?? undefined };
}
