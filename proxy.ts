import { NextResponse, type NextRequest } from "next/server";
import { isOpsPath, rewriteAdminPathToOps } from "@bafut/venue-ops";
import { resolveAdminAppOrigin } from "@/lib/admin-app-url";
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
  const pathname = request.nextUrl.pathname;

  // BaFut web no sirve admin/crons: todo eso vive en BaFut_Admin.
  if (isOpsPath(pathname)) {
    const adminOrigin = resolveAdminAppOrigin({
      NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL,
      NEXT_PUBLIC_OPS_URL: process.env.NEXT_PUBLIC_OPS_URL,
      OPS_APP_URL: process.env.OPS_APP_URL,
    });
    return NextResponse.redirect(
      rewriteAdminPathToOps(pathname, request.nextUrl.search, adminOrigin),
      308,
    );
  }

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
