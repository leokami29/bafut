"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { validateClaimProofChecklist } from "@/lib/venue-claims";

export type ClaimReviewState = { ok?: true; error?: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function formFlag(formData: FormData, key: string): boolean {
  const raw = String(formData.get(key) ?? "").toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

export async function approveVenueClaimAction(
  _prev: ClaimReviewState | undefined,
  formData: FormData,
): Promise<ClaimReviewState> {
  const claimId = String(formData.get("claim_id") ?? "");
  if (!isUuid(claimId)) return { error: "Reclamo no válido." };

  const check = validateClaimProofChecklist({
    proofFacade: formFlag(formData, "proof_facade"),
    proofNit: formFlag(formData, "proof_nit"),
    proofCallNote: String(formData.get("proof_call_note") ?? ""),
  });
  if ("error" in check) return { error: check.error };

  const { supabase } = await requireUserId("/admin/claims");
  const { error } = await supabase.rpc("approve_venue_claim", {
    p_claim_id: claimId,
    p_proof_facade: check.proofFacade,
    p_proof_nit: check.proofNit,
    p_proof_call_note: check.proofCallNote ?? undefined,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/claims");
  revalidatePath("/admin/venues");
  return { ok: true };
}

export async function rejectVenueClaimAction(
  _prev: ClaimReviewState | undefined,
  formData: FormData,
): Promise<ClaimReviewState> {
  const claimId = String(formData.get("claim_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!isUuid(claimId)) return { error: "Reclamo no válido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_venue_claim", {
    p_claim_id: claimId,
    p_reason: reason || undefined,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/claims");
  return { ok: true };
}
