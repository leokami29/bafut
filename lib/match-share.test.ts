import { describe, expect, it } from "vitest";
import {
  facebookShareHref,
  matchShareCaption,
  matchShareText,
  matchUrl,
} from "@/lib/match-share";

describe("match-share", () => {
  it("arma URL del partido", () => {
    expect(matchUrl("abcdef12")).toMatch(/\/p\/abcdef12$/);
  });

  it("facebook sharer incluye la URL encodeada", () => {
    const href = facebookShareHref("https://bafut.app/p/abcdef12");
    expect(href).toContain("facebook.com/sharer/sharer.php");
    expect(href).toContain(encodeURIComponent("https://bafut.app/p/abcdef12"));
  });

  it("texto de WhatsApp incluye cupo y link", () => {
    const text = matchShareText({
      hole: "Faltan 2",
      when: "vie 20:00",
      venue: "Padel Park",
      neighborhood: "Riomar",
      price: "$20.000",
      shareCode: "abcdef12",
    });
    expect(text).toContain("Faltan 2");
    expect(text).toContain("Padel Park");
    expect(text).toContain("/p/abcdef12");
  });

  it("caption de Instagram es una sola línea usable", () => {
    const caption = matchShareCaption({
      hole: "Faltan 2",
      when: "vie 20:00",
      venue: "Padel Park",
      neighborhood: null,
      price: "$20.000",
      shareCode: "abcdef12",
    });
    expect(caption).not.toContain("\n");
    expect(caption).toContain("/p/abcdef12");
  });
});
