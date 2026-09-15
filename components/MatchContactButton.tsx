"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { listMyMatchContactsAction } from "@/app/actions";
import type { MatchContactRelation } from "@/lib/match-contacts";
import { whatsappChatHref } from "@/lib/whatsapp-contact";

type CachedContact = {
  otherUserId: string;
  displayName: string;
  whatsapp: string | null;
  relation: string;
};

type MatchContactsContextValue = {
  matchId: string;
  ensureContacts: () => Promise<CachedContact[] | null>;
  findContact: (otherUserId: string) => CachedContact | undefined;
  loaded: boolean;
  loadError: string | null;
};

const MatchContactsContext = createContext<MatchContactsContextValue | null>(null);

export function MatchContactsProvider({
  matchId,
  enabled,
  children,
}: {
  matchId: string;
  enabled: boolean;
  children: ReactNode;
}) {
  const [byId, setById] = useState<Map<string, CachedContact> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const ensureContacts = useCallback(async () => {
    if (!enabled) {
      setLoadError("Contacto no disponible.");
      return null;
    }
    if (byId) return [...byId.values()];
    const result = await listMyMatchContactsAction(matchId);
    if ("error" in result && result.error) {
      setLoadError(result.error);
      return null;
    }
    if (!("ok" in result) || !result.ok) {
      setLoadError("No se pudo cargar los contactos.");
      return null;
    }
    const map = new Map<string, CachedContact>();
    for (const row of result.contacts) {
      map.set(row.otherUserId, row);
    }
    setById(map);
    setLoadError(null);
    return result.contacts;
  }, [byId, enabled, matchId]);

  const findContact = useCallback(
    (otherUserId: string) => byId?.get(otherUserId),
    [byId],
  );

  const value = useMemo(
    () => ({
      matchId,
      ensureContacts,
      findContact,
      loaded: byId != null,
      loadError,
    }),
    [matchId, ensureContacts, findContact, byId, loadError],
  );

  return (
    <MatchContactsContext.Provider value={value}>{children}</MatchContactsContext.Provider>
  );
}

function useMatchContacts() {
  return useContext(MatchContactsContext);
}

/**
 * Reveal lazy: batch RPC al primer click, luego abre wa.me.
 * No hace fetch en mount.
 */
export function MatchContactButton({
  otherUserId,
  label,
  relation,
}: {
  otherUserId: string;
  label: string;
  relation: MatchContactRelation;
}) {
  const ctx = useMatchContacts();
  const [error, setError] = useState<string | null>(null);
  const [href, setHref] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!ctx) return null;

  if (href) {
    return (
      <div className="match-contact-btn-wrap">
        <a className="btn-bib" href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      </div>
    );
  }

  const onReveal = () => {
    setError(null);
    // Abrir blank sync para no perder el gesto de usuario (popup blockers).
    const popup = window.open("about:blank", "_blank");
    startTransition(async () => {
      const rows = await ctx.ensureContacts();
      if (!rows) {
        popup?.close();
        setError(ctx.loadError ?? "No se pudo cargar el contacto.");
        return;
      }
      const row = rows.find((r) => r.otherUserId === otherUserId);
      if (!row?.whatsapp) {
        popup?.close();
        setError("Todavía no hay WhatsApp de la otra parte.");
        return;
      }
      const nextHref = whatsappChatHref(
        row.whatsapp,
        `Hola ${row.displayName}, nos confirmamos el cupo en BaFut.`,
      );
      setHref(nextHref);
      if (popup && !popup.closed) {
        popup.location.href = nextHref;
      }
      // Si el popup fue bloqueado, queda el <a> revelado para un segundo click.
    });
  };

  return (
    <div className="match-contact-btn-wrap">
      <button
        type="button"
        className="btn-bib"
        onClick={onReveal}
        disabled={pending}
        data-contact-relation={relation}
      >
        {pending ? "Abriendo…" : label}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
