"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  parseAlertFormat,
  parseAlertLevel,
  parseAlertNeighborhood,
  parseAlertSport,
} from "@/lib/match-alerts";
import { createClient } from "@/lib/supabase/server";

export type AlertActionState = { error?: string; ok?: boolean } | null;

export async function createMatchAlertAction(
  _prev: AlertActionState,
  formData: FormData,
): Promise<AlertActionState> {
  if (!(await isFeatureEnabled("push_alerts"))) {
    return { error: "Las alertas push están deshabilitadas." };
  }

  const { userId } = await requireUserId("/perfil/alertas");
  const supabase = await createClient();

  const cityId = String(formData.get("city_id") ?? "").trim();
  if (!cityId) return { error: "Elegí una ciudad." };

  const sport = parseAlertSport(formData.get("sport"));
  const format = parseAlertFormat(formData.get("format"));
  const level = parseAlertLevel(formData.get("level"));
  const neighborhood = parseAlertNeighborhood(formData.get("neighborhood"));

  const { error } = await supabase.from("match_alerts").insert({
    user_id: userId,
    city_id: cityId,
    sport,
    format,
    level,
    neighborhood,
    enabled: true,
  });

  if (error) {
    if (/Máximo 5/i.test(error.message)) {
      return { error: "Máximo 5 alertas por cuenta." };
    }
    return { error: error.message };
  }

  revalidatePath("/perfil/alertas");
  return { ok: true };
}

export async function toggleMatchAlertAction(
  _prev: AlertActionState,
  formData: FormData,
): Promise<AlertActionState> {
  const { userId } = await requireUserId("/perfil/alertas");
  const supabase = await createClient();
  const id = String(formData.get("alert_id") ?? "").trim();
  const enabled = formData.get("enabled") === "true";
  if (!id) return { error: "Alerta inválida." };

  const { error } = await supabase
    .from("match_alerts")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  revalidatePath("/perfil/alertas");
  return { ok: true };
}

export async function deleteMatchAlertAction(
  _prev: AlertActionState,
  formData: FormData,
): Promise<AlertActionState> {
  const { userId } = await requireUserId("/perfil/alertas");
  const supabase = await createClient();
  const id = String(formData.get("alert_id") ?? "").trim();
  if (!id) return { error: "Alerta inválida." };

  const { error } = await supabase
    .from("match_alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  revalidatePath("/perfil/alertas");
  return { ok: true };
}
