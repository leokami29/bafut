"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const magicRef = useRef<HTMLButtonElement>(null);
  const passwordRef = useRef<HTMLButtonElement>(null);

  function selectMode(next: "magic" | "password") {
    setMode(next);
    setError(null);
    setMessage(null);
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, next: "magic" | "password") {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      selectMode(next);
      (next === "magic" ? magicRef : passwordRef).current?.focus();
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const redirectTo = `${siteUrl().replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    if (mode === "magic") {
      const { error: magicError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (magicError) {
        setError("No se pudo enviar el enlace. Revisa el correo.");
      } else {
        setMessage("Te mandamos un enlace. Ábrelo en este celular.");
      }
      setPending(false);
      return;
    }

    if (password.length < 8) {
      setError("La clave debe tener al menos 8 caracteres.");
      setPending(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInError) {
      router.push(nextPath);
      router.refresh();
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (signUpError) {
      setError(
        /password|weak|characters|leaked/i.test(signUpError.message)
          ? "La clave es débil o demasiado corta. Usa al menos 8 caracteres."
          : "Correo o clave no válidos.",
      );
      setPending(false);
      return;
    }
    setMessage("Si el proyecto pide confirmar correo, revisa la bandeja. Si no, entra de nuevo con la clave.");
    setPending(false);
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="stack-form">
      <div className="mode-toggle" role="tablist" aria-label="Forma de entrar">
        <button
          ref={magicRef}
          type="button"
          role="tab"
          id="tab-magic"
          aria-selected={mode === "magic"}
          aria-controls="panel-auth"
          tabIndex={mode === "magic" ? 0 : -1}
          className={mode === "magic" ? "is-on" : ""}
          onClick={() => selectMode("magic")}
          onKeyDown={(e) => onTabKey(e, "password")}
        >
          Enlace
        </button>
        <button
          ref={passwordRef}
          type="button"
          role="tab"
          id="tab-password"
          aria-selected={mode === "password"}
          aria-controls="panel-auth"
          tabIndex={mode === "password" ? 0 : -1}
          className={mode === "password" ? "is-on" : ""}
          onClick={() => selectMode("password")}
          onKeyDown={(e) => onTabKey(e, "magic")}
        >
          Clave
        </button>
      </div>

      <div id="panel-auth" role="tabpanel" aria-labelledby={mode === "magic" ? "tab-magic" : "tab-password"}>
        <label>
          Correo
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        {mode === "password" ? (
          <label>
            Clave
            <input
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        ) : null}
      </div>

      <div aria-live="polite">
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-ok">{message}</p> : null}
      </div>

      <button className="btn-flood" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Espera…" : mode === "magic" ? "Mandar enlace" : "Entrar"}
      </button>
    </form>
  );
}
