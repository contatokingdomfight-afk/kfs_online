import { describe, expect, it } from "vitest";
import { hasPaymentMethod, missingToOpen, schoolStatus, type SchoolPaymentMethods } from "./school-status";

const NO_METHODS: SchoolPaymentMethods = {
  ibanEnabled: false,
  iban: null,
  mbwayEnabled: false,
  mbwayPhone: null,
  revolutEnabled: false,
  multibancoEnabled: false,
};

describe("schoolStatus", () => {
  it("deriva o estado de isActive e openedAt", () => {
    expect(schoolStatus({ isActive: false, openedAt: null })).toBe("PREPARACAO");
    expect(schoolStatus({ isActive: true, openedAt: "2026-10-31" })).toBe("ATIVA");
    expect(schoolStatus({ isActive: false, openedAt: "2026-10-31" })).toBe("DESATIVADA");
  });
});

describe("hasPaymentMethod", () => {
  it("sem definições ou sem meios ligados não conta", () => {
    expect(hasPaymentMethod(null)).toBe(false);
    expect(hasPaymentMethod(NO_METHODS)).toBe(false);
  });

  it("IBAN e MB Way precisam de estar ligados e preenchidos", () => {
    expect(hasPaymentMethod({ ...NO_METHODS, ibanEnabled: true })).toBe(false);
    expect(hasPaymentMethod({ ...NO_METHODS, iban: "PT50" })).toBe(false);
    expect(hasPaymentMethod({ ...NO_METHODS, ibanEnabled: true, iban: "PT50" })).toBe(true);
    expect(hasPaymentMethod({ ...NO_METHODS, mbwayEnabled: true, mbwayPhone: "912345678" })).toBe(true);
  });
});

describe("missingToOpen", () => {
  it("lista o que falta", () => {
    expect(missingToOpen(0, null)).toEqual(["diretor", "meio de pagamento"]);
    expect(missingToOpen(1, null)).toEqual(["meio de pagamento"]);
    expect(missingToOpen(1, { ...NO_METHODS, revolutEnabled: true })).toEqual([]);
  });
});
