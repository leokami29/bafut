import { describe, expect, it } from "vitest";
import {
  canShowPendingContact,
  listVisibleMatchContactEdges,
  matchContactButtonLabel,
  matchIsContactable,
  matchSideModerator,
} from "@/lib/match-contacts";

const HOST = "host-1";
const AWAY = "away-1";
const PLAYER_A = "player-a";
const PLAYER_B = "player-b";
const RIVAL = "player-rival";
const STRANGER = "stranger";

function slotsFixture() {
  return [
    {
      side: "a",
      slot_claims: [
        {
          player_id: PLAYER_A,
          status: "accepted",
          profiles: { display_name: "Ana" },
        },
        {
          player_id: PLAYER_B,
          status: "pending",
          profiles: { display_name: "Beto" },
        },
      ],
    },
    {
      side: "b",
      slot_claims: [
        {
          player_id: RIVAL,
          status: "accepted",
          profiles: { display_name: "Rita" },
        },
      ],
    },
  ];
}

describe("matchIsContactable", () => {
  const start = "2026-09-15T18:00:00.000Z";

  it("false si cancelled o historial", () => {
    expect(matchIsContactable("cancelled", start, 60, new Date("2026-09-15T18:30:00.000Z"))).toBe(
      false,
    );
    expect(matchIsContactable("open", start, 60, new Date("2026-09-15T19:00:00.000Z"))).toBe(false);
  });

  it("true si open y aún no terminó", () => {
    expect(matchIsContactable("open", start, 60, new Date("2026-09-15T18:59:59.000Z"))).toBe(true);
  });
});

describe("matchSideModerator", () => {
  it("host en side a; away en side b si hay capitán", () => {
    expect(matchSideModerator("a", HOST, AWAY)).toBe(HOST);
    expect(matchSideModerator("b", HOST, AWAY)).toBe(AWAY);
    expect(matchSideModerator("b", HOST, null)).toBe(HOST);
  });
});

describe("listVisibleMatchContactEdges — matriz authz", () => {
  it("vacío sin viewer, sin contactable o sin vínculo", () => {
    expect(
      listVisibleMatchContactEdges({
        viewerId: null,
        hostId: HOST,
        awayOpenedBy: AWAY,
        slots: slotsFixture(),
        contactable: true,
      }),
    ).toEqual([]);
    expect(
      listVisibleMatchContactEdges({
        viewerId: HOST,
        hostId: HOST,
        awayOpenedBy: AWAY,
        slots: slotsFixture(),
        contactable: false,
      }),
    ).toEqual([]);
    expect(
      listVisibleMatchContactEdges({
        viewerId: STRANGER,
        hostId: HOST,
        awayOpenedBy: AWAY,
        slots: slotsFixture(),
        contactable: true,
      }),
    ).toEqual([]);
  });

  it("host: moderator_claim a players side a + host_away a capitán B", () => {
    const edges = listVisibleMatchContactEdges({
      viewerId: HOST,
      hostId: HOST,
      awayOpenedBy: AWAY,
      slots: slotsFixture(),
      contactable: true,
    });
    const byId = Object.fromEntries(edges.map((e) => [e.otherUserId, e.relation]));
    expect(byId[PLAYER_A]).toBe("moderator_claim");
    expect(byId[PLAYER_B]).toBe("moderator_claim");
    expect(byId[AWAY]).toBe("host_away");
    expect(byId[RIVAL]).toBeUndefined();
  });

  it("jugador accepted side a: my_moderator + side_peer same side (no rival)", () => {
    const edges = listVisibleMatchContactEdges({
      viewerId: PLAYER_A,
      hostId: HOST,
      awayOpenedBy: AWAY,
      slots: [
        {
          side: "a",
          slot_claims: [
            { player_id: PLAYER_A, status: "accepted", profiles: { display_name: "Ana" } },
            { player_id: PLAYER_B, status: "accepted", profiles: { display_name: "Beto" } },
          ],
        },
        {
          side: "b",
          slot_claims: [
            { player_id: RIVAL, status: "accepted", profiles: { display_name: "Rita" } },
          ],
        },
      ],
      contactable: true,
    });
    const byId = Object.fromEntries(edges.map((e) => [e.otherUserId, e.relation]));
    expect(byId[HOST]).toBe("my_moderator");
    expect(byId[PLAYER_B]).toBe("side_peer");
    expect(byId[RIVAL]).toBeUndefined();
  });

  it("no peers cruzados A↔B", () => {
    const edges = listVisibleMatchContactEdges({
      viewerId: RIVAL,
      hostId: HOST,
      awayOpenedBy: AWAY,
      slots: slotsFixture(),
      contactable: true,
    });
    expect(edges.some((e) => e.otherUserId === PLAYER_A)).toBe(false);
    expect(edges.some((e) => e.relation === "side_peer" && e.otherUserId === PLAYER_A)).toBe(false);
  });

  it("prioritza moderator_claim sobre side_peer para el mismo other", () => {
    // Host also accepted on side a with a peer — still moderator_claim to that peer.
    const edges = listVisibleMatchContactEdges({
      viewerId: HOST,
      hostId: HOST,
      awayOpenedBy: null,
      slots: [
        {
          side: "a",
          slot_claims: [
            { player_id: HOST, status: "accepted", profiles: { display_name: "Host" } },
            { player_id: PLAYER_A, status: "accepted", profiles: { display_name: "Ana" } },
          ],
        },
      ],
      contactable: true,
    });
    const ana = edges.find((e) => e.otherUserId === PLAYER_A);
    expect(ana?.relation).toBe("moderator_claim");
  });
});

describe("matchContactButtonLabel + pending gate", () => {
  it("labels por relación", () => {
    expect(matchContactButtonLabel("my_moderator", "x")).toBe("Escribir al host");
    expect(matchContactButtonLabel("my_moderator", "x", { moderatorIsAway: true })).toBe(
      "Escribir al capitán",
    );
    expect(matchContactButtonLabel("host_away", "x", { viewerIsHost: true })).toBe(
      "Escribir al capitán rival",
    );
    expect(matchContactButtonLabel("host_away", "x", { viewerIsHost: false })).toBe(
      "Escribir al host",
    );
    expect(matchContactButtonLabel("moderator_claim", "Ana")).toBe("Escribir a Ana");
    expect(matchContactButtonLabel("side_peer", "Beto")).toBe("Escribir a Beto");
  });

  it("pending solo moderator_claim en UI", () => {
    expect(canShowPendingContact("moderator_claim", "pending")).toBe(true);
    expect(canShowPendingContact("my_moderator", "pending")).toBe(false);
    expect(canShowPendingContact("side_peer", "pending")).toBe(false);
    expect(canShowPendingContact("my_moderator", "accepted")).toBe(true);
  });
});
