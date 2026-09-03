import { RosterSkeleton } from "@/components/RosterSkeleton";

export default function Loading() {
  return (
    <main className="page" id="main" aria-busy="true" aria-label="Cargando">
      <p className="eyebrow">BaFut</p>
      <p className="sr-only">Cargando…</p>
      <RosterSkeleton rows={4} />
    </main>
  );
}
