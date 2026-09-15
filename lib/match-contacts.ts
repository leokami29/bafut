import { isMatchHistory } from "@/lib/level-trust";

/** Relaciones v1 de `list_my_match_contacts`. */
export type MatchContactRelation =
  | "moderator_claim"
  | "my_moderator"
  | "host_away"
  | "side_peer";

export type MatchContactClaimInput = {
  player_id: string;
  status: string;
  profiles?: { display_name?: string | null } | null;
};

export type MatchContactSlotInput = {
  side: string | null;
  slot_claims: MatchContactClaimInput[];
};

export type MatchContactEdge = {
  otherUserId: string;
  displayName: string;
  relation: MatchContactRelation;
};

const RELATION_RANK: Record<MatchContactRelation, number> = {
  moderator_claim: 1,
  my_moderator: 2,
  host_away: 3,
  side_peer: 4,
};

/** Espejo de `match_is_contactable(status, starts, duration)`. */
export function matchIsContactable(
  status: string | null | undefined,
  startsAt: Date | string,
  durationMin: number,
  now: Date = new Date(),
): boolean {
  if (status !== "open") return false;
  return !isMatchHistory(startsAt, durationMin, now);
}

/** Espejo de `match_side_moderator`. */
export function matchSideModerator(
  side: string | null | undefined,
  hostId: string,
  awayOpenedBy: string | null | undefined,
): string {
  if (side === "b" && awayOpenedBy) return awayOpenedBy;
  return hostId;
}

function claimDisplayName(claim: MatchContactClaimInput): string {
  return claim.profiles?.display_name?.trim() || "Jugador";
}

/**
 * Aristas WA visibles en UI (sin números). Misma matriz que el RPC batch.
 * Prioridad por otherUserId: moderator_claim > my_moderator > host_away > side_peer.
 */
export function listVisibleMatchContactEdges(input: {
  viewerId: string | null | undefined;
  hostId: string;
  awayOpenedBy?: string | null;
  slots: MatchContactSlotInput[];
  /** Si false (historial/cancelado), vacío. */
  contactable: boolean;
}): MatchContactEdge[] {
  const viewerId = input.viewerId?.trim() || null;
  if (!viewerId || !input.contactable) return [];

  type ClaimRow = {
    playerId: string;
    status: string;
    side: string | null;
    moderatorId: string;
    displayName: string;
  };

  const claims: ClaimRow[] = [];
  for (const slot of input.slots) {
    const moderatorId = matchSideModerator(slot.side, input.hostId, input.awayOpenedBy);
    for (const claim of slot.slot_claims) {
      if (claim.status !== "pending" && claim.status !== "accepted") continue;
      claims.push({
        playerId: claim.player_id,
        status: claim.status,
        side: slot.side ?? null,
        moderatorId,
        displayName: claimDisplayName(claim),
      });
    }
  }

  const viewerOk =
    viewerId === input.hostId ||
    viewerId === (input.awayOpenedBy ?? null) ||
    claims.some((c) => c.playerId === viewerId);
  if (!viewerOk) return [];

  const edges: MatchContactEdge[] = [];

  for (const cl of claims) {
    if (cl.moderatorId === viewerId && cl.playerId !== viewerId) {
      edges.push({
        otherUserId: cl.playerId,
        displayName: cl.displayName,
        relation: "moderator_claim",
      });
    }
    if (cl.playerId === viewerId && cl.moderatorId !== viewerId) {
      const modName =
        cl.moderatorId === input.hostId
          ? "host"
          : cl.moderatorId === (input.awayOpenedBy ?? null)
            ? "capitán"
            : "moderador";
      edges.push({
        otherUserId: cl.moderatorId,
        displayName: modName,
        relation: "my_moderator",
      });
    }
  }

  const away = input.awayOpenedBy ?? null;
  if (viewerId === input.hostId && away && away !== viewerId) {
    edges.push({
      otherUserId: away,
      displayName: "capitán rival",
      relation: "host_away",
    });
  }
  if (away && viewerId === away && input.hostId !== viewerId) {
    edges.push({
      otherUserId: input.hostId,
      displayName: "host",
      relation: "host_away",
    });
  }

  const meAccepted = claims.filter((c) => c.playerId === viewerId && c.status === "accepted");
  for (const me of meAccepted) {
    for (const peer of claims) {
      if (peer.playerId === me.playerId) continue;
      if (peer.status !== "accepted") continue;
      if ((peer.side ?? null) !== (me.side ?? null)) continue;
      edges.push({
        otherUserId: peer.playerId,
        displayName: peer.displayName,
        relation: "side_peer",
      });
    }
  }

  const best = new Map<string, MatchContactEdge>();
  for (const edge of edges) {
    const prev = best.get(edge.otherUserId);
    if (!prev || RELATION_RANK[edge.relation] < RELATION_RANK[prev.relation]) {
      best.set(edge.otherUserId, edge);
    }
  }
  return [...best.values()];
}

/**
 * Label de botón WA. Pending: solo mostrar `moderator_claim` en UI (el jugador pendiente no escribe al host).
 */
export function matchContactButtonLabel(
  relation: MatchContactRelation,
  displayName: string,
  opts?: { viewerIsHost?: boolean; moderatorIsAway?: boolean },
): string {
  const name = displayName.trim() || "jugador";
  switch (relation) {
    case "my_moderator":
      return opts?.moderatorIsAway ? "Escribir al capitán" : "Escribir al host";
    case "host_away":
      return opts?.viewerIsHost ? "Escribir al capitán rival" : "Escribir al host";
    case "moderator_claim":
    case "side_peer":
      return `Escribir a ${name}`;
    default:
      return `Escribir a ${name}`;
  }
}

/** UI: contactar pending solo si el viewer es moderador de ese claim (misma autoridad que Confirmar). */
export function canShowPendingContact(
  relation: MatchContactRelation,
  claimStatus: string,
): boolean {
  if (claimStatus === "pending") return relation === "moderator_claim";
  return claimStatus === "accepted";
}

export const JOINED_CLAIM_STORAGE_PREFIX = "bafut:joined:";
export const JOINED_SLOT_STORAGE_PREFIX = "bafut:joined-slot:";

export function joinedClaimStorageKey(claimId: string) {
  return `${JOINED_CLAIM_STORAGE_PREFIX}${claimId}`;
}

export function joinedSlotStorageKey(slotId: string) {
  return `${JOINED_SLOT_STORAGE_PREFIX}${slotId}`;
}
