import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ vista?: string }>;
};

/** Unificado en /admin/premium?tab=solicitudes */
export default async function AdminSubscriptionsRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const vista = sp.vista === "resueltos" ? "&vista=resueltos" : "";
  redirect(`/admin/premium?tab=solicitudes${vista}`);
}
