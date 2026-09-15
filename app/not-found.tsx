import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: robotsNoIndex,
};

export default function NotFound() {
  return <NotFoundView surface="web" />;
}
