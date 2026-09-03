"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AUTH_NEXT_COOKIE } from "@/lib/constants";
import { siteUrl } from "@/lib/env";
import { passwordMeetsMinimum } from "@/lib/password-strength";
import { createClient } from "@/lib/supabase/client";
import { normalizeWhatsapp } from "@/lib/whatsapp-contact";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";

type AuthMode = "entrar" | "crear" | "recuperar";

function authErrorMessage(code: string | null | undefined) {
  if (!code) return null;
  if (code === "otp_expired" || code === "access_denied") {
    return "Ese enlace de recuperación ya se usó o venció. Pedí uno nuevo.";
  }
  if (code === "exchange_failed") {
    return "No pudimos completar la recuperación. Pedí de nuevo el correo.";
  }
  return "No se pudo completar el enlace. Pedí uno nuevo desde Recuperar.";
}

function setAuthNextCookie(path: string) {
  const secure = siteUrl().startsWith("https") ? "; Secure" : "";
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(path)}; Path=/; Max-Age=3600; SameSite=Lax${secure}`;
}

function callbackUrl() {
  return `${siteUrl().replace(/\/$/, "")}/auth/callback`;
}

export function AuthForm({
  nextPath,
  initialAuthError,
}: {
  nextPath: string;
  initialAuthError?: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("entrar");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() => authErrorMessage(initialAuthError));
  const [pending, setPending] = useState(false);

  function selectMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setMessage(null);
  }

  async function finishSignupProfile(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    name: string,
    phone: string,
  ) {
    await supabase.from("profiles").update({ display_name: name, updated_at: new Date().toISOString() }).eq("id", userId);
    await supabase.from("profile_contacts").upsert({
      user_id: userId,
      whatsapp: phone,
      updated_at: new Date().toISOString(),
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const redirectTo = callbackUrl();

    if (mode === "recuperar") {
      setAuthNextCookie("/entrar/clave");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (resetError) {
        setError(
          /rate|limit/i.test(resetError.message)
            ? "Demasiados correos. Esperá un rato (en Free hay cupo bajo de emails) y reintentá."
            : "No se pudo enviar el correo de recuperación. Revisá el correo.",
        );
      } else {
        setMessage(
          "Si ese correo tiene cuenta, te mandamos el link para elegir una clave nueva. Revisá la bandeja (y spam).",
        );
      }
      setPending(false);
      return;
    }

    if (!passwordMeetsMinimum(password)) {
      setError("La clave debe tener al menos 8 caracteres.");
      setPending(false);
      return;
    }

    if (mode === "entrar") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(
          /confirm|not confirmed/i.test(signInError.message)
            ? "Esa cuenta pide confirmar correo. En Supabase: Authentication → Providers → Email → desactivá Confirm email."
            : "Correo o clave no válidos.",
        );
        setPending(false);
        return;
      }
      router.push(nextPath);
      router.refresh();
      return;
    }

    const name = displayName.trim();
    if (name.length < 2 || name.length > 40) {
      setError("El nombre debe tener entre 2 y 40 caracteres.");
      setPending(false);
      return;
    }
    const phone = normalizeWhatsapp(whatsapp);
    if (!phone) {
      setError("Pon un WhatsApp válido (celular colombiano de 10 dígitos).");
      setPending(false);
      return;
    }
    if (password !== confirm) {
      setError("Las claves no coinciden.");
      setPending(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
      },
    });
    if (signUpError) {
      setError(
        /already|registered|exists/i.test(signUpError.message)
          ? "Ese correo ya tiene cuenta. Entrá con la clave o recuperála."
          : /password|weak|characters|leaked/i.test(signUpError.message)
            ? "La clave es débil o demasiado corta. Usá al menos 8 caracteres."
            : "No se pudo crear la cuenta. Revisá el correo o probá entrar si ya existe.",
      );
      setPending(false);
      return;
    }

    let session = data.session;
    if (!session) {
      const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError || !signedIn.session) {
        setError(
          "La cuenta se creó pero Supabase pide confirmar el correo. Desactivá Confirm email en Authentication → Providers → Email y volvé a entrar con tu clave.",
        );
        setMode("entrar");
        setPending(false);
        return;
      }
      session = signedIn.session;
    }

    await finishSignupProfile(supabase, session.user.id, name, phone);
    router.push(nextPath);
    router.refresh();
  }

  const submitLabel =
    mode === "recuperar" ? "Enviar correo" : mode === "crear" ? "Crear cuenta" : "Entrar";

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="stack-form">
      <div className="mode-toggle mode-toggle-3" role="tablist" aria-label="Forma de entrar">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "entrar"}
          className={mode === "entrar" ? "is-on" : undefined}
          onClick={() => selectMode("entrar")}
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "crear"}
          className={mode === "crear" ? "is-on" : undefined}
          onClick={() => selectMode("crear")}
        >
          Crear cuenta
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "recuperar"}
          className={mode === "recuperar" ? "is-on" : undefined}
          onClick={() => selectMode("recuperar")}
        >
          Recuperar
        </button>
      </div>

      <p className="field-help">
        {mode === "recuperar"
          ? "Te mandamos un correo solo para recuperar la clave."
          : mode === "crear"
            ? "Correo, clave y WhatsApp. Entrá al toque: no hay que confirmar el mail."
            : "Entrá con correo y clave. Sin enlace mágico."}
      </p>

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

      {mode === "crear" ? (
        <>
          <label>
            Cómo te dicen
            <input
              type="text"
              name="display_name"
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={40}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          <label>
            WhatsApp
            <input
              type="tel"
              name="whatsapp"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="3001234567"
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              aria-describedby="signup-whatsapp-help"
            />
          </label>
          <p id="signup-whatsapp-help" className="field-help">
            Celular colombiano de 10 dígitos. Lo ve el host cuando confirma el cupo.
          </p>
        </>
      ) : null}

      {mode !== "recuperar" ? (
        <label>
          Clave
          <input
            type="password"
            autoComplete={mode === "crear" ? "new-password" : "current-password"}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
      ) : null}

      {mode === "crear" ? (
        <>
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
        </>
      ) : null}

      <div aria-live="polite">
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-ok">{message}</p> : null}
      </div>

      <button className="btn-flood" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Espera…" : submitLabel}
      </button>
    </form>
  );
}
