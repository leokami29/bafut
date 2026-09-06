import { describe, expect, it } from "vitest";
import { isRateLimitError, RATE_LIMIT_SCOPES } from "@/lib/rate-limit";
import {
  MAX_VENUE_PHOTOS,
  validateVenuePhotoFile,
  validateVenuePhotoUpload,
} from "@/lib/venue-photos";

describe("rate-limit helpers", () => {
  it("detecta mensajes de cuota del RPC", () => {
    expect(isRateLimitError("Demasiados reclamos. Esperá un rato.")).toBe(true);
    expect(isRateLimitError("Cancha no encontrada.")).toBe(false);
  });

  it("exporta scopes estables para A2 / admin", () => {
    expect(RATE_LIMIT_SCOPES.venueSubscribe).toBe("venue_subscribe");
    expect(RATE_LIMIT_SCOPES.venueSubscribeAdmin).toBe("venue_subscribe_admin");
  });
});

describe("venue photo caps", () => {
  it("bloquea al llegar al máximo por cancha", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "a.jpg", {
      type: "image/jpeg",
    });
    expect(validateVenuePhotoUpload(file, MAX_VENUE_PHOTOS)).toEqual({
      error: `Esta cancha ya tiene el máximo de ${MAX_VENUE_PHOTOS} fotos.`,
    });
    expect(validateVenuePhotoFile(file)).toEqual({ ok: true });
  });
});
