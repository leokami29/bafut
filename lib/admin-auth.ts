import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AdminRole = "moderation" | "billing" | "super";

/** Rol del admin (RLS: solo ve su fila). null si no es admin. */
export const getAdminRole = cache(async (userId: string | null): Promise<AdminRole | null> => {
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("admins")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  const role = data?.role;
  if (role === "moderation" || role === "billing" || role === "super") return role;
  return null;
});

/** billing o super (plata + flags). */
export function isBillingAdmin(role: AdminRole | null): boolean {
  return role === "billing" || role === "super";
}

export async function requireBillingAdmin(
  userId: string,
): Promise<{ ok: true; role: AdminRole } | { ok: false }> {
  const role = await getAdminRole(userId);
  if (!isBillingAdmin(role)) return { ok: false };
  return { ok: true, role: role! };
}
