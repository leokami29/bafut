import { NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";

type Body = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  unsubscribe?: boolean;
};

/**
 * Guarda o elimina una Web Push subscription del usuario autenticado.
 * Opt-in explícito: el cliente solo llama tras Notification.permission === "granted".
 */
export async function POST(request: Request) {
  if (!(await isFeatureEnabled("push_alerts"))) {
    return NextResponse.json({ error: "Push deshabilitado" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim() ?? "";
  if (endpoint.length < 10 || endpoint.length > 2048) {
    return NextResponse.json({ error: "Endpoint inválido" }, { status: 400 });
  }

  if (body.unsubscribe) {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, unsubscribed: true });
  }

  const p256dh = body.keys?.p256dh?.trim() ?? "";
  const authKey = body.keys?.auth?.trim() ?? "";
  if (!p256dh || !authKey || p256dh.length > 256 || authKey.length > 256) {
    return NextResponse.json({ error: "Keys inválidas" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 240) ?? null;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth: authKey,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
