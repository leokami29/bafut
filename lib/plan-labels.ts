/**
 * Etiquetas de plan para UI. El valor interno en DB sigue siendo `premium`.
 */

export type PlanCode = "premium" | "basic" | (string & {});

/** Nombre de producto del plan (badge, títulos, “Plan …”). */
export function planLabel(plan: PlanCode | null | undefined): string {
  if (plan === "premium") return "Exclusivo";
  if (plan === "basic") return "Básico";
  if (!plan) return "Exclusivo";
  return plan;
}

/** Frase corta de estado, p. ej. “Exclusivo activo”. */
export function planActiveLabel(plan: PlanCode = "premium"): string {
  return `${planLabel(plan)} activo`;
}

/** Título de consola / sección admin. */
export function planConsoleTitle(plan: PlanCode = "premium"): string {
  return `Consola ${planLabel(plan)}`;
}

/**
 * Descripciones de feature flags que aún digan “Premium” en DB:
 * reescribe a Exclusivo para la UI de Mesa → Flags.
 */
export function featureFlagDescriptionLabel(description: string | null | undefined): string {
  if (!description) return "Sin descripción.";
  return description
    .replace(/\bPremium\b/g, "Exclusivo")
    .replace(/\bpremium\b/g, "exclusivo");
}
