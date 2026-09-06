import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Cron job: crea partidos desde templates activos.
 *
 * Se ejecuta diariamente a las 00:00 (configurar en Railway/Vercel cron).
 * Para cada template activo con day_of_week = hoy, crea un partido si no existe.
 *
 * Protegido con CRON_SECRET vía Authorization Bearer.
 * Respuesta sin PII (solo ids de template/match y mensajes de error de RPC).
 */
export async function GET(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const supabase = await createClient();

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=domingo, 6=sábado
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

  const { data: templates, error: fetchError } = await supabase
    .from("match_templates")
    .select("id, day_of_week")
    .eq("active", true)
    .eq("day_of_week", dayOfWeek);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const results: Array<{ template_id: string; match_id?: string; error?: string }> = [];

  for (const template of templates ?? []) {
    try {
      const { data: matchId, error: rpcError } = await supabase.rpc(
        "create_match_from_template",
        {
          p_template_id: template.id,
          p_run_date: todayStr,
        },
      );

      if (rpcError) {
        results.push({
          template_id: template.id,
          error: rpcError.message,
        });
      } else {
        results.push({
          template_id: template.id,
          match_id: matchId,
        });
      }
    } catch (err) {
      results.push({
        template_id: template.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    date: todayStr,
    templates_processed: templates?.length ?? 0,
    results,
  });
}
