"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

/** Supabase pone fallos de verify en el hash (#error=…); el route handler no los ve. */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/entrar/clave");
      }
    });

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      return () => subscription.unsubscribe();
    }

    const params = new URLSearchParams(hash);
    const code = params.get("error_code") ?? params.get("error");
    if (!code) {
      return () => subscription.unsubscribe();
    }

    const next = `${window.location.pathname}${window.location.search}`;
    const q = new URLSearchParams({
      auth_error: code,
      next: next.startsWith("/") ? next : "/",
    });
    const canonical = siteUrl().replace(/\/$/, "");
    const targetPath = `/entrar?${q.toString()}`;

    // Si el OTP cayó en host basura (p. ej. https://localhost:8080), saltá al site real.
    try {
      if (new URL(window.location.origin).origin !== new URL(canonical).origin) {
        window.location.replace(`${canonical}${targetPath}`);
        return () => subscription.unsubscribe();
      }
    } catch {
      /* keep local replace */
    }

    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    router.replace(targetPath);
    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
