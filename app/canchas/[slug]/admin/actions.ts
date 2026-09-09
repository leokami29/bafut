"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { isUuid } from "@/lib/ids";
import { legalAcceptErrorMessage } from "@/lib/legal";
import {
  type PremiumPaymentMethod,
} from "@/lib/premium-payment";
import { getPremiumPaymentInstructionsResolved } from "@/lib/premium-config";
import {
  SUBSCRIPTION_PROOFS_BUCKET,
  subscriptionProofObjectPath,
  validateSubscriptionProofFile,
} from "@/lib/subscription-proofs";

export type SubmitVenuePremiumState = { ok?: true; error?: string };

function formFlag(formData: FormData, key: string): boolean {
  const raw = String(formData.get(key) ?? "").toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

function isPaymentMethod(value: string): value is PremiumPaymentMethod {
  return value === "nequi" || value === "bank_transfer";
}

/**
 * Dueño: upload comprobante + submit_venue_subscription_request.
 * Monto y duración salen del server (env), no del cliente.
 */
export async function submitVenuePremiumRequestAction(
  slug: string,
  _prev: SubmitVenuePremiumState | undefined,
  formData: FormData,
): Promise<SubmitVenuePremiumState> {
  const venueId = String(formData.get("venue_id") ?? "").trim();
  if (!isUuid(venueId)) return { error: "Cancha no válida." };

  const { supabase, userId } = await requireUserId(`/canchas/${slug}/admin`);

  if (!formFlag(formData, "legal_accepted")) {
    return { error: legalAcceptErrorMessage("premium") };
  }

  const instructions = await getPremiumPaymentInstructionsResolved();
  if (!instructions.hasPaymentChannel) {
    return { error: "Todavía no configuramos los datos de pago. Escribinos por WhatsApp." };
  }

  const method = String(formData.get("payment_method") ?? "").trim();
  if (!isPaymentMethod(method)) {
    return { error: "Método de pago no válido." };
  }
  if (method === "nequi" && !instructions.nequi) {
    return { error: "Nequi no está disponible ahora." };
  }
  if (
    method === "bank_transfer" &&
    !(instructions.bankName && instructions.bankAccount)
  ) {
    return { error: "Transferencia no está disponible ahora." };
  }

  const reference = String(formData.get("payment_reference") ?? "")
    .trim()
    .slice(0, 80);

  const proofEntry = formData.get("proof");
  const proofFile = proofEntry instanceof File && proofEntry.size > 0 ? proofEntry : null;
  if (!proofFile) {
    return { error: "Subí el comprobante de pago (imagen o PDF)." };
  }
  const check = validateSubscriptionProofFile(proofFile);
  if ("error" in check) return { error: check.error };

  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("id, slug, owner_id")
    .eq("id", venueId)
    .maybeSingle();

  if (venueError || !venue || venue.slug !== slug) {
    return { error: "Cancha no encontrada." };
  }

  const isOwner = venue.owner_id === userId;
  let isAdmin = false;
  if (!isOwner) {
    const { data: adminOk } = await supabase.rpc("admin_has_role", {
      p_roles: ["super", "billing"],
    });
    isAdmin = Boolean(adminOk);
  }
  if (!isOwner && !isAdmin) {
    return { error: "Solo el dueño de la cancha puede solicitar Premium." };
  }

  const proofPath = subscriptionProofObjectPath(venueId, proofFile.name);
  const { error: uploadError } = await supabase.storage
    .from(SUBSCRIPTION_PROOFS_BUCKET)
    .upload(proofPath, proofFile, { contentType: proofFile.type, upsert: false });
  if (uploadError) {
    return { error: `No se pudo subir el comprobante: ${uploadError.message}` };
  }

  const { error: rpcError } = await supabase.rpc("submit_venue_subscription_request", {
    p_venue_id: venueId,
    p_payment_method: method,
    p_amount_cop: instructions.priceCop,
    p_proof_path: proofPath,
    p_payment_reference: reference || undefined,
    p_plan: "premium",
    p_duration_days: instructions.durationDays,
  });

  if (rpcError) {
    await supabase.storage.from(SUBSCRIPTION_PROOFS_BUCKET).remove([proofPath]);
    return { error: rpcError.message };
  }

  revalidatePath(`/canchas/${slug}/admin`);
  revalidatePath("/admin/subscriptions");
  return { ok: true };
}
