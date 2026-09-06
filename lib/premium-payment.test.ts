import { describe, expect, it } from "vitest";
import { formatCop, paymentMethodLabel } from "@/lib/premium-payment";
import { buildInvoiceViewModel } from "@/lib/invoice";
import {
  subscriptionProofObjectPath,
  validateSubscriptionProofFile,
} from "@/lib/subscription-proofs";

describe("premium-payment", () => {
  it("formatea COP sin decimales", () => {
    expect(formatCop(49900)).toMatch(/49\.?900|49900/);
    expect(paymentMethodLabel("nequi")).toBe("Nequi");
    expect(paymentMethodLabel("bank_transfer")).toBe("Transferencia bancaria");
  });
});

describe("subscription-proofs", () => {
  it("arma ruta bajo venue_id", () => {
    const path = subscriptionProofObjectPath(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "comprobante.JPG",
    );
    expect(path.startsWith("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/")).toBe(true);
    expect(path.endsWith(".jpg")).toBe(true);
  });

  it("rechaza tipos no permitidos", () => {
    const bad = new File(["x"], "x.gif", { type: "image/gif" });
    expect(validateSubscriptionProofFile(bad)).toEqual({
      error: "Solo imágenes JPG/PNG/WEBP o PDF de hasta 5 MB.",
    });
  });
});

describe("invoice", () => {
  it("arma view model legible", () => {
    const vm = buildInvoiceViewModel({
      invoiceNumber: "BF-202609-0001",
      venueName: "Cancha Test",
      venueNeighborhood: "El Prado",
      plan: "premium",
      paymentMethod: "nequi",
      amountCop: 49900,
      paymentReference: "ABC123",
      startedAt: "2026-09-06T12:00:00.000Z",
      expiresAt: "2026-10-06T12:00:00.000Z",
      issuedAt: "2026-09-06T12:00:00.000Z",
    });
    expect(vm.planLabel).toBe("Premium");
    expect(vm.methodLabel).toBe("Nequi");
    expect(vm.invoiceNumber).toBe("BF-202609-0001");
  });
});
