import { NextResponse } from "next/server";

/**
 * Autoriza cron jobs con `Authorization: Bearer ${CRON_SECRET}`.
 * Si falta el secreto en env o el header no coincide → 401.
 * Nunca loguear el secreto ni el header completo.
 */
export function requireCronSecret(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
