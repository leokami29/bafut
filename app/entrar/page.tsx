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
  searchParams: Promise<{ next?: string; callbackUrl?: string; auth_error?: string }>;
}) {
  const { next, callbackUrl, auth_error } = await searchParams;
  const nextPath = safeNextPath(next ?? callbackUrl, "/");
  const claiming = nextPath.startsWith("/p/");

  return (
    <main className="page page-narrow" id="main">
      <header className="page-head">
        <h1>{claiming ? "Entrá para pedir el cupo" : "Entrá a BaFut"}</h1>
        <p>
          {claiming
            ? "Correo y clave. Después completá nombre y WhatsApp para que el host sepa quién llega."
            : "Entrá o creá cuenta con correo y clave. El correo solo se usa si olvidás la clave."}
        </p>
      </header>
      <AuthForm nextPath={nextPath} initialAuthError={auth_error} />
    </main>
  );
}
