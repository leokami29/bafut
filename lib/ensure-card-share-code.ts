import { createClient } from "@/lib/supabase/server";
import type { ProfileWithContact } from "@/lib/types";

function newCardShareCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toLowerCase();
}

/** Garantiza un código público para /carta y /jugador (migración o purge puede dejarlo null). */
export async function ensureProfileCardShareCode(
  profile: ProfileWithContact,
): Promise<ProfileWithContact> {
  if (profile.card_share_code?.trim()) return profile;

  const supabase = await createClient();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = newCardShareCode();
    const { data, error } = await supabase
      .from("profiles")
      .update({ card_share_code: code })
      .eq("id", profile.id)
      .select("card_share_code")
      .maybeSingle();

    if (!error && data?.card_share_code) {
      return { ...profile, card_share_code: data.card_share_code };
    }

    // Otro proceso ya lo asignó, o el update no devolvió fila
    const { data: refreshed } = await supabase
      .from("profiles")
      .select("card_share_code")
      .eq("id", profile.id)
      .maybeSingle();
    if (refreshed?.card_share_code?.trim()) {
      return { ...profile, card_share_code: refreshed.card_share_code };
    }

    // Colisión de unique u RLS: reintentar con otro código
    if (error) continue;
  }

  return profile;
}
