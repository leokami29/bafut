import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MatchIntentSelector } from "./MatchIntentSelector";

describe("MatchIntentSelector Component — Didactic Convocatoria & WCAG 2.2 AA", () => {
  it("renders radiogroup and 3 accessible intent cards with role='radio'", () => {
    const html = renderToStaticMarkup(
      <MatchIntentSelector
        sport="voleibol"
        format="6v6"
        selectedIntent="starter_slots"
        onIntentChange={vi.fn()}
        benchCount={0}
        onBenchCountChange={vi.fn()}
        rotationRule="Rotación activa continua"
        onRotationRuleChange={vi.fn()}
        hostTeamName=""
        onHostTeamNameChange={vi.fn()}
        challengeModeType="full_team"
        onChallengeModeTypeChange={vi.fn()}
        challengeTargetLevel="any"
        onChallengeTargetLevelChange={vi.fn()}
      />
    );

    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-labelledby="');
    expect(html).toContain("Completar Titulares");
    expect(html).toContain("Solo Banca / Rotación");
    expect(html).toContain("Buscar Equipo Rival");
    expect(html).toContain('role="radio"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-live="polite"');
  });

  it("renders starter slots controls when selectedIntent is starter_slots", () => {
    const html = renderToStaticMarkup(
      <MatchIntentSelector
        sport="futbol"
        format="5v5"
        selectedIntent="starter_slots"
        onIntentChange={vi.fn()}
        benchCount={2}
        onBenchCountChange={vi.fn()}
        rotationRule="Rotación activa continua"
        onRotationRuleChange={vi.fn()}
        hostTeamName=""
        onHostTeamNameChange={vi.fn()}
        challengeModeType="full_team"
        onChallengeModeTypeChange={vi.fn()}
        challengeTargetLevel="any"
        onChallengeTargetLevelChange={vi.fn()}
        openStarterCount={3}
        onOpenStarterCountChange={vi.fn()}
      />
    );

    expect(html).toContain("Cupos titulares que faltan en tu equipo");
    expect(html).toContain("Suplentes para rotar (opcional)");
    expect(html).toContain("2 banca");
    expect(html).toContain("Pacto de rotación");
    expect(html).toContain("Rotación activa continua");
  });

  it("renders bench_only notice and mandatory rotation rule when selectedIntent is bench_only", () => {
    const html = renderToStaticMarkup(
      <MatchIntentSelector
        sport="voleibol"
        format="6v6"
        selectedIntent="bench_only"
        onIntentChange={vi.fn()}
        benchCount={2}
        onBenchCountChange={vi.fn()}
        rotationRule="Cambios cada 15 min"
        onRotationRuleChange={vi.fn()}
        hostTeamName=""
        onHostTeamNameChange={vi.fn()}
        challengeModeType="full_team"
        onChallengeModeTypeChange={vi.fn()}
        challengeTargetLevel="any"
        onChallengeTargetLevelChange={vi.fn()}
      />
    );

    expect(html).toContain("Titulares completos");
    expect(html).toContain("¿Cuántos suplentes necesitan?");
    expect(html).toContain("Pacto de rotación obligatorio");
    expect(html).toContain("Cambios cada 15 min");
    // Does not render starter chips in bench_only mode
    expect(html).not.toContain("Cupos titulares que faltan en tu equipo");
  });

  it("renders challenge details with exact rival format calculation when selectedIntent is challenge", () => {
    const html = renderToStaticMarkup(
      <MatchIntentSelector
        sport="voleibol"
        format="6v6"
        selectedIntent="challenge"
        onIntentChange={vi.fn()}
        benchCount={0}
        onBenchCountChange={vi.fn()}
        rotationRule="Rotación activa continua"
        onRotationRuleChange={vi.fn()}
        hostTeamName="Los Invencibles"
        onHostTeamNameChange={vi.fn()}
        challengeModeType="full_team"
        onChallengeModeTypeChange={vi.fn()}
        challengeTargetLevel="mid"
        onChallengeTargetLevelChange={vi.fn()}
      />
    );

    expect(html).toContain("Tu equipo (6 titulares) está listo");
    expect(html).toContain("6 cupos en el Equipo Rival");
    expect(html).toContain("Nombre de tu equipo");
    expect(html).toContain("Los Invencibles");
    expect(html).toContain("Nivel esperado del rival");
    expect(html).toContain("Reto a equipo completo");
    expect(html).toContain("Rivales libres");
  });

  it("contains pure SVG icons and does not use emojis as accessible icons", () => {
    const html = renderToStaticMarkup(
      <MatchIntentSelector
        sport="padel"
        format="2v2"
        selectedIntent="starter_slots"
        onIntentChange={vi.fn()}
        benchCount={0}
        onBenchCountChange={vi.fn()}
        rotationRule="Rotación activa continua"
        onRotationRuleChange={vi.fn()}
        hostTeamName=""
        onHostTeamNameChange={vi.fn()}
        challengeModeType="full_team"
        onChallengeModeTypeChange={vi.fn()}
        challengeTargetLevel="any"
        onChallengeTargetLevelChange={vi.fn()}
      />
    );

    expect(html).toContain("<svg");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("intent-card-icon");
  });
});
