import { describe, expect, it } from "vitest";
import { isShareCode, isUuid } from "@/lib/ids";
import {
  bookingProofObjectPath,
  isBookingProofPathOwned,
} from "@/lib/booking-proofs";
import {
  isSubscriptionProofPathForVenue,
  subscriptionProofObjectPath,
} from "@/lib/subscription-proofs";
import { cleanStorageObjectPath, isSafeStorageObjectPath } from "@/lib/storage-path";
import { isVenuePhotoPathForVenue, venuePhotoPublicUrl } from "@/lib/venue-photos";

const VENUE = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const USER = "11111111-2222-4333-8444-555555555555";

describe("ids", () => {
  it("acepta UUID y share codes válidos", () => {
    expect(isUuid(VENUE)).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isShareCode("abcdef12")).toBe(true);
    expect(isShareCode("ABCDEF12")).toBe(false);
    expect(isShareCode("../evil")).toBe(false);
  });
});

describe("storage-path", () => {
  it("bloquea traversal y absolutos", () => {
    expect(isSafeStorageObjectPath(`${VENUE}/foto.jpg`)).toBe(true);
    expect(isSafeStorageObjectPath("../etc/passwd")).toBe(false);
    expect(isSafeStorageObjectPath("/absolute/path.jpg")).toBe(false);
    expect(isSafeStorageObjectPath("a\\b.jpg")).toBe(false);
    expect(isSafeStorageObjectPath("a//b.jpg")).toBe(false);
    expect(cleanStorageObjectPath(`/${VENUE}/x.jpg`)).toBe(`${VENUE}/x.jpg`);
    expect(cleanStorageObjectPath(`${VENUE}/../x.jpg`)).toBeNull();
  });
});

describe("booking proof ownership", () => {
  it("acepta paths bajo venue/user", () => {
    const path = bookingProofObjectPath(VENUE, USER, "pago.PNG");
    expect(isBookingProofPathOwned(path, VENUE, USER)).toBe(true);
  });

  it("rechaza path de otro usuario o traversal", () => {
    expect(
      isBookingProofPathOwned(`${VENUE}/${USER}/../secret.pdf`, VENUE, USER),
    ).toBe(false);
    expect(
      isBookingProofPathOwned(`${VENUE}/${USER}/x.pdf`, VENUE, "00000000-0000-4000-8000-000000000000"),
    ).toBe(false);
    expect(isBookingProofPathOwned("evil/path.pdf", VENUE, USER)).toBe(false);
  });
});

describe("subscription / venue photo paths", () => {
  it("valida prefijo de venue", () => {
    const sub = subscriptionProofObjectPath(VENUE, "comp.pdf");
    expect(isSubscriptionProofPathForVenue(sub, VENUE)).toBe(true);
    expect(isSubscriptionProofPathForVenue(sub, USER)).toBe(false);
    expect(isVenuePhotoPathForVenue(`${VENUE}/abc.webp`, VENUE)).toBe(true);
    expect(isVenuePhotoPathForVenue(`${VENUE}/../x.webp`, VENUE)).toBe(false);
  });

  it("venuePhotoPublicUrl no propaga traversal", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    const url = venuePhotoPublicUrl("../etc/passwd");
    expect(url.endsWith("/invalid")).toBe(true);
    expect(url.includes("..")).toBe(false);
  });
});
