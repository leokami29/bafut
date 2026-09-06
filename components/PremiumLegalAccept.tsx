/**
 * Placeholder listo para A2 (solicitud premium + comprobante).
 * Cuando exista la UI de pago, montar:
 *
 *   const legal = useLegalAcceptance("premium");
 *   <LegalAcceptCheckbox {...legal.checkboxProps} id="premium-legal-accept" />
 *   // antes de submit: const err = legal.validate(); if (err) …
 *
 * No exporta UI propia: reutiliza LegalAcceptCheckbox + useLegalAcceptance.
 */
export {
  LegalAcceptCheckbox,
  useLegalAcceptance,
} from "@/components/LegalAcceptCheckbox";
export type { LegalAcceptVariant } from "@/lib/legal";
export { legalAcceptErrorMessage } from "@/lib/legal";
