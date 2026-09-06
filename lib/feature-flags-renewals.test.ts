import { describe, expect, it } from "vitest";
import { parseFeatureEnv } from "@/lib/feature-flags";
import {
  classifyRenewalType,
  pickRenewalChannel,
  renewalWindows,
} from "@/lib/renewals";

describe("parseFeatureEnv", () => {
  it("parsea on/off y vacío", () => {
    expect(parseFeatureEnv(undefined)).toBeNull();
    expect(parseFeatureEnv("")).toBeNull();
    expect(parseFeatureEnv("0")).toBe(false);
    expect(parseFeatureEnv("off")).toBe(false);
    expect(parseFeatureEnv("1")).toBe(true);
    expect(parseFeatureEnv("true")).toBe(true);
  });
});

describe("renewals", () => {
  it("clasifica T-7 y T-1", () => {
    const now = new Date("2026-09-06T12:00:00.000Z");
    const windows = renewalWindows(now);
    expect(classifyRenewalType(windows.t7.from.toISOString(), now)).toBe("t7");
    expect(classifyRenewalType(windows.t1.to.toISOString(), now)).toBe("t1");
    expect(classifyRenewalType(new Date(now.getTime() + 3 * 86400000).toISOString(), now)).toBeNull();
  });

  it("elige canal WhatsApp > email Resend > admin_queue", () => {
    expect(
      pickRenewalChannel({
        whatsapp: "573001234567",
        email: "a@b.co",
        resendConfigured: true,
      }),
    ).toBe("whatsapp");
    expect(
      pickRenewalChannel({
        whatsapp: null,
        email: "a@b.co",
        resendConfigured: true,
      }),
    ).toBe("email");
    expect(
      pickRenewalChannel({
        whatsapp: null,
        email: "a@b.co",
        resendConfigured: false,
      }),
    ).toBe("admin_queue");
  });
});
