import type { Metadata } from "next";
import Link from "next/link";
import { UpdatePasswordForm } from "@/components/UpdatePasswordForm";
import { requireUserId } from "@/lib/auth";
import { robotsNoIndexNoFollow } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Nueva clave",
  robots: robotsNoIndexNoFollow,
};

export default async function NuevaClavePage() {
  await requireUserId("/entrar/clave");

  return (
    <main className="page page-narrow" id="main">
      <header className="page-head">
        <h1>Elegí una clave nueva</h1>
        <p>
          Viniste desde el correo de recuperación. Guardá una clave de al menos 8 caracteres.{" "}
          <Link href="/entrar">Volver a entrar</Link>
        </p>
      </header>
      <UpdatePasswordForm />
    </main>
  );
}
