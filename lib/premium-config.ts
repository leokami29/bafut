import { cache } from "react";
import {
  getPremiumPaymentInstructionsFromEnv,
  type PremiumPaymentInstructions,
} from "@/lib/premium-payment";
import { createClient } from "@/lib/supabase/server";

export type PremiumPlanConfig = {
  dailyRateCop: number;
  defaultDurationDays: number;
  listPriceCop: number;
  /** True si vino de DB; false = fallback env. */
  fromDb: boolean;
};

function fromEnvFallback(): PremiumPlanConfig {
  const env = getPremiumPaymentInstructionsFromEnv();
  const days = env.durationDays;
  const list = env.priceCop;
  return {
    dailyRateCop: Math.max(0, Math.round(list / days)),
    defaultDurationDays: days,
    listPriceCop: list,
    fromDb: false,
  };
}

/** Config Premium: DB `premium_plan_config` → fallback env. */
export const getPremiumPlanConfig = cache(async (): Promise<PremiumPlanConfig> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("premium_plan_config")
      .select("daily_rate_cop, default_duration_days, list_price_cop")
      .eq("key", "default")
      .maybeSingle();

    if (data && typeof data.daily_rate_cop === "number") {
      const days = data.default_duration_days > 0 ? data.default_duration_days : 30;
      const list =
        typeof data.list_price_cop === "number" && data.list_price_cop >= 0
          ? data.list_price_cop
          : data.daily_rate_cop * days;
      return {
        dailyRateCop: data.daily_rate_cop,
        defaultDurationDays: days,
        listPriceCop: list,
        fromDb: true,
      };
    }
  } catch {
    // Tabla aún no migrada.
  }
  return fromEnvFallback();
});

/** Instrucciones de pago para dueño: canales env + precio/días desde config DB. */
export async function getPremiumPaymentInstructionsResolved(): Promise<PremiumPaymentInstructions> {
  const env = getPremiumPaymentInstructionsFromEnv();
  const config = await getPremiumPlanConfig();
  return {
    ...env,
    priceCop: config.listPriceCop,
    durationDays: config.defaultDurationDays,
  };
}

export { suggestedAmountCop } from "@/lib/premium-config-client";
