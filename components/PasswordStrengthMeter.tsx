import { passwordScoreLabel, scorePassword } from "@/lib/password-strength";

export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = scorePassword(password);
  if (!password) return null;

  return (
    <div className="password-meter" aria-live="polite">
      <div className="password-meter-track" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className={score >= step ? `is-on is-s${score}` : undefined} />
        ))}
      </div>
      <p className="password-meter-label">
        Seguridad: <strong>{passwordScoreLabel(score)}</strong>
        {score < 3 ? " · Mejorá con mayúscula, número o 10+ caracteres." : null}
      </p>
    </div>
  );
}
