/** Palabra que el usuario debe escribir para confirmar borrado de cuenta. */
export const DELETE_ACCOUNT_CONFIRMATION = "ELIMINAR";

export function isDeleteAccountConfirmation(input: string): boolean {
  return input.trim() === DELETE_ACCOUNT_CONFIRMATION;
}
