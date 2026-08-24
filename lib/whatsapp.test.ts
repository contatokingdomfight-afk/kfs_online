import { describe, expect, it } from "vitest";
import { buildPaymentOverdueMessage, buildWhatsAppUrl, normalizePhoneForWhatsApp } from "./whatsapp";

describe("normalizePhoneForWhatsApp", () => {
  it("prefixes a 9-digit PT local number with 351", () => {
    expect(normalizePhoneForWhatsApp("912345678")).toBe("351912345678");
  });

  it("strips formatting characters before normalizing", () => {
    expect(normalizePhoneForWhatsApp("912 345 678")).toBe("351912345678");
  });

  it("keeps a number that already has a country code", () => {
    expect(normalizePhoneForWhatsApp("+351912345678")).toBe("351912345678");
  });

  it("strips a leading 00 international prefix", () => {
    expect(normalizePhoneForWhatsApp("00351912345678")).toBe("351912345678");
  });

  it("returns null for empty input", () => {
    expect(normalizePhoneForWhatsApp("")).toBeNull();
    expect(normalizePhoneForWhatsApp("   ")).toBeNull();
  });
});

describe("buildWhatsAppUrl", () => {
  it("builds a wa.me link with an encoded message", () => {
    const url = buildWhatsAppUrl("912345678", "Olá!");
    expect(url).toBe("https://wa.me/351912345678?text=Ol%C3%A1!");
  });

  it("returns null when the phone has no digits", () => {
    expect(buildWhatsAppUrl("n/a", "Olá!")).toBeNull();
  });
});

describe("buildPaymentOverdueMessage", () => {
  it("includes the student's first name", () => {
    expect(buildPaymentOverdueMessage("Ana")).toContain("Olá Ana!");
  });

  it("falls back gracefully when no name is given", () => {
    expect(buildPaymentOverdueMessage("")).toContain("Olá tudo bem!");
  });
});
