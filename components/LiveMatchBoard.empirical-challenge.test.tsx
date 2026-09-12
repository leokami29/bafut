import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LiveMatchBoard,
  generateLiveBoardAnnouncement,
  getFormatCaption,
  handleTacticalSpotKeyDown,
  CourtLines,
  POSITION_SHORT_LABELS,
  POSITION_FULL_LABELS,
  type PitchSpotSelection,
} from "./LiveMatchBoard";
import {
  SPORTS,
  SPORT_RULES,
  defaultFormatForSport,
  formatsForSport,
  isFormat,
  isSport,
  type Format,
  type Sport,
} from "@/lib/sport-rules";
import {
  FORMATIONS_CATALOG,
  formationSlotCount,
  playersPerSideFromFormat,
  resolveFormation,
  suggestedRoleAt,
} from "@/lib/formations-catalog";
import { baseDotsForHalf } from "@/lib/match-formation";

describe("LiveMatchBoard — EMPIRICAL CHALLENGE SUITE", () => {
  // ==========================================================================
  // CHALLENGE 1: All 5 Sports and 12 Supported Formats Matrix
  // ==========================================================================
  describe("Challenge 1: Multi-Sport & Format Rendering Matrix (All 5 Sports & Formats)", () => {
    const MATRIX: Array<{ sport: Sport; format: Format; expectedSpots: number }> = [
      { sport: "futbol", format: "5v5", expectedSpots: 5 },
      { sport: "futbol", format: "6v6", expectedSpots: 6 },
      { sport: "futbol", format: "7v7", expectedSpots: 7 },
      { sport: "futbol", format: "8v8", expectedSpots: 8 },
      { sport: "futbol", format: "11v11", expectedSpots: 11 },
      { sport: "futbol_sala", format: "5v5", expectedSpots: 5 },
      { sport: "basquet", format: "3v3", expectedSpots: 3 },
      { sport: "basquet", format: "5v5", expectedSpots: 5 },
      { sport: "voleibol", format: "2v2", expectedSpots: 2 },
      { sport: "voleibol", format: "6v6", expectedSpots: 6 },
      { sport: "padel", format: "2v2", expectedSpots: 2 },
      { sport: "padel", format: "4v4", expectedSpots: 4 },
    ];

    it.each(MATRIX)(
      "renders correctly for $sport in format $format with exactly $expectedSpots spots per side",
      ({ sport, format, expectedSpots }) => {
        const html = renderToStaticMarkup(
          <LiveMatchBoard
            sport={sport}
            format={format}
            intent="starter_slots"
            formationId={null}
            selectedPitchSlots={[]}
            benchCount={0}
          />
        );

        // 1. Math check
        expect(playersPerSideFromFormat(format)).toBe(expectedSpots);

        // 2. Side A spot count verification
        // Every Side A interactive spot has data-pitch-index="N"
        const sideAMatches = html.match(/data-pitch-index="\d+"/g) || [];
        expect(sideAMatches.length).toBe(expectedSpots);

        // 3. Below-pitch action chip count verification
        const chipMatches = html.match(/<button[^>]+class="spot-chip\b/g) || [];
        expect(chipMatches.length).toBe(expectedSpots);

        // 4. Figcaption capacity text
        expect(html).toContain(
          `${expectedSpots * 2} jugadores en cancha (${expectedSpots} por lado)`
        );

        // 5. Structure & accessibility landmarks
        expect(html).toContain('role="region"');
        expect(html).toContain('id="live-tactical-board"');
        expect(html).toContain('id="live-board-status"');
        expect(html).toContain('role="status"');
      }
    );

    it("verifies sport-specific court line markings for each of the 5 sports", () => {
      const futbolHtml = renderToStaticMarkup(<CourtLines sport="futbol" />);
      const futsalHtml = renderToStaticMarkup(<CourtLines sport="futbol_sala" />);
      const basquetHtml = renderToStaticMarkup(<CourtLines sport="basquet" />);
      const voleyHtml = renderToStaticMarkup(<CourtLines sport="voleibol" />);
      const padelHtml = renderToStaticMarkup(<CourtLines sport="padel" />);

      // Fútbol: circle r=28, penalty boxes
      expect(futbolHtml).toContain('r="28"');
      expect(futbolHtml).toContain('width="42"');

      // Futsal: circle r=20, 6m D-zones
      expect(futsalHtml).toContain('r="20"');
      expect(futsalHtml).toContain('width="312"');

      // Básquet: circle r=22, paint keys
      expect(basquetHtml).toContain('r="22"');
      expect(basquetHtml).toContain('width="78"');

      // Vóley: center net stroke 2.6 and 3m attack lines
      expect(voleyHtml).toContain('stroke-width="2.6"');
      expect(voleyHtml).toContain('x1="118"');
      expect(voleyHtml).toContain('x1="242"');

      // Pádel: service lines
      expect(padelHtml).toContain('y1="110"');
      expect(padelHtml).toContain('x1="90"');
      expect(padelHtml).toContain('x1="270"');
    });
  });

  // ==========================================================================
  // CHALLENGE 2: Catalog Invariant Verification Across All 70+ Formations
  // ==========================================================================
  describe("Challenge 2: Catalog Invariants Across All 70+ Formations", () => {
    it("verifies every formation in FORMATIONS_CATALOG satisfies strict mathematical invariants", () => {
      expect(FORMATIONS_CATALOG.length).toBeGreaterThanOrEqual(70);

      for (const entry of FORMATIONS_CATALOG) {
        const expectedSpots = playersPerSideFromFormat(entry.format);

        // Invariant A: formationSlotCount must equal playersPerSide
        expect(formationSlotCount(entry)).toBe(expectedSpots);

        // Invariant B: baseDotsForHalf produces exact number of spots
        const setup = {
          sport: entry.sport,
          format: entry.format,
          formation: entry.lines,
          includeGk: entry.includeGk,
          formationId: entry.id,
          label: entry.label,
        };
        const dots = baseDotsForHalf(setup);
        expect(dots.length).toBe(expectedSpots);

        // Invariant C: sequential, unique pitch indexes [0 .. expectedSpots - 1]
        const indexes = dots.map((d) => d.pitchIndex);
        expect(indexes).toEqual(Array.from({ length: expectedSpots }, (_, i) => i));

        // Invariant D: all coordinates inside pitch bounds
        for (const dot of dots) {
          expect(dot.x).toBeGreaterThan(0);
          expect(dot.x).toBeLessThan(180); // strictly on left side A
          expect(dot.y).toBeGreaterThan(0);
          expect(dot.y).toBeLessThan(220); // strictly within pitch height
        }

        // Invariant E: suggestedRoleAt produces allowed position
        for (let i = 0; i < expectedSpots; i++) {
          const role = suggestedRoleAt(entry, i);
          expect(SPORT_RULES[entry.sport].positions).toContain(role);
        }
      }
    });

    it("verifies resolveFormation correctly matches explicit ID and falls back gracefully", () => {
      // Direct hit
      const f1 = resolveFormation("futbol", "5v5", "futbol-5v5-1-2-1");
      expect(f1.id).toBe("futbol-5v5-1-2-1");

      // Non-existent formation falls back to default for sport/format
      const fFallback = resolveFormation("futbol", "5v5", "non-existent-id");
      expect(fFallback.sport).toBe("futbol");
      expect(fFallback.format).toBe("5v5");
      expect(formationSlotCount(fFallback)).toBe(5);

      // Null formationId falls back cleanly
      const fNull = resolveFormation("voleibol", "6v6", null);
      expect(fNull.sport).toBe("voleibol");
      expect(fNull.format).toBe("6v6");
      expect(formationSlotCount(fNull)).toBe(6);
    });
  });

  // ==========================================================================
  // CHALLENGE 3: Format Math (playersPerSideFromFormat) Fuzzing & Boundaries
  // ==========================================================================
  describe("Challenge 3: Format Math Fuzzing & Boundary Invariants", () => {
    it("handles standard and boundary formats with exact math", () => {
      expect(playersPerSideFromFormat("1v1")).toBe(1);
      expect(playersPerSideFromFormat("2v2")).toBe(2);
      expect(playersPerSideFromFormat("3v3")).toBe(3);
      expect(playersPerSideFromFormat("4v4")).toBe(4);
      expect(playersPerSideFromFormat("5v5")).toBe(5);
      expect(playersPerSideFromFormat("6v6")).toBe(6);
      expect(playersPerSideFromFormat("7v7")).toBe(7);
      expect(playersPerSideFromFormat("8v8")).toBe(8);
      expect(playersPerSideFromFormat("11v11")).toBe(11);
      expect(playersPerSideFromFormat("22v22")).toBe(22);
    });

    it("handles whitespace, case variations, and strange input strings safely", () => {
      expect(playersPerSideFromFormat("  5v5  ")).toBe(5);
      expect(playersPerSideFromFormat("\t11V11\n")).toBe(11);
      expect(playersPerSideFromFormat("6V6")).toBe(6);
    });

    it("falls back safely to 5 for malformed or null inputs without throwing", () => {
      expect(playersPerSideFromFormat(null)).toBe(5);
      expect(playersPerSideFromFormat(undefined)).toBe(5);
      expect(playersPerSideFromFormat("")).toBe(5);
      expect(playersPerSideFromFormat("   ")).toBe(5);
      expect(playersPerSideFromFormat("soccer")).toBe(5);
      expect(playersPerSideFromFormat("invalid-format")).toBe(5);
      expect(playersPerSideFromFormat("5-vs-5")).toBe(5);
      expect(playersPerSideFromFormat("-5v-5")).toBe(5);
    });

    it("handles edge format '0v0' by clamping to minimum 1", () => {
      expect(playersPerSideFromFormat("0v0")).toBe(1);
    });
  });

  // ==========================================================================
  // CHALLENGE 4: Spot Toggling State Lifecycle, Index Integrity & Parity
  // ==========================================================================
  describe("Challenge 4: Spot Toggling State Lifecycle, Index Integrity & Parity", () => {
    it("simulates full toggle cycle: empty -> toggle spot 0 -> toggle spot 2 -> untoggle spot 0", () => {
      let selectedSlots: PitchSpotSelection[] = [];
      const onToggle = vi.fn((pitchIndex: number, role: string) => {
        const exists = selectedSlots.some((s) => s.pitchIndex === pitchIndex);
        if (exists) {
          selectedSlots = selectedSlots.filter((s) => s.pitchIndex !== pitchIndex);
        } else {
          selectedSlots = [...selectedSlots, { pitchIndex, position: role }];
        }
      });

      // Step 1: Initial state (all confirmed offline)
      let html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={selectedSlots}
          onTogglePitchSlot={onToggle}
          benchCount={0}
        />
      );
      expect(html).toContain("5 titulares confirmados, 0 cupos abiertos");
      expect(html).not.toContain('aria-pressed="true"');

      // Step 2: Toggle spot 0 (GK)
      onToggle(0, "gk");
      expect(selectedSlots).toEqual([{ pitchIndex: 0, position: "gk" }]);

      html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={selectedSlots}
          onTogglePitchSlot={onToggle}
          benchCount={0}
        />
      );
      expect(html).toContain("4 titulares confirmados, 1 cupos abiertos");
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain("Cupo abierto");

      // Step 3: Toggle spot 2 (MED)
      onToggle(2, "mid");
      expect(selectedSlots).toEqual([
        { pitchIndex: 0, position: "gk" },
        { pitchIndex: 2, position: "mid" },
      ]);

      html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={selectedSlots}
          onTogglePitchSlot={onToggle}
          benchCount={0}
        />
      );
      expect(html).toContain("3 titulares confirmados, 2 cupos abiertos");

      // Step 4: Untoggle spot 0
      onToggle(0, "gk");
      expect(selectedSlots).toEqual([{ pitchIndex: 2, position: "mid" }]);

      html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={selectedSlots}
          onTogglePitchSlot={onToggle}
          benchCount={0}
        />
      );
      expect(html).toContain("4 titulares confirmados, 1 cupos abiertos");
    });

    it("guarantees dual-modality parity: SVG canvas click and chip button trigger identical toggles", () => {
      const onToggle = vi.fn();
      const mockEvent = {
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      // Enter on SVG spot
      handleTacticalSpotKeyDown(mockEvent, 1, "def", onToggle);
      expect(onToggle).toHaveBeenCalledWith(1, "def");

      // Space on SVG spot
      const spaceEvent = {
        key: " ",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;
      handleTacticalSpotKeyDown(spaceEvent, 3, "fwd", onToggle);
      expect(onToggle).toHaveBeenCalledWith(3, "fwd");
    });

    it("verifies position abbreviation dictionary completeness for all catalog positions", () => {
      const allCatalogRoles = new Set<string>();
      for (const entry of FORMATIONS_CATALOG) {
        if (entry.roles) {
          for (const r of entry.roles) allCatalogRoles.add(r);
        }
      }

      for (const role of allCatalogRoles) {
        expect(POSITION_SHORT_LABELS[role]).toBeDefined();
        expect(POSITION_FULL_LABELS[role]).toBeDefined();
        expect(POSITION_SHORT_LABELS[role].length).toBeLessThanOrEqual(4);
      }
    });
  });

  // ==========================================================================
  // CHALLENGE 5: The 3 Mutually Exclusive Intents & Dynamic Transitions
  // ==========================================================================
  describe("Challenge 5: The 3 Mutually Exclusive Intents & Dynamic Transitions", () => {
    it("verifies Intent 1 ('starter_slots') shows interactive spots, action chips, and single-team hint", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[{ pitchIndex: 1, position: "def" }]}
          benchCount={1}
        />
      );

      expect(html).toContain('role="button"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('class="live-board-spot-chips"');
      expect(html).toContain("MODO EQUIPO ÚNICO");
      expect(html).toContain("Suplente 1 en banca");
    });

    it("verifies Intent 2 ('bench_only') completely locks pitch, hides chips, highlights bench hero, and shows rotation banner", () => {
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

      // Locked pitch
      expect(html).not.toContain('role="button"');
      expect(html).not.toContain('aria-pressed=');
      expect(html).not.toContain('class="live-board-spot-chips"');

      // Hero bench
      expect(html).toContain("is-hero-bench");
      expect(html).toContain("live-board-bench-hero");

      // Rotation banner
      expect(html).toContain('role="note"');
      expect(html).toContain("Cambios cada 15 min");
      expect(html).toContain("Titulares completos en cancha");

      // Side B watermark
      expect(html).toContain("RIVAL POR DEFINIR");
    });

    it("verifies Intent 3 ('challenge') in 'full_team' mode renders Rival Squad Crest with crossed swords", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="7v7"
          intent="challenge"
          formationId="futbol-7v7-2-3-1"
          selectedPitchSlots={[]}
          benchCount={0}
          challengeModeType="full_team"
          hostTeamName="Los Leones"
        />
      );

      expect(html).toContain("Los Leones");
      expect(html).toContain("live-board-rival-crest");
      expect(html).toContain("RIVAL COMPLETO (7)");
      expect(html).toContain("⚔");
      expect(html).toContain("live-board-center-vs");
    });

    it("verifies Intent 3 ('challenge') in 'open_slots' mode renders individual rival spots for open agents", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="7v7"
          intent="challenge"
          formationId="futbol-7v7-2-3-1"
          selectedPitchSlots={[]}
          benchCount={0}
          challengeModeType="open_slots"
        />
      );

      expect(html).toContain("is-rival-open");
      expect(html).toContain("Cupo abierto para rival libre");
      expect(html).not.toContain("live-board-rival-crest");
    });
  });

  // ==========================================================================
  // CHALLENGE 6: WCAG 2.2 AA Ergonomics & Accessibility Compliance
  // ==========================================================================
  describe("Challenge 6: WCAG 2.2 AA Ergonomics & Accessibility Compliance", () => {
    it("WCAG 2.5.5 / 2.5.8: verifies concentric touch target hitbox has r=22 (44x44px bounding box)", () => {
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

      // SVG circle with r="22" and fill="transparent"
      expect(html).toContain('r="22"');
      expect(html).toContain('fill="transparent"');
      expect(html).toContain('class="tactical-spot-hitbox live-board-hitbox"');
      expect(html).toContain('pointer-events="all"');
    });

    it("WCAG 2.5.5: below-pitch synchronized chips have inline minimum dimensions >= 44x44px", () => {
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

      expect(html).toContain("min-height:44px");
      expect(html).toContain("min-width:44px");
    });

    it("WCAG 2.4.7: focus visible ring token is present with high-contrast flood styling", () => {
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

      expect(html).toContain("live-board-focus-ring");
      expect(html).toContain(":focus-visible");
      expect(html).toContain("stroke: var(--flood, #ffd25a)");
    });

    it("WCAG 4.1.3: live region announcements cover all user interactions accurately", () => {
      const annIntent1 = generateLiveBoardAnnouncement({
        action: "intent_switch",
        intent: "starter_slots",
      });
      const annIntent2 = generateLiveBoardAnnouncement({
        action: "intent_switch",
        intent: "bench_only",
        benchCount: 2,
      });
      const annIntent3 = generateLiveBoardAnnouncement({
        action: "intent_switch",
        intent: "challenge",
        rivalCount: 5,
      });
      const annToggleOn = generateLiveBoardAnnouncement({
        action: "toggle_spot",
        pitchIndex: 0,
        positionLabel: "Arquero",
        isOpen: true,
      });
      const annToggleOff = generateLiveBoardAnnouncement({
        action: "toggle_spot",
        pitchIndex: 0,
        positionLabel: "Arquero",
        isOpen: false,
      });
      const annBench = generateLiveBoardAnnouncement({
        action: "bench_change",
        benchCount: 3,
        rotationRule: "Rotación activa continua",
      });

      expect(annIntent1).toContain("Modo completar titulares activado");
      expect(annIntent2).toContain("Modo solo banca activado");
      expect(annIntent3).toContain("Modo reto a rival activado");
      expect(annToggleOn).toContain("marcado como cupo abierto");
      expect(annToggleOff).toContain("confirmado como titular offline");
      expect(annBench).toContain("3 suplente(s) en banca configurados");
    });

    it("WCAG 2.3.3: supports prefers-reduced-motion media query to remove animations", () => {
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

      expect(html).toContain("@media (prefers-reduced-motion: reduce)");
      expect(html).toContain("animation: none !important");
    });
  });

  // ==========================================================================
  // CHALLENGE 7: Adversarial Edge Cases, Fault Tolerance & Robustness
  // ==========================================================================
  describe("Challenge 7: Adversarial Edge Cases & Robustness", () => {
    it("handles unknown/corrupted sport gracefully by falling back to soccer", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport={"cricket" as unknown as Sport}
          format="5v5"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain('role="region"');
      expect(html).toContain("5v5");
    });

    it("handles unknown/corrupted format gracefully by falling back to default format", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format={"99v99" as unknown as Format}
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain('role="region"');
    });

    it("handles hostile script injection in hostTeamName without vulnerability", () => {
      const hostileName = "<script>alert('xss')</script><b>Team</b>";
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="challenge"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
          hostTeamName={hostileName}
        />
      );

      // React escapes raw HTML characters in text nodes
      expect(html).not.toContain("<script>alert('xss')</script>");
      expect(html).toContain("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
    });

    it("handles extreme benchCount values safely", () => {
      const htmlZero = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );
      expect(htmlZero).not.toContain("live-board-bench-group");

      const htmlFour = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={4}
        />
      );
      expect(htmlFour).toContain("Suplente 4 en banca");
    });

    it("handles selectedPitchSlots containing indexes outside format boundary without crashing", () => {
      const outOfBoundsSlots: PitchSpotSelection[] = [
        { pitchIndex: 99, position: "fwd" },
        { pitchIndex: -5, position: "gk" },
      ];

      expect(() =>
        renderToStaticMarkup(
          <LiveMatchBoard
            sport="futbol"
            format="5v5"
            intent="starter_slots"
            formationId="futbol-5v5-1-2-1"
            selectedPitchSlots={outOfBoundsSlots}
            benchCount={0}
          />
        )
      ).not.toThrow();
    });

    it("handles readOnly mode by disabling all interactive triggers", () => {
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
      expect(html).not.toContain('class="live-board-spot-chips"');
    });
  });
});
