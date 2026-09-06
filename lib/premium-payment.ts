/** Configuración de pago manual Premium (Nequi / transferencia). Todo vía env. */

export type PremiumPaymentMethod = "nequi" | "bank_transfer";

export type PremiumPaymentInstructions = {
  priceCop: number;
  durationDays: number;
  nequi: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  /** True si hay al menos un canal de pago configurado. */
  hasPaymentChannel: boolean;
};

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Instrucciones visibles al dueño. Defaults conservadores si faltan env. */
export function getPremiumPaymentInstructions(): PremiumPaymentInstructions {
  const nequi = process.env.NEXT_PUBLIC_PREMIUM_NEQUI?.trim() || null;
  const bankName = process.env.NEXT_PUBLIC_PREMIUM_BANK_NAME?.trim() || null;
  const bankAccount = process.env.NEXT_PUBLIC_PREMIUM_BANK_ACCOUNT?.trim() || null;
  const bankHolder = process.env.NEXT_PUBLIC_PREMIUM_BANK_HOLDER?.trim() || null;

  return {
    priceCop: positiveInt(process.env.NEXT_PUBLIC_PREMIUM_PRICE_COP, 49900),
    durationDays: positiveInt(process.env.NEXT_PUBLIC_PREMIUM_DURATION_DAYS, 30),
    nequi,
    bankName,
    bankAccount,
    bankHolder,
    hasPaymentChannel: Boolean(nequi || (bankName && bankAccount)),
  };
}

export function formatCop(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function paymentMethodLabel(method: PremiumPaymentMethod | string): string {
  if (method === "nequi") return "Nequi";
  if (method === "bank_transfer") return "Transferencia bancaria";
  if (method === "manual") return "Manual";
  return method;
}
