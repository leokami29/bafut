/** Rutas y copy compartidos del bloque legal mínimo (B4). */

export const LEGAL_TERMS_PATH = "/terminos" as const;
export const LEGAL_PRIVACY_PATH = "/privacidad" as const;

export const LEGAL_CONTACT_EMAIL = "duenos@bafut.com";

export const TERMS_TITLE = "Términos de uso";
export const TERMS_DESCRIPTION =
  "Condiciones de uso de BaFut: partidos y cupos, reclamo de canchas, verificación, plan Exclusivo y comprobantes. No es reserva ni pasarela de pagos entre jugadores.";

export const PRIVACY_TITLE = "Política de privacidad";
export const PRIVACY_DESCRIPTION =
  "Tratamiento de datos personales en BaFut conforme a la Ley 1581 de 2012 (habeas data) en Colombia: cuentas, reclamos de canchas y comprobantes de pago.";

export type LegalAcceptVariant = "claim" | "premium" | "booking" | "signup";

export function legalAcceptErrorMessage(variant: LegalAcceptVariant = "claim"): string {
  if (variant === "premium") {
    return "Para enviar la solicitud del plan Exclusivo tenés que aceptar los términos y la política de privacidad.";
  }
  if (variant === "booking") {
    return "Para reservar tenés que aceptar los términos y la política de privacidad.";
  }
  if (variant === "signup") {
    return "Para armar tu ficha tenés que aceptar los términos y la política de privacidad.";
  }
  return "Para enviar el reclamo tenés que aceptar los términos y la política de privacidad.";
}
