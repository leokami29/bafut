import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_NEXT_COOKIE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const authError = url.searchParams.get("error_code") ?? url.searchParams.get("error");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const jar = await cookies();
  let fromCookie = jar.get(AUTH_NEXT_COOKIE)?.value;
  if (fromCookie) {
    try {
      fromCookie = decodeURIComponent(fromCookie);
    } catch {
      fromCookie = undefined;
    }
  }
  const type = url.searchParams.get("type");
  const defaultNext = type === "recovery" ? "/entrar/clave" : "/";
  const safeNext = safeNextPath(url.searchParams.get("next") ?? fromCookie, defaultNext);

  const clearNextCookie = (response: NextResponse) => {
    response.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  };

  if (authError) {
    const entrar = new URL("/entrar", url.origin);
    entrar.searchParams.set("auth_error", authError);
    entrar.searchParams.set("next", safeNext);
    return clearNextCookie(NextResponse.redirect(entrar));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const entrar = new URL("/entrar", url.origin);
      entrar.searchParams.set("auth_error", "exchange_failed");
      entrar.searchParams.set("next", safeNext);
      return clearNextCookie(NextResponse.redirect(entrar));
    }
  } else if (!user) {
    const entrar = new URL("/entrar", url.origin);
    entrar.searchParams.set("next", safeNext);
    return clearNextCookie(NextResponse.redirect(entrar));
  }

  return clearNextCookie(NextResponse.redirect(new URL(safeNext, url.origin)));
}
