import { describe, expect, it } from "vitest";
import {
  formatWhatsappDisplay,
  normalizeWhatsapp,
  whatsappChatHref,
} from "@/lib/whatsapp-contact";

describe("normalizeWhatsapp", () => {
  it("normaliza celular colombiano de 10 dígitos con prefijo 57", () => {
    expect(normalizeWhatsapp("301 4258786")).toBe("573014258786");
    expect(normalizeWhatsapp("3014258786")).toBe("573014258786");
  });

  it("acepta formato +57 y respeta el prefijo existente", () => {
    expect(normalizeWhatsapp("+57 3014258786")).toBe("573014258786");
    expect(normalizeWhatsapp("573014258786")).toBe("573014258786");
  });

  it("pasa números internacionales válidos (10-15 dígitos)", () => {
    expect(normalizeWhatsapp("15551234567")).toBe("15551234567");
  });

  it("rechaza vacíos y números cortos", () => {
    expect(normalizeWhatsapp("")).toBe(null);
    expect(normalizeWhatsapp("abc")).toBe(null);
    expect(normalizeWhatsapp("12345")).toBe(null);
  });

  it("acepta 10 dígitos por el catch-all internacional (fijos CO incluidos)", () => {
    expect(normalizeWhatsapp("6051234567")).toBe("6051234567");
  });
});

describe("whatsappChatHref", () => {
  it("link base sin texto", () => {
    expect(whatsappChatHref("573014258786")).toBe("https://wa.me/573014258786");
  });

  it("agrega texto urlencoded", () => {
    expect(whatsappChatHref("573014258786", "Hola, voy!")).toBe(
      "https://wa.me/573014258786?text=Hola%2C%20voy!",
    );
  });
});

describe("formatWhatsappDisplay", () => {
  it("formatea celular colombiano con espacios", () => {
    expect(formatWhatsappDisplay("573014258786")).toBe("+57 301 425 8786");
  });

  it("otros países: +digits", () => {
    expect(formatWhatsappDisplay("15551234567")).toBe("+15551234567");
  });
});
