import { RosterSkeleton } from "@/components/RosterSkeleton";

export default function PartidoLoading() {
  return (
    <main className="page page-narrow" id="main" aria-busy="true">
      <p className="eyebrow">Partido</p>
      <RosterSkeleton rows={3} />
    </main>
  );
}
