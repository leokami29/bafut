"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Supabase pone fallos de verify en el hash (#error=…); el route handler no los ve. */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const code = params.get("error_code") ?? params.get("error");
    if (!code) return;

    const next = `${window.location.pathname}${window.location.search}`;
    const q = new URLSearchParams({
      auth_error: code,
      next: next.startsWith("/") ? next : "/",
    });
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    router.replace(`/entrar?${q.toString()}`);
  }, [router]);

  return null;
}
