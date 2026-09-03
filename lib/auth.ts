import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUserId(nextPath?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) {
    const next = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/entrar${next}`);
  }
  return { supabase, userId };
}
