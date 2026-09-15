import { describe, expect, it } from "vitest";
import {
  facebookShareHref,
  playerCardShareCaption,
  playerCardShareText,
  playerCardUrl,
} from "@/lib/player-card-share";

describe("player-card-share", () => {
  it("arma URL de la carta", () => {
    expect(playerCardUrl("abcdef12")).toMatch(/\/carta\/abcdef12$/);
  });

  it("facebook sharer incluye la URL encodeada", () => {
    const href = facebookShareHref("https://bafut.app/carta/abcdef12");
    expect(href).toContain("facebook.com/sharer/sharer.php");
    expect(href).toContain(encodeURIComponent("https://bafut.app/carta/abcdef12"));
  });

  it("texto de WhatsApp incluye OVR y link", () => {
    const text = playerCardShareText({
      displayName: "Leo",
      overall: 72,
      sport: "Fútbol",
      cardCode: "abcdef12",
    });
    expect(text).toContain("Mi carta BaFut");
    expect(text).toContain("Leo");
    expect(text).toContain("OVR 72");
    expect(text).toContain("/carta/abcdef12");
  });

  it("caption de Instagram es una sola línea usable", () => {
    const caption = playerCardShareCaption({
      displayName: "Leo",
      overall: 72,
      sport: "Fútbol",
      cardCode: "abcdef12",
    });
    expect(caption).not.toContain("\n");
    expect(caption).toContain("/carta/abcdef12");
  });
});
