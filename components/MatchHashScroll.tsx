"use client";

import { useEffect } from "react";

const HASH_IDS = new Set(["cupos", "formacion", "armar-rival"]);

function scrollToHash(hash: string) {
  const id = hash.replace(/^#/, "");
  if (!HASH_IDS.has(id)) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Asegura scroll a #cupos / #formacion / #armar-rival tras navegación App Router. */
export function MatchHashScroll() {
  useEffect(() => {
    const run = () => scrollToHash(window.location.hash);
    const timer = window.setTimeout(run, 40);
    window.addEventListener("hashchange", run);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", run);
    };
  }, []);

  return null;
}
