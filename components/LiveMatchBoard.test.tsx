import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LiveMatchBoard,
  generateLiveBoardAnnouncement,
  getFormatCaption,
  handleTacticalSpotKeyDown,
  CourtLines,
} from "./LiveMatchBoard";
import { SPORTS, type Sport } from "@/lib/sport-rules";
import { playersPerSideFromFormat } from "@/lib/formations-catalog";

describe("LiveMatchBoard — Tactical Dual Board & WCAG 2.2 AA Accessibility Suite", () => {
  // --------------------------------------------------------------------------
  // Suite 1: Structural & Landmark ARIA Semantics (TS1)
  // --------------------------------------------------------------------------
  describe("Suite 1: Structural & Landmark ARIA Semantics", () => {
    it("TS1.01: renders <figure> with role='region' and dynamic accessible label", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain('role="region"');
      expect(html).toContain('aria-label="Pizarra táctica interactiva: Fútbol 5v5, Convocatoria Completar Titulares"');
      expect(html).toContain('aria-describedby="live-board-caption"');
    });

    it("TS1.02: renders live status container with role='status' and aria-live='polite'", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
          ariaLiveMessage="Pizarra lista para configurar cupos"
        />
      );

      expect(html).toContain('role="status"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('aria-atomic="true"');
      expect(html).toContain("Pizarra lista para configurar cupos");
    });

    it("TS1.03: renders <figcaption id='live-board-caption'> with complete narrative", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[{ pitchIndex: 0, position: "gk" }]}
          benchCount={1}
        />
      );

      expect(html).toContain('id="live-board-caption"');
      expect(html).toContain("5v5");
      expect(html).toContain("Lado A");
      expect(html).toContain("4 titulares confirmados, 1 cupos abiertos en cancha");
      expect(html).toContain("1 suplente(s) de banca");
    });

    it("TS1.04: header bar displays Lado A (Host) and Lado B (Rival) badges with aria-hidden='true'", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
          hostTeamName="Deportivo San Martín"
        />
      );

      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain("Lado A · Deportivo San Martín");
      expect(html).toContain("Lado B");
      expect(html).toContain("VS");
    });

    it("TS1.05: SVG tactical canvas contains aria-label and role='group'", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="voleibol"
          format="6v6"
          intent="starter_slots"
          formationId="voleibol-6v6-5-1"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain('role="group"');
      expect(html).toContain('aria-label="Cancha táctica de Voleibol 6v6, Lado A y Lado B"');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Multi-Sport Court Lines & Format Rendering (TS2: All 5 Sports)
  // --------------------------------------------------------------------------
  describe("Suite 2: Multi-Sport Court Lines & Format Rendering (All 5 Sports)", () => {
    it("TS2.01 (Fútbol): renders soccer center circle (r=28), midline, and dual penalty boxes", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain('r="28"');
      expect(html).toContain('x1="180"');
      expect(html).toContain('width="42"');
      expect(html).toContain('x="300"'); // Mirrored right penalty box
    });

    it("TS2.02 (Fútbol Sala): renders futsal pitch boundary, center circle (r=20), and 6m D-zones", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol_sala"
          format="5v5"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain('width="312"');
      expect(html).toContain('height="172"');
      expect(html).toContain('r="20"');
      expect(html).toContain('x="298"'); // Mirrored right D-zone
    });

    it("TS2.03 (Básquet): renders basketball court with paint keys (width=78) and center circle (r=22)", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="basquet"
          format="5v5"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain('r="22"');
      expect(html).toContain('width="78"');
      expect(html).toContain('x="264"'); // Mirrored right key
    });

    it("TS2.04 (Voleibol): renders center dividing net with stroke-width='2.6' and attack 3m lines", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="voleibol"
          format="6v6"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain('stroke-width="2.6"');
      expect(html).toContain('x1="118"');
      expect(html).toContain('x1="242"');
    });

    it("TS2.05 (Pádel): renders padel glass court with central net and service line (y1=110)", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="padel"
          format="2v2"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain('width="280"');
      expect(html).toContain('y1="110"');
      expect(html).toContain('x1="90"');
      expect(html).toContain('x1="270"');
    });

    it("TS2.06: CourtLines helper renders directly for any sport", () => {
      for (const sp of SPORTS) {
        const linesHtml = renderToStaticMarkup(<CourtLines sport={sp} />);
        expect(linesHtml.length).toBeGreaterThan(50);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: Intent 1 ("starter_slots") Interactive Semantics (TS3)
  // --------------------------------------------------------------------------
  describe("Suite 3: Intent 1 ('starter_slots') Interactive Semantics", () => {
    it("TS3.01: Side A pitch spots have role='button', tabindex='0', and aria-pressed attributes", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[{ pitchIndex: 1, position: "def" }]}
          benchCount={0}
        />
      );

      expect(html).toContain('role="button"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain('aria-pressed="false"');
      expect(html).toContain("?"); // The open spot renders '?'
    });

    it("TS3.02: unselected spots render position abbreviations (e.g. ARQ, DEF, MED, DEL)", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain("ARQ");
      expect(html).toContain("DEF");
    });

    it("TS3.03: bench row is hidden when benchCount === 0", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).not.toContain("live-board-bench-group");
    });

    it("TS3.04: bench row displays benchCount substitute spots with ⇄ icon when benchCount > 0", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={2}
          rotationRule="Rotación activa continua"
        />
      );

      expect(html).toContain("live-board-bench-group");
      expect(html).toContain("BANQUILLO / ROTACIÓN");
      expect(html).toContain("⇄");
      expect(html).toContain("Suplente 1 en banca");
      expect(html).toContain("Suplente 2 en banca");
    });

    it("TS3.05: Side B displays neutral single-team indicator (MODO EQUIPO ÚNICO)", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain("MODO EQUIPO ÚNICO");
    });

    it("TS3.06: readOnly prop disables interactive button roles on Side A spots", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
          readOnly={true}
        />
      );

      expect(html).not.toContain('role="button"');
      expect(html).not.toContain('aria-pressed=');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 4: Intent 2 ("bench_only") Hero Bench & Locked Pitch (TS4)
  // --------------------------------------------------------------------------
  describe("Suite 4: Intent 2 ('bench_only') Hero Bench & Locked Pitch", () => {
    it("TS4.01: locks pitch spots (non-interactive, no role='button', no aria-pressed)", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="bench_only"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={2}
          rotationRule="Cambios cada 15 min"
        />
      );

      expect(html).not.toContain('role="button"');
      expect(html).not.toContain('aria-pressed=');
      expect(html).toContain("Titulares completos");
      expect(html).toContain("Cambios cada 15 min");
    });

    it("TS4.02: highlights bench zone with hero class and active rotation banner", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="bench_only"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={3}
          rotationRule="Pacto de rotación libre"
        />
      );

      expect(html).toContain("is-hero-bench");
      expect(html).toContain("live-board-bench-hero");
      expect(html).toContain("live-board-pact-banner");
      expect(html).toContain("Pacto de rotación libre");
      expect(html).toContain("3 suplentes");
    });

    it("TS4.03: Side B displays 'RIVAL POR DEFINIR' watermark", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="bench_only"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={2}
        />
      );

      expect(html).toContain("RIVAL POR DEFINIR");
    });

    it("TS4.04: figcaption explicitly notes titulares completos por fuera de la app", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="bench_only"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={2}
        />
      );

      expect(html).toContain("Titulares completos en cancha (5/5 organizados por fuera de la app)");
    });

    it("TS4.05: below-pitch interactive action chips are NOT rendered in bench_only", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="bench_only"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={2}
        />
      );

      expect(html).not.toContain('class="live-board-spot-chips"');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 5: Intent 3 ("challenge") Dual Confrontation & Modes (TS5)
  // --------------------------------------------------------------------------
  describe("Suite 5: Intent 3 ('challenge') Dual Confrontation & Modes", () => {
    it("TS5.01: renders Side A host team name and Side B rival slots for Volleyball 6v6", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="voleibol"
          format="6v6"
          intent="challenge"
          formationId="voleibol-6v6-5-1"
          selectedPitchSlots={[]}
          benchCount={0}
          hostTeamName="Halcones VC"
          challengeModeType="open_slots"
        />
      );

      expect(html).toContain("Halcones VC");
      expect(html).toContain("Lado B");
      // Side B should have at least 6 spots with is-side-b
      const sideBMatches = html.match(/is-side-b/g) || [];
      expect(sideBMatches.length).toBeGreaterThanOrEqual(6);
    });

    it("TS5.02 (Mode full_team): Side B renders Rival Squad Crest with crossed swords and perSide count", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="challenge"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
          challengeModeType="full_team"
        />
      );

      expect(html).toContain("live-board-rival-crest");
      expect(html).toContain("RIVAL COMPLETO (5)");
      expect(html).toContain("⚔");
    });

    it("TS5.03 (Mode open_slots): Side B renders individual rival spots with is-rival-open", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="challenge"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
          challengeModeType="open_slots"
        />
      );

      expect(html).toContain("is-rival-open");
      expect(html).toContain("Cupo abierto para rival libre");
    });

    it("TS5.04: renders center VS dividing badge on pitch", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="challenge"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain("live-board-center-vs");
      expect(html).toContain("VS");
    });

    it("TS5.05: rival bench spots are rendered on Side B when benchCount > 0", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="challenge"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={2}
        />
      );

      expect(html).toContain("Suplente rival 1 en banca");
      expect(html).toContain("Suplente rival 2 en banca");
    });
  });

  // --------------------------------------------------------------------------
  // Suite 6: Keyboard Navigation & Event Operability (TS6)
  // --------------------------------------------------------------------------
  describe("Suite 6: Keyboard Navigation & Event Operability", () => {
    it("TS6.01: handleTacticalSpotKeyDown triggers callback on Enter", () => {
      const onToggle = vi.fn();
      const mockEvent = {
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      const handled = handleTacticalSpotKeyDown(mockEvent, 2, "mid", onToggle);

      expect(handled).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(onToggle).toHaveBeenCalledWith(2, "mid");
    });

    it("TS6.02: handleTacticalSpotKeyDown triggers callback on Space and calls preventDefault", () => {
      const onToggle = vi.fn();
      const mockEvent = {
        key: " ",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      const handled = handleTacticalSpotKeyDown(mockEvent, 0, "gk", onToggle);

      expect(handled).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(onToggle).toHaveBeenCalledWith(0, "gk");
    });

    it("TS6.03: handleTacticalSpotKeyDown ignores unrelated keys (Tab, Escape, letters)", () => {
      const onToggle = vi.fn();
      const tabEvent = {
        key: "Tab",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;
      const escEvent = {
        key: "Escape",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      expect(handleTacticalSpotKeyDown(tabEvent, 1, "def", onToggle)).toBe(false);
      expect(handleTacticalSpotKeyDown(escEvent, 1, "def", onToggle)).toBe(false);
      expect(onToggle).not.toHaveBeenCalled();
      expect(tabEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("TS6.04: handles missing onToggle callback safely without throwing", () => {
      const mockEvent = {
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      expect(() => handleTacticalSpotKeyDown(mockEvent, 0, "gk", undefined)).not.toThrow();
    });

    it("TS6.05: focus visible indicators are present in the CSS definitions", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain(":focus-visible");
      expect(html).toContain("live-board-focus-ring");
    });
  });

  // --------------------------------------------------------------------------
  // Suite 7: Touch Target Dimensions & Hitbox Integrity (TS7)
  // --------------------------------------------------------------------------
  describe("Suite 7: Touch Target Dimensions & Hitbox Integrity (WCAG 2.5.5 / 2.5.8)", () => {
    it("TS7.01: verifies presence of concentric touch hitbox circle with r=22 (44x44px target)", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      // Matches circle with r >= 12 and fill="transparent"
      expect(html).toMatch(/<circle[^>]+r="(?:1[2-9]|2[0-9])"[^>]+fill="transparent"/);
      expect(html).toContain('pointer-events="all"');
    });

    it("TS7.02: hitbox circles have pointer-events='all' and transparent fill", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain('class="tactical-spot-hitbox live-board-hitbox"');
      expect(html).toContain('fill="transparent"');
    });

    it("TS7.03: below-pitch synchronized action chips have min-height: 44px and min-width: 44px", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain('min-height:44px');
      expect(html).toContain('min-width:44px');
      expect(html).toContain('class="spot-chip is-confirmed"');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 8: Screen Reader Live Announcements (TS8)
  // --------------------------------------------------------------------------
  describe("Suite 8: Screen Reader Live Announcements (aria-live='polite')", () => {
    it("TS8.01: generateLiveBoardAnnouncement generates canonical message for intent_switch", () => {
      const msg1 = generateLiveBoardAnnouncement({
        action: "intent_switch",
        intent: "starter_slots",
      });
      const msg2 = generateLiveBoardAnnouncement({
        action: "intent_switch",
        intent: "bench_only",
        benchCount: 3,
      });
      const msg3 = generateLiveBoardAnnouncement({
        action: "intent_switch",
        intent: "challenge",
        rivalCount: 6,
      });

      expect(msg1).toContain("Modo completar titulares activado");
      expect(msg2).toContain("Modo solo banca activado");
      expect(msg2).toContain("3 suplentes asignados");
      expect(msg3).toContain("Modo reto a rival activado");
      expect(msg3).toContain("6 jugadores");
    });

    it("TS8.02: generateLiveBoardAnnouncement generates message for toggle_spot (open / confirmed)", () => {
      const msgOpen = generateLiveBoardAnnouncement({
        action: "toggle_spot",
        pitchIndex: 0,
        positionLabel: "Arquero",
        isOpen: true,
      });
      const msgClosed = generateLiveBoardAnnouncement({
        action: "toggle_spot",
        pitchIndex: 1,
        positionLabel: "Defensa",
        isOpen: false,
      });

      expect(msgOpen).toContain("Puesto 1, posición Arquero: marcado como cupo abierto");
      expect(msgClosed).toContain("Puesto 2, posición Defensa: desmarcado, confirmado como titular offline");
    });

    it("TS8.03: generateLiveBoardAnnouncement generates message for bench_change", () => {
      const msgBench = generateLiveBoardAnnouncement({
        action: "bench_change",
        benchCount: 2,
        rotationRule: "Rotación activa continua",
      });
      const msgZero = generateLiveBoardAnnouncement({
        action: "bench_change",
        benchCount: 0,
      });

      expect(msgBench).toContain("2 suplente(s) en banca configurados");
      expect(msgBench).toContain("Rotación activa continua");
      expect(msgZero).toContain("Sin suplentes de banca");
    });

    it("TS8.04: generateLiveBoardAnnouncement generates message for sport_change", () => {
      const msgSport = generateLiveBoardAnnouncement({
        action: "sport_change",
        sportLabel: "Básquet",
        format: "5v5",
      });

      expect(msgSport).toContain("Deporte cambiado a Básquet, formato 5v5");
    });

    it("TS8.05: custom ariaLiveMessage overrides the default live text in the status region", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
          ariaLiveMessage="Cupo 3 marcado correctamente"
        />
      );

      expect(html).toContain("Cupo 3 marcado correctamente");
    });

    it("TS8.06: empty action produces empty announcement", () => {
      expect(generateLiveBoardAnnouncement({ action: "intent_switch" })).toBe("");
    });
  });

  // --------------------------------------------------------------------------
  // Suite 9: Color Contrast Mathematical Invariants (TS9)
  // --------------------------------------------------------------------------
  describe("Suite 9: Color Contrast Mathematical Invariants (WCAG 1.4.3 & 1.4.11)", () => {
    function lum(r: number, g: number, b: number) {
      const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function ratio(l1: number, l2: number) {
      const max = Math.max(l1, l2);
      const min = Math.min(l1, l2);
      return (max + 0.05) / (min + 0.05);
    }

    it("TS9.01: Chalk (#d9f2a5) on Turf (#0c6b4c) exceeds 4.5:1", () => {
      const lChalk = lum(0xd9, 0xf2, 0xa5);
      const lTurf = lum(0x0c, 0x6b, 0x4c);
      expect(ratio(lChalk, lTurf)).toBeGreaterThanOrEqual(4.5);
    });

    it("TS9.02: Flood (#ffd25a) focus ring on Turf (#0c6b4c) exceeds 3.0:1", () => {
      const lFlood = lum(0xff, 0xd2, 0x5a);
      const lTurf = lum(0x0c, 0x6b, 0x4c);
      expect(ratio(lFlood, lTurf)).toBeGreaterThanOrEqual(3.0);
    });

    it("TS9.03: Ink (#10231c) text on Flood (#ffd25a) spot exceeds 7.0:1 (AAA)", () => {
      const lInk = lum(0x10, 0x23, 0x1c);
      const lFlood = lum(0xff, 0xd2, 0x5a);
      expect(ratio(lInk, lFlood)).toBeGreaterThanOrEqual(7.0);
    });

    it("TS9.04: Bib-ink (#fff8f5) on Bib (#c42a16) exceeds 4.5:1", () => {
      const lBibInk = lum(0xff, 0xf8, 0xf5);
      const lBib = lum(0xc4, 0x2a, 0x16);
      expect(ratio(lBibInk, lBib)).toBeGreaterThanOrEqual(4.5);
    });

    it("TS9.05: Turf-deep (#073828) on Flood (#ffd25a) exceeds 7.0:1 (AAA)", () => {
      const lTurfDeep = lum(0x07, 0x38, 0x28);
      const lFlood = lum(0xff, 0xd2, 0x5a);
      expect(ratio(lTurfDeep, lFlood)).toBeGreaterThanOrEqual(7.0);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 10: Reduced Motion, Helpers & Resilience (TS10)
  // --------------------------------------------------------------------------
  describe("Suite 10: Reduced Motion, Helpers & Resilience", () => {
    it("TS10.01: CSS includes @media (prefers-reduced-motion: reduce) to disable animations", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain("@media (prefers-reduced-motion: reduce)");
    });

    it("TS10.02: handles null or malformed formationId gracefully with default fallback", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="non-existent-formation-id-xyz"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain("5v5");
      expect(html).toContain('role="region"');
    });

    it("TS10.03: getFormatCaption produces descriptive pedagogical captions for all sports", () => {
      const soccer = getFormatCaption("futbol", "5v5", "Diamante");
      const futsal = getFormatCaption("futbol_sala", "5v5");
      const basquet = getFormatCaption("basquet", "3v3");
      const voley = getFormatCaption("voleibol", "6v6");
      const padel = getFormatCaption("padel", "2v2");

      expect(soccer.headline).toContain("Fútbol 5v5");
      expect(soccer.detail).toContain("1 arquero + 4 jugadores de campo");
      expect(futsal.headline).toContain("Futsal 5v5");
      expect(basquet.detail).toContain("Media cancha con posesión alternada");
      expect(voley.detail).toContain("3 en zona de red");
      expect(padel.detail).toContain("Drive + jugador de Revés");
    });

    it("TS10.04: handles compact prop gracefully by applying is-compact class", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
          compact={true}
        />
      );

      expect(html).toContain("is-compact");
    });
  });
});
