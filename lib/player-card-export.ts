import { toBlob } from "html-to-image";

export const PLAYER_CARD_EXPORT_FILENAME = "carta-bafut.png";

export type PlayerCardExportResult = {
  blob: Blob;
  file: File;
};

export class PlayerCardExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlayerCardExportError";
  }
}

function stripMotionTransforms(root: HTMLElement) {
  root.style.transform = "none";
  root.style.rotate = "none";
  root.querySelectorAll<HTMLElement>(".player-card-tilt, .player-card-motion-host").forEach((el) => {
    el.style.transform = "none";
    el.style.rotate = "none";
  });
}

function hideExportChrome(root: HTMLElement) {
  root.querySelectorAll(".player-card-crop-hint").forEach((el) => el.remove());
}

async function inlineImagesForExport(root: HTMLElement): Promise<() => void> {
  const revokes: string[] = [];
  const imgs = root.querySelectorAll("img");

  await Promise.all(
    Array.from(imgs).map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;

      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";

      try {
        const response = await fetch(src, { mode: "cors", credentials: "omit", cache: "no-cache" });
        if (!response.ok) return;
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        revokes.push(objectUrl);
        img.src = objectUrl;
        await img.decode().catch(() => undefined);
      } catch {
        // Si CORS falla, html-to-image puede seguir sin la foto o con useCORS.
      }
    }),
  );

  return () => {
    for (const url of revokes) URL.revokeObjectURL(url);
  };
}

function buildExportClone(source: HTMLElement): HTMLElement {
  const rect = source.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;

  clone.setAttribute("data-card-export-clone", "true");
  clone.style.transform = "none";
  clone.style.margin = "0";
  clone.style.width = `${rect.width}px`;
  clone.style.maxWidth = `${rect.width}px`;

  stripMotionTransforms(clone);
  hideExportChrome(clone);

  return clone;
}

/** Exporta el nodo raíz de la carta (article) como PNG a pixelRatio 2. */
export async function exportPlayerCardElement(element: HTMLElement): Promise<PlayerCardExportResult> {
  if (typeof document === "undefined") {
    throw new PlayerCardExportError("La exportación solo está disponible en el navegador.");
  }

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";
  host.style.overflow = "hidden";

  const clone = buildExportClone(element);
  host.appendChild(clone);
  document.body.appendChild(host);

  const revokeInline = await inlineImagesForExport(clone);

  try {
    const blob = await toBlob(clone, {
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: false,
      fetchRequestInit: { mode: "cors", credentials: "omit", cache: "no-cache" },
    });

    if (!blob) {
      throw new PlayerCardExportError("No pudimos generar la imagen de la carta.");
    }

    const file = new File([blob], PLAYER_CARD_EXPORT_FILENAME, { type: "image/png" });
    return { blob, file };
  } catch (err) {
    if (err instanceof PlayerCardExportError) throw err;
    throw new PlayerCardExportError(
      "No pudimos capturar la carta. Probá de nuevo o compartí el link.",
    );
  } finally {
    revokeInline();
    host.remove();
  }
}

export function downloadPlayerCardBlob(blob: Blob, filename = PLAYER_CARD_EXPORT_FILENAME) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function canShareFiles(files: File[]): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") {
    return false;
  }
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}
