"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LEGAL_PRIVACY_PATH,
  LEGAL_TERMS_PATH,
  legalAcceptErrorMessage,
  type LegalAcceptVariant,
} from "@/lib/legal";

type LegalAcceptCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** `claim` = reclamar cancha; `premium` = solicitud de plan (listo para A2). */
  variant?: LegalAcceptVariant;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

/**
 * Checkbox de aceptación legal reutilizable.
 * Usar en reclamar cancha y, cuando exista la UI, en solicitud premium.
 */
export function LegalAcceptCheckbox({
  checked,
  onChange,
  variant = "claim",
  id = "legal-accept",
  disabled = false,
  required = true,
  className = "legal-accept",
}: LegalAcceptCheckboxProps) {
  const label =
    variant === "premium"
      ? "Acepto los términos de uso y la política de privacidad de BaFut, incluido el tratamiento de mis datos y del comprobante de pago para revisar la solicitud premium."
      : "Acepto los términos de uso y la política de privacidad de BaFut, incluido el tratamiento de mis datos para verificar la titularidad de la cancha.";

  return (
    <label className={className} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        name="legal_accepted"
        checked={checked}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={`${id}-links`}
      />
      <span>
        {label}{" "}
        <span id={`${id}-links`}>
          Ver{" "}
          <Link href={LEGAL_TERMS_PATH} target="_blank" rel="noopener noreferrer">
            términos
          </Link>{" "}
          y{" "}
          <Link href={LEGAL_PRIVACY_PATH} target="_blank" rel="noopener noreferrer">
            privacidad
          </Link>
          .
        </span>
      </span>
    </label>
  );
}

/** Estado + validación listos para reclamar o solicitud premium. */
export function useLegalAcceptance(
  variant: LegalAcceptVariant = "claim",
  initial = false,
) {
  const [accepted, setAccepted] = useState(initial);

  return {
    accepted,
    setAccepted,
    variant,
    /** Mensaje de error si falta el check; `null` si está ok. */
    validate: () => (accepted ? null : legalAcceptErrorMessage(variant)),
    checkboxProps: {
      checked: accepted,
      onChange: setAccepted,
      variant,
    } satisfies Pick<LegalAcceptCheckboxProps, "checked" | "onChange" | "variant">,
  };
}
