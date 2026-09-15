import { afterEach, describe, expect, it, vi } from "vitest";
import {
  avatarPublicUrlToProxyUrl,
  downloadPlayerCardBlob,
  downloadPlayerCardFromUrl,
  PLAYER_CARD_EXPORT_FILENAME,
} from "@/lib/player-card-export";

function stubDownloadDom() {
  const click = vi.fn();
  const remove = vi.fn();
  const appendChild = vi.fn();
  const setAttribute = vi.fn();
  const style: Record<string, string> = {};
  const anchor = {
    href: "",
    download: "",
    rel: "",
    style,
    click,
    remove,
    setAttribute,
  };

  vi.stubGlobal("document", {
    createElement: () => anchor,
    body: { appendChild },
  });

  return { click, remove, appendChild, setAttribute, style, anchor };
}

describe("downloadPlayerCardBlob", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("mete el link en el DOM, sin display:none, y no revoca el blob al toque", () => {
    vi.useFakeTimers();
    const { click, remove, appendChild, style, anchor } = stubDownloadDom();
    const revoke = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:carta",
      revokeObjectURL: revoke,
    });

    downloadPlayerCardBlob(new Blob(["png"], { type: "image/png" }));

    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledOnce();
    expect(anchor.download).toBe(PLAYER_CARD_EXPORT_FILENAME);
    expect(style.display).not.toBe("none");
    expect(revoke).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2500);
    expect(revoke).toHaveBeenCalledWith("blob:carta");
    expect(remove).toHaveBeenCalledOnce();
  });
});

describe("downloadPlayerCardFromUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dispara un <a download> same-origin", () => {
    const { click, appendChild, anchor } = stubDownloadDom();

    downloadPlayerCardFromUrl("/carta/abc/opengraph-image");

    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledOnce();
    expect(anchor.href).toBe("/carta/abc/opengraph-image");
    expect(anchor.download).toBe(PLAYER_CARD_EXPORT_FILENAME);
  });
});

describe("avatarPublicUrlToProxyUrl", () => {
  it("mapea URL pública de Supabase al proxy same-origin", () => {
    const src =
      "https://xyz.supabase.co/storage/v1/object/public/profile-avatars/11111111-1111-1111-1111-111111111111/foto.jpg";
    expect(avatarPublicUrlToProxyUrl(src, "https://bafut.local")).toBe(
      "/api/media/avatar?path=11111111-1111-1111-1111-111111111111%2Ffoto.jpg",
    );
  });

  it("rechaza URLs que no son del bucket de avatares", () => {
    expect(
      avatarPublicUrlToProxyUrl(
        "https://xyz.supabase.co/storage/v1/object/public/other-bucket/a.jpg",
        "https://bafut.local",
      ),
    ).toBeNull();
    expect(avatarPublicUrlToProxyUrl("https://evil.test/foto.jpg", "https://bafut.local")).toBeNull();
  });

  it("rechaza paths inseguros", () => {
    expect(
      avatarPublicUrlToProxyUrl(
        "https://xyz.supabase.co/storage/v1/object/public/profile-avatars/../secret.jpg",
        "https://bafut.local",
      ),
    ).toBeNull();
  });
});
