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
  FORMATIONS_CATALOG,
  playersPerSideFromFormat,
  resolveFormation,
} from "@/lib/formations-catalog";
import { baseDotsForHalf } from "@/lib/match-formation";
import { SPORTS, type Sport, type Format } from "@/lib/sport-rules";

describe("LiveMatchBoard — Adversarial Touch Target & State Mutation Stress Suite", () => {
  // ==========================================================================
  // Dimension 1: Touch Target Hit Area Stress (WCAG 2.5.5 / 2.5.8)
  // ==========================================================================
  describe("Dimension 1: Touch Target Geometry & Dual-Modality Target Audit", () => {
    it("TT.01: every interactive tactical spot on SVG has an invisible touch hitbox with r=22 (44x44px bounding box)", () => {
      for (const sport of SPORTS) {
        const format = sport === "voleibol" ? "6v6" : sport === "padel" ? "2v2" : "5v5";
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

        // Find all interactive spot groups
        const buttonCount = (html.match(/role="button"/g) || []).length;
        const expectedPerSide = playersPerSideFromFormat(format);
        expect(buttonCount).toBe(expectedPerSide);

        // Verify r="22" hitbox circles match the number of interactive buttons
        const hitboxMatches =
          html.match(/<circle[^>]+r="22"[^>]+fill="transparent"[^>]+class="tactical-spot-hitbox live-board-hitbox"[^>]+pointer-events="all"/g) ||
          [];
        expect(hitboxMatches.length).toBe(expectedPerSide);
      }
    });

    it("TT.02: dual-modality spot action bar buttons strictly enforce minHeight: 44px and minWidth: 44px", () => {
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

      // Verify the spot chips container is present with role="group"
      expect(html).toContain('class="live-board-spot-chips"');
      expect(html).toContain('role="group"');
      expect(html).toContain('aria-label="Lista táctica de puestos en cancha"');

      // Verify each button has inline minHeight and minWidth >= 44px
      const buttonMatches = html.match(/<button[^>]+style="min-height:44px;min-width:44px"[^>]*>/g) || [];
      expect(buttonMatches.length).toBe(5);

      // Verify each button has type="button" to prevent form submission side-effects
      buttonMatches.forEach((btn) => {
        expect(btn).toContain('type="button"');
      });
    });

    it("TT.03: CSS includes .spot-chip min-height and min-width 44px rules for responsive resilience", () => {
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

      expect(html).toContain("min-height: 44px;");
      expect(html).toContain("min-width: 44px;");
      expect(html).toContain("gap: 0.5rem;");
    });

    it("TT.04: empirical Euclidean distance stress test across all catalog formations identifies dense vs sparse pitch layouts", () => {
      // For every formation across all sports, calculate minimum distance between any two dots
      let totalFormationsTested = 0;
      let sparseFormationsCount = 0; // minDist >= 44px
      let denseFormationsCount = 0;  // minDist < 44px (where chips action bar is critical)

      for (const entry of FORMATIONS_CATALOG) {
        totalFormationsTested++;
        const setup = {
          sport: entry.sport as Sport,
          format: entry.format as Format,
          formation: entry.lines,
          includeGk: entry.includeGk,
          formationId: entry.id,
          label: entry.label,
        };

        const dots = baseDotsForHalf(setup);
        let minDistance = Number.POSITIVE_INFINITY;

        for (let i = 0; i < dots.length; i++) {
          for (let j = i + 1; j < dots.length; j++) {
            const dx = dots[i].x - dots[j].x;
            const dy = dots[i].y - dots[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistance) {
              minDistance = dist;
            }
          }
        }

        if (minDistance >= 44) {
          sparseFormationsCount++;
        } else {
          denseFormationsCount++;
        }
      }

      // Assert that we tested the catalog formations
      expect(totalFormationsTested).toBeGreaterThanOrEqual(15);
      // In dense formations (e.g., 4-4-2 or 5-3-2 in 11v11), min distance is ~29-38px,
      // proving that the dual-modality chips bar is mathematically necessary for WCAG 2.5.5 / 2.5.8 conformance!
      expect(denseFormationsCount).toBeGreaterThan(0);
    });

    it("TT.05: readOnly mode suppresses all interactive button roles and hides the spot action chips bar", () => {
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
      expect(html).not.toContain('class="live-board-spot-chips"');
      expect(html).not.toContain('class="tactical-spot-hitbox');
      expect(html).not.toContain('aria-pressed');
    });

    it("TT.06: bench_only and challenge modes do not expose interactive spot buttons on Side A", () => {
      const htmlBench = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="bench_only"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={2}
        />
      );
      expect(htmlBench).not.toContain('role="button"');
      expect(htmlBench).not.toContain('class="live-board-spot-chips"');

      const htmlChallenge = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="challenge"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );
      expect(htmlChallenge).not.toContain('role="button"');
      expect(htmlChallenge).not.toContain('class="live-board-spot-chips"');
    });
  });

  // ==========================================================================
  // Dimension 2: Rapid Toggle & State Mutation Stress
  // ==========================================================================
  describe("Dimension 2: Rapid Toggle & State Mutation Stress", () => {
    it("SM.01: rapid sequential toggle of all spots maintains consistent visual and ARIA states", () => {
      const perSide = 5;
      let currentSlots: PitchSpotSelection[] = [];

      // 1. Sequentially add spots from 0 to 4
      for (let i = 0; i < perSide; i++) {
        currentSlots = [...currentSlots, { pitchIndex: i, position: "mid" }];
        const html = renderToStaticMarkup(
          <LiveMatchBoard
            sport="futbol"
            format="5v5"
            intent="starter_slots"
            formationId="futbol-5v5-1-2-1"
            selectedPitchSlots={currentSlots}
            benchCount={0}
          />
        );

        // Open count should be i + 1, confirmed count should be 5 - (i + 1)
        expect(html).toContain(`${5 - (i + 1)} titulares confirmados, ${i + 1} cupos abiertos en cancha`);

        // Check aria-pressed counts
        const pressedTrueCount = (html.match(/aria-pressed="true"/g) || []).length;
        // Dual modality means both SVG spot and below-pitch chip have aria-pressed="true"
        expect(pressedTrueCount).toBe((i + 1) * 2);
      }

      // 2. Sequentially remove spots from 4 down to 0
      for (let i = perSide - 1; i >= 0; i--) {
        currentSlots = currentSlots.filter((s) => s.pitchIndex !== i);
        const html = renderToStaticMarkup(
          <LiveMatchBoard
            sport="futbol"
            format="5v5"
            intent="starter_slots"
            formationId="futbol-5v5-1-2-1"
            selectedPitchSlots={currentSlots}
            benchCount={0}
          />
        );

        expect(html).toContain(`${5 - i} titulares confirmados, ${i} cupos abiertos en cancha`);
      }
    });

    it("SM.02: full team selection (all spots open) correctly updates caption and spot marks", () => {
      const allSlots: PitchSpotSelection[] = Array.from({ length: 5 }, (_, i) => ({
        pitchIndex: i,
        position: "any",
      }));

      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={allSlots}
          benchCount={0}
        />
      );

      expect(html).toContain("0 titulares confirmados, 5 cupos abiertos en cancha");
      // All 5 spots should display "?" mark
      const questionMarks = (html.match(/>\?</g) || []).length;
      expect(questionMarks).toBe(5);
    });

    it("SM.03: high-frequency mutation stress simulation (1,000 rapid toggle transitions)", () => {
      const format = "5v5";
      const totalToggles = 1000;
      let activeSlots: PitchSpotSelection[] = [];

      for (let step = 0; step < totalToggles; step++) {
        const targetIndex = step % 5;
        const exists = activeSlots.some((s) => s.pitchIndex === targetIndex);
        if (exists) {
          activeSlots = activeSlots.filter((s) => s.pitchIndex !== targetIndex);
        } else {
          activeSlots = [...activeSlots, { pitchIndex: targetIndex, position: "mid" }];
        }

        // Periodic rendering check every 100 iterations
        if (step % 100 === 0) {
          const html = renderToStaticMarkup(
            <LiveMatchBoard
              sport="futbol"
              format={format}
              intent="starter_slots"
              formationId={null}
              selectedPitchSlots={activeSlots}
              benchCount={0}
            />
          );

          expect(html).toContain('role="region"');
          expect(html).toContain(`Lado A · Mi Equipo`);
          const openCount = activeSlots.length;
          expect(html).toContain(`${5 - openCount} titulares confirmados, ${openCount} cupos abiertos en cancha`);
        }
      }
    });

    it("SM.04: resilience against duplicate pitch indices in selectedPitchSlots", () => {
      // Intentionally pass duplicated indices: [0, 0, 1, 1, 2]
      const duplicateSlots: PitchSpotSelection[] = [
        { pitchIndex: 0, position: "gk" },
        { pitchIndex: 0, position: "gk" },
        { pitchIndex: 1, position: "def" },
        { pitchIndex: 1, position: "def" },
        { pitchIndex: 2, position: "mid" },
      ];

      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={duplicateSlots}
          benchCount={0}
        />
      );

      // Rendering does not crash
      expect(html).toContain('role="region"');
      // Spots 0, 1, and 2 are marked open on the pitch (unique Set)
      expect(html).toContain('data-pitch-index="0"');
      expect(html).toContain('data-pitch-index="1"');
      expect(html).toContain('data-pitch-index="2"');
    });

    it("SM.05: resilience against out-of-range pitch indices (negative, out of bounds)", () => {
      const boundarySlots: PitchSpotSelection[] = [
        { pitchIndex: -1, position: "unknown" },
        { pitchIndex: 999, position: "unknown" },
      ];

      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId="futbol-5v5-1-2-1"
          selectedPitchSlots={boundarySlots}
          benchCount={0}
        />
      );

      expect(html).toContain('role="region"');
      // Normal spots 0 to 4 remain confirmed (not matched by -1 or 999)
      expect(html).toContain('class="live-board-spot-group tactical-spot is-confirmed"');
    });
  });

  // ==========================================================================
  // Dimension 3: Extreme Bench Counts & Rotation Rule Stress
  // ==========================================================================
  describe("Dimension 3: Extreme Bench Counts & Rotation Rule Stress", () => {
    it("BC.01: benchCount = 0 in starter_slots suppresses bench row completely", () => {
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

      expect(html).not.toContain("live-board-bench-group");
      expect(html).not.toContain("BANQUILLO / ROTACIÓN");
    });

    it("BC.02: standard bench counts (1, 2, 3, 4) render exact number of substitute spots", () => {
      for (const count of [1, 2, 3, 4]) {
        const html = renderToStaticMarkup(
          <LiveMatchBoard
            sport="futbol"
            format="5v5"
            intent="starter_slots"
            formationId={null}
            selectedPitchSlots={[]}
            benchCount={count}
          />
        );

        expect(html).toContain("live-board-bench-group");
        for (let i = 1; i <= count; i++) {
          expect(html).toContain(`Suplente ${i} en banca (Rotación)`);
        }
      }
    });

    it("BC.03: bench_only mode with benchCount = 0 renders fallback hero spot without crashing", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="bench_only"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain("live-board-bench-group");
      expect(html).toContain("is-hero-bench");
      expect(html).toContain("live-board-pact-banner");
    });

    it("BC.04: extreme bench count (benchCount = 10) renders all 10 substitute spots safely", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={10}
        />
      );

      expect(html).toContain("Suplente 10 en banca (Rotación)");
      const spotCount = (html.match(/class="live-board-bench-spot is-side-a"/g) || []).length;
      expect(spotCount).toBe(10);
    });

    it("BC.05: negative bench count (benchCount = -3) does not throw or create negative array allocation", () => {
      expect(() => {
        renderToStaticMarkup(
          <LiveMatchBoard
            sport="futbol"
            format="5v5"
            intent="starter_slots"
            formationId={null}
            selectedPitchSlots={[]}
            benchCount={-3}
          />
        );
      }).not.toThrow();
    });

    it("BC.06: rotationRule with special characters, quotes, and HTML entities renders safely", () => {
      const dangerousRule = '<script>alert("xss")</script> & "Cambio libre cada 10\'" > 5';
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="bench_only"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={2}
          rotationRule={dangerousRule}
        />
      );

      // React escapes raw HTML strings in text nodes
      expect(html).not.toContain("<script>alert");
      expect(html).toContain("&lt;script&gt;alert");
      expect(html).toContain("Cambio libre cada 10&#x27;");
    });

    it("BC.07: empty, whitespace-only, or undefined rotationRule falls back to canonical default", () => {
      const htmlNull = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="bench_only"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={2}
          rotationRule={undefined}
        />
      );
      expect(htmlNull).toContain("Rotación activa continua");

      const htmlBlank = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="bench_only"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={2}
          rotationRule="   "
        />
      );
      expect(htmlBlank).toContain("Rotación activa continua");
    });
  });

  // ==========================================================================
  // Dimension 4: Malformed Sport & Format Boundary Resilience
  // ==========================================================================
  describe("Dimension 4: Malformed Sport & Format Boundary Resilience", () => {
    it("SF.01: invalid sport falls back safely to 'futbol' without throwing", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport={"handball_unsupported" as unknown as Sport}
          format="5v5"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain('aria-label="Pizarra táctica interactiva: Fútbol 5v5, Convocatoria Completar Titulares"');
      expect(html).toContain('role="region"');
    });

    it("SF.02: invalid format falls back safely to default sport format without throwing", () => {
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

      expect(html).toContain("5v5");
      expect(html).toContain('role="region"');
    });

    it("SF.03: null, empty string, or whitespace hostTeamName falls back to 'Mi Equipo'", () => {
      const htmlNull = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
          hostTeamName={undefined}
        />
      );
      expect(htmlNull).toContain("Lado A · Mi Equipo");

      const htmlBlank = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="starter_slots"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
          hostTeamName="   "
        />
      );
      expect(htmlBlank).toContain("Lado A · Mi Equipo");
    });

    it("SF.04: volleyball 6v6 renders exactly 6 starter spots per side and attack lines", () => {
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

      expect(html).toContain("Voleibol 6v6");
      const buttonCount = (html.match(/role="button"/g) || []).length;
      expect(buttonCount).toBe(6);
      expect(html).toContain('x1="118"'); // 3m attack line
      expect(html).toContain('x1="242"');
    });

    it("SF.05: padel 2v2 renders exactly 2 starter spots with Drive and Revés roles", () => {
      const html = renderToStaticMarkup(
        <LiveMatchBoard
          sport="padel"
          format="2v2"
          intent="starter_slots"
          formationId="padel-2v2-pareja"
          selectedPitchSlots={[]}
          benchCount={0}
        />
      );

      expect(html).toContain("Pádel 2v2");
      const buttonCount = (html.match(/role="button"/g) || []).length;
      expect(buttonCount).toBe(2);
      expect(html).toContain("DRI");
      expect(html).toContain("REV");
    });
  });

  // ==========================================================================
  // Dimension 5: ARIA Tree Invariants & Live Announcements Stress
  // ==========================================================================
  describe("Dimension 5: ARIA Tree Invariants & Live Announcements Stress", () => {
    it("ARIA.01: live announcements generator stress test (5,000 randomized cycles)", () => {
      const actions = ["intent_switch", "toggle_spot", "bench_change", "sport_change"] as const;
      const intents = ["starter_slots", "bench_only", "challenge"] as const;

      for (let i = 0; i < 5000; i++) {
        const action = actions[i % actions.length];
        const res = generateLiveBoardAnnouncement({
          action,
          intent: intents[i % intents.length],
          pitchIndex: i % 11,
          positionLabel: "Medio",
          isOpen: i % 2 === 0,
          benchCount: i % 5,
          sportLabel: "Fútbol",
          format: "5v5",
          rotationRule: "Rotación activa",
          rivalCount: 5,
        });

        expect(typeof res).toBe("string");
        expect(res.length).toBeGreaterThan(0);
      }
    });

    it("ARIA.02: live announcement returns empty string for unexpected/unhandled actions", () => {
      const res = generateLiveBoardAnnouncement({
        action: "unsupported_action" as unknown as "intent_switch",
      });
      expect(res).toBe("");
    });

    it("ARIA.03: handleTacticalSpotKeyDown stress test with rapid key strokes", () => {
      const onToggle = vi.fn();

      // Stress test: 500 rapid key event dispatches
      for (let i = 0; i < 500; i++) {
        const isEnter = i % 3 === 0;
        const isSpace = i % 3 === 1;
        const key = isEnter ? "Enter" : isSpace ? " " : "ArrowDown";

        const mockEvent = {
          key,
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;

        const handled = handleTacticalSpotKeyDown(mockEvent, i % 5, "mid", onToggle);

        if (isEnter || isSpace) {
          expect(handled).toBe(true);
          expect(mockEvent.preventDefault).toHaveBeenCalled();
        } else {
          expect(handled).toBe(false);
          expect(mockEvent.preventDefault).not.toHaveBeenCalled();
        }
      }

      // Assert toggle was called exactly for Enter and Space (about 333 times)
      expect(onToggle).toHaveBeenCalledTimes(334);
    });

    it("ARIA.04: figcaption describes complete narrative in challenge mode with open_slots vs full_team", () => {
      const htmlFull = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="challenge"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
          challengeModeType="full_team"
        />
      );
      expect(htmlFull).toContain("Reto a rival completo: esperando equipo rival completo de 5 jugadores.");

      const htmlOpen = renderToStaticMarkup(
        <LiveMatchBoard
          sport="futbol"
          format="5v5"
          intent="challenge"
          formationId={null}
          selectedPitchSlots={[]}
          benchCount={0}
          challengeModeType="open_slots"
        />
      );
      expect(htmlOpen).toContain("Reto abierto con 5 cupos para rivales libres.");
    });

    it("ARIA.05: position label dictionaries contain complete translations for all roles", () => {
      const requiredRoles = [
        "gk", "def", "mid", "fwd", "cierre", "ala", "pivot",
        "base", "escolta", "ala_pivot", "armador", "central",
        "opuesto", "receptor", "libero", "drive", "reves", "any"
      ];

      for (const role of requiredRoles) {
        expect(POSITION_SHORT_LABELS[role]).toBeDefined();
        expect(POSITION_FULL_LABELS[role]).toBeDefined();
        expect(POSITION_SHORT_LABELS[role].length).toBeLessThanOrEqual(4);
      }
    });
  });
});
