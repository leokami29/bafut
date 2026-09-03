import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

function loginRedirectTarget(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/entrar";

  if (!url.searchParams.has("next")) {
    const callbackUrl = url.searchParams.get("callbackUrl");
    if (callbackUrl) {
      try {
        const callback = new URL(callbackUrl);
        url.searchParams.set("next", `${callback.pathname}${callback.search}`);
      } catch {
        if (callbackUrl.startsWith("/")) {
          url.searchParams.set("next", callbackUrl);
        }
      }
    }
  }

  url.searchParams.delete("callbackUrl");
  return url;
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(loginRedirectTarget(request));
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
