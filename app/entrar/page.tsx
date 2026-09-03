import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Entrar",
};

function resolveNextPath(next?: string, callbackUrl?: string) {
  const candidate = next ?? callbackUrl;
  if (!candidate) return "/";
  if (candidate.startsWith("/")) return candidate;
  try {
    const url = new URL(candidate);
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return "/";
  }
}

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; callbackUrl?: string }>;
}) {
  const { next, callbackUrl } = await searchParams;
  const nextPath = resolveNextPath(next, callbackUrl);
  const claiming = nextPath.startsWith("/p/");

  return (
    <main className="page page-narrow" id="main">
      <header className="page-head">
        <h1>{claiming ? "Entra para pedir el cupo" : "Entra a BaFut"}</h1>
        <p>
          {claiming
            ? "Un correo basta. Completa tu nombre en el perfil para que el host sepa quién llega."
            : "Correo y listo. Tu nombre en la lista es lo que ve el host cuando pides cupo."}
        </p>
      </header>
      <AuthForm nextPath={nextPath} />
    </main>
  );
}
