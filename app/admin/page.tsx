import type { Metadata } from "next";
import Link from "next/link";
import { AdminScoreboard } from "@/components/AdminScoreboard";
import { requireUserId } from "@/lib/auth";
import { formatOldestDetail, getAdminQueueCounts } from "@/lib/admin-queues";
import { getIsAdmin } from "@/lib/data";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Admin BaFut",
  robots: robotsNoIndex,
};

export default async function AdminHomePage() {
  const { userId } = await requireUserId("/admin");

  if (!(await getIsAdmin(userId))) {
    return (
      <main className="page page-narrow" id="main">
        <header className="page-head">
          <h1>Acceso denegado</h1>
          <p>No tenés permisos de administrador.</p>
          <p className="foot-link">
            <Link href="/">Volver al inicio</Link>
          </p>
        </header>
      </main>
    );
  }

  const counts = await getAdminQueueCounts();

  const queues = [
    {
      href: "/admin/claims",
      eyebrow: "Moderación",
      title: "Reclamos de cancha",
      count: counts.pendingClaims,
      detail:
        counts.pendingClaims === 0
          ? "Cola al día: no hay reclamos esperando."
          : formatOldestDetail(
              counts.oldestClaim,
              "verificá la prueba antes de aprobar.",
            ),
      action: counts.pendingClaims > 0 ? "Atender la cola" : "Ver resueltos (24 h)",
    },
    {
      href: "/admin/subscriptions",
      eyebrow: "Pagos",
      title: "Solicitudes Premium",
      count: counts.pendingSubRequests,
      detail:
        counts.pendingSubRequests === 0
          ? "Ningún comprobante esperando revisión."
          : formatOldestDetail(
              counts.oldestSubRequest,
              "comprobantes Nequi/banco por validar.",
            ),
      action: counts.pendingSubRequests > 0 ? "Revisar comprobantes" : "Ver histórico",
    },
    {
      href: "/admin/renewals",
      eyebrow: "Billing",
      title: "Renovaciones por avisar",
      count: counts.pendingRenewals,
      detail:
        counts.pendingRenewals === 0
          ? "Sin avisos T-7 / T-1 pendientes."
          : "Avisá por WhatsApp a los dueños con Premium por vencer.",
      action: counts.pendingRenewals > 0 ? "Ver la cola" : "Ver la cola",
    },
  ];

  return (
    <main className="page page-admin" id="main">
      <header className="page-head page-head-compact">
        <p className="eyebrow">BaFut · mesa de control</p>
        <h1>Buen día, editor.</h1>
        <p className="lede">
          {counts.pendingClaims + counts.pendingSubRequests + counts.pendingRenewals > 0
            ? `Hay ${counts.pendingClaims + counts.pendingSubRequests + counts.pendingRenewals} cosas esperando tu mano.`
            : "Todo tranquilo: no hay nada esperando revisión."}{" "}
            {counts.totalVenues} canchas en el directorio.
        </p>
      </header>

      <AdminScoreboard counts={counts} />

      <ul className="admin-queues">
        {queues.map((queue) => (
          <li key={queue.href}>
            <Link
              href={queue.href}
              className={`admin-queue-card${queue.count > 0 ? " is-hot" : ""}`}
            >
              <p className="admin-queue-eyebrow">{queue.eyebrow}</p>
              <div className="admin-queue-top">
                <span className="admin-queue-num">{String(queue.count).padStart(2, "0")}</span>
                <div className="admin-queue-heading">
                  <strong>{queue.title}</strong>
                  <span className="admin-queue-detail">{queue.detail}</span>
                </div>
              </div>
              <span className="admin-queue-action">{queue.action} →</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="admin-quiet-links">
        <Link href="/admin/venues">Gestión de canchas ({counts.totalVenues})</Link>
        {" · "}
        <Link href="/admin/venues/nuevo">Crear cancha</Link>
        {" · "}
        <Link href="/">Volver al sitio</Link>
      </p>
    </main>
  );
}
