import { redirect } from "next/navigation";
import { isProfilePurged } from "@/lib/account-deletion";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PURGED_ACCOUNT_AUTH_ERROR = "cuenta_eliminada";

async function signOutIfProfilePurged(
  supabase: SupabaseClient,
  userId: string,
  profile?: { deleted_at?: string | null } | null,
): Promise<boolean> {
  if (profile !== undefined) {
    if (profile && isProfilePurged(profile)) {
      await supabase.auth.signOut();
      return true;
    }
    return false;
  }

  const { data } = await supabase
    .from("profiles")
    .select("deleted_at")
    .eq("id", userId)
    .maybeSingle();

  if (data && isProfilePurged(data)) {
    await supabase.auth.signOut();
    return true;
  }
  return false;
}

export async function requireUserId(nextPath?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) {
    const next = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/entrar${next}`);
  }

  if (await signOutIfProfilePurged(supabase, userId)) {
    redirect(`/entrar?auth_error=${PURGED_ACCOUNT_AUTH_ERROR}`);
  }

  return { supabase, userId };
}

/** Cierra sesión si el perfil ya fue tombstone (p. ej. purge parcial). */
export async function rejectPurgedProfileSession(
  supabase: SupabaseClient,
  userId: string,
  profile: { deleted_at?: string | null } | null,
): Promise<void> {
  if (await signOutIfProfilePurged(supabase, userId, profile)) {
    redirect(`/entrar?auth_error=${PURGED_ACCOUNT_AUTH_ERROR}`);
  }
}
