import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ClaimPlayerPreview } from "@/components/ClaimPlayerPreview";
import type { ClaimPreviewProfile } from "@/lib/types";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
});

const publicProfile: ClaimPreviewProfile = {
  id: "11111111-1111-1111-1111-111111111111",
  display_name: "Ana Gómez",
  avatar_path: "11111111-1111-1111-1111-111111111111/a.jpg",
  card_share_code: "abc12345",
  preferred_sport: "futbol",
  preferred_format: "5v5",
  preferred_position: "fwd",
  level: "mid",
  terms_accepted_at: "2026-09-01T00:00:00Z",
};

describe("ClaimPlayerPreview links gated", () => {
  it("muestra Perfil y Carta solo con ficha pública", () => {
    const html = renderToStaticMarkup(
      <ClaimPlayerPreview profile={publicProfile} slotLevel="mid" declaredLevel="mid" />,
    );
    expect(html).toContain("/jugador/abc12345");
    expect(html).toContain("/carta/abc12345");
    expect(html).not.toContain("Ficha incompleta");
  });

  it("chip incompleta sin card_share_code (sin links rotos)", () => {
    const html = renderToStaticMarkup(
      <ClaimPlayerPreview
        profile={{ ...publicProfile, card_share_code: null }}
        slotLevel="high"
        declaredLevel="mid"
      />,
    );
    expect(html).toContain("Ficha incompleta");
    expect(html).not.toContain("/jugador/");
    expect(html).not.toContain("/carta/");
  });
});

describe("feed matchSelect smoke", () => {
  it("matchSelect del feed no incluye preview ni WhatsApp", () => {
    const src = readFileSync(join(process.cwd(), "lib/data.ts"), "utf8");
    const feedBlock = src.slice(
      src.indexOf("const matchSelect = `"),
      src.indexOf("const matchDetailSelect = `"),
    );
    const detailBlock = src.slice(
      src.indexOf("const matchDetailSelect = `"),
      src.indexOf("`;", src.indexOf("const matchDetailSelect = `")) + 2,
    );

    expect(feedBlock).not.toContain("card_share_code");
    expect(feedBlock).not.toContain("whatsapp");
    expect(feedBlock).not.toContain("profile_contacts");
    expect(feedBlock).not.toContain("preferred_sport");

    expect(detailBlock).toContain("card_share_code");
    expect(detailBlock).not.toContain("whatsapp");
    expect(detailBlock).not.toContain("profile_contacts");
  });
});
