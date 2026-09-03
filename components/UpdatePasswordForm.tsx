"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { passwordMeetsMinimum } from "@/lib/password-strength";
import { createClient } from "@/lib/supabase/client";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    if (!passwordMeetsMinimum(password)) {
      setError("La clave debe tener al menos 8 caracteres.");
      setPending(false);
      return;
    }
    if (password !== confirm) {
      setError("Las claves no coinciden.");
      setPending(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("No se pudo guardar la clave. Pedí de nuevo el correo de recuperación.");
      setPending(false);
      return;
    }

    setMessage("Clave actualizada. Ya podés usar BaFut.");
    setPending(false);
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="stack-form">
      <label>
        Nueva clave
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <PasswordStrengthMeter password={password} />
      <label>
        Repetí la clave
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </label>
      <div aria-live="polite">
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-ok">{message}</p> : null}
      </div>
      <button className="btn-flood" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Guardando…" : "Guardar clave"}
      </button>
    </form>
  );
}
