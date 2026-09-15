import { NextResponse } from "next/server";
import { PROFILE_AVATARS_BUCKET, profileAvatarPublicUrl } from "@/lib/profile-photos";
import { cleanStorageObjectPath } from "@/lib/storage-path";

/**
 * Proxy same-origin de avatares públicos.
 * Evita fallos de CORS al exportar la carta (html-to-image / canvas en móvil).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("path") ?? "";
  const path = cleanStorageObjectPath(raw);
  if (!path || !/\.(jpe?g|png|webp)$/i.test(path)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const upstream = profileAvatarPublicUrl(path);
  let res: Response;
  try {
    res = await fetch(upstream, {
      headers: { Accept: "image/*" },
      next: { revalidate: 86_400 },
    });
  } catch {
    return new NextResponse("Upstream error", { status: 502 });
  }

  if (!res.ok) {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentType = res.headers.get("content-type") || "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
      // Marca el bucket proxyado (debug / métricas).
      "X-BaFut-Avatar-Bucket": PROFILE_AVATARS_BUCKET,
    },
  });
}
