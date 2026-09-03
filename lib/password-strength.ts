export type PasswordScore = 0 | 1 | 2 | 3 | 4;

const LABELS = ["", "Muy débil", "Débil", "Aceptable", "Fuerte"] as const;

export function scorePassword(password: string): PasswordScore {
  if (!password) return 0;
  let score: PasswordScore = 1;
  if (password.length >= 8) score = 2;
  const hasLetter = /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-ZÁÉÍÓÚÑ]/.test(password);
  const hasSymbol = /[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(password);
  if (password.length >= 8 && hasLetter && hasNumber) score = 3;
  if (password.length >= 10 && hasLetter && hasNumber && (hasUpper || hasSymbol)) score = 4;
  return score;
}

export function passwordScoreLabel(score: PasswordScore) {
  return LABELS[score];
}

export function passwordMeetsMinimum(password: string) {
  return password.length >= 8 && scorePassword(password) >= 2;
}
