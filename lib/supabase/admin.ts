import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { supabaseUrl } from "@/lib/env";

/**
 * Mensaje para Server Actions cuando falta la service role.
 * Las tablas `bm_*` no tienen políticas INSERT/UPDATE para `authenticated`
 * (solo SELECT); brackets-manager escribe vía service_role en el servidor.
 */
export const SERVICE_ROLE_CONFIG_ERROR =
  "Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor. En local agregala a `.env.local` (Dashboard Supabase → Settings → API → service_role). Es necesaria para generar brackets y confirmar resultados; nunca la expongas como NEXT_PUBLIC_.";

/**
 * Cliente service_role para cron / jobs / escritura bm_* (bypassa RLS).
 * Solo server-side. Nunca exponer la key al browser.
 */
export function createServiceClient(): SupabaseClient<Database> {
  const client = tryCreateServiceClient();
  if (!client) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  }
  return client;
}

/** Igual que `createServiceClient`, o `null` si la key no está configurada. */
export function tryCreateServiceClient(): SupabaseClient<Database> | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) return null;
  return createClient<Database>(supabaseUrl(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
