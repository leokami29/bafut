import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { recentReviewCutoffIso } from "@/lib/venue-claims";

export type OldestQueueItem = {
  venueName: string | null;
  createdAt: string;
};

export type AdminQueueCounts = {
  pendingClaims: number;
  resolvedClaims24h: number;
  pendingSubRequests: number;
  pendingRenewals: number;
  totalVenues: number;
  oldestClaim: OldestQueueItem | null;
  oldestSubRequest: OldestQueueItem | null;
};

/** Contadores de las colas del panel de administración (para marcador y accesos). */
export const getAdminQueueCounts = cache(async (): Promise<AdminQueueCounts> => {
  const supabase = await createClient();
  const [claims, resolved, subs, renewals, venues, oldestClaim, oldestSub] = await Promise.all([
    supabase
      .from("venue_claims")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("venue_claims")
      .select("id", { count: "exact", head: true })
      .in("status", ["approved", "rejected"])
      .gte("reviewed_at", recentReviewCutoffIso()),
    supabase
      .from("venue_subscription_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("subscription_renewal_reminders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("venues").select("id", { count: "exact", head: true }),
    supabase
      .from("venue_claims")
      .select("created_at, venues ( name )")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1),
    supabase
      .from("venue_subscription_requests")
      .select("created_at, venues ( name )")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1),
  ]);
  const oldestClaimRow = (oldestClaim.data ?? [])[0] ?? null;
  const oldestSubRow = (oldestSub.data ?? [])[0] ?? null;
  return {
    pendingClaims: claims.count ?? 0,
    resolvedClaims24h: resolved.count ?? 0,
    pendingSubRequests: subs.count ?? 0,
    pendingRenewals: renewals.count ?? 0,
    totalVenues: venues.count ?? 0,
    oldestClaim: oldestClaimRow
      ? {
          venueName:
            (oldestClaimRow.venues as { name?: string } | null)?.name ?? null,
          createdAt: oldestClaimRow.created_at,
        }
      : null,
    oldestSubRequest: oldestSubRow
      ? {
          venueName:
            (oldestSubRow.venues as { name?: string } | null)?.name ?? null,
          createdAt: oldestSubRow.created_at,
        }
      : null,
  };
});

/** Edad de un ítem en cola, legible y determinista (nowMs lo pasa el server). */
export function formatQueueAge(createdAtIso: string, nowMs: number): string {
  const diffMs = nowMs - new Date(createdAtIso).getTime();
  if (diffMs < 60_000) return "recién";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}

/** Días (con fracción legible) para acentuar reclamos viejos. */
export function queueAgeUrgency(createdAtIso: string, nowMs: number): QueueUrgency {
  const hours = (nowMs - new Date(createdAtIso).getTime()) / 3_600_000;
  if (hours < 6) return "fresh";
  if (hours < 48) return "waiting";
  return "overdue";
}

export type QueueUrgency = "fresh" | "waiting" | "overdue";

export type Aged = { ageLabel: string; urgency: QueueUrgency };

/**
 * Enriquece filas de cola con edad precalculada (el nowMs nace acá, no en render).
 * Las páginas server llaman esto y los paneles client solo muestran el resultado.
 */
export function withQueueAges<T extends { created_at: string }>(rows: T[]): Array<T & Aged> {
  const nowMs = Date.now();
  return rows.map((row) => ({
    ...row,
    ageLabel: formatQueueAge(row.created_at, nowMs),
    urgency: queueAgeUrgency(row.created_at, nowMs),
  }));
}

/** Línea "el más viejo espera hace X · Nombre" para la mesa. */
export function formatOldestDetail(oldest: OldestQueueItem | null, suffix: string): string {
  if (!oldest) return "";
  const nowMs = Date.now();
  return `El más viejo espera ${formatQueueAge(oldest.createdAt, nowMs)}${oldest.venueName ? ` · ${oldest.venueName}` : ""} · ${suffix}`;
}
