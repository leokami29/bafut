import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { safeNextPath } from "@/lib/safe-next";
import { robotsNoIndexNoFollow } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Entrar",
  robots: robotsNoIndexNoFollow,
};

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; callbackUrl?: string }>;
}) {
  const { next, callbackUrl } = await searchParams;
  const nextPath = safeNextPath(next ?? callbackUrl, "/");
  const claiming = nextPath.startsWith("/p/");

  return (
    <main className="page page-narrow" id="main">
      <header className="page-head">
        <h1>{claiming ? "Entra para pedir el cupo" : "Entra a BaFut"}</h1>
        <p>
          {claiming
            ? "Un correo basta. Completa tu nombre y WhatsApp para que el host sepa quién llega."
            : "Correo y listo. Tu nombre y WhatsApp son lo que ve el host cuando confirma el cupo."}
        </p>
      </header>
      <AuthForm nextPath={nextPath} />
    </main>
  );
}
