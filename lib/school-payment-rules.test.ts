import { describe, expect, it } from "vitest";
import {
  NO_SCHOOL_PAYMENT_INFO,
  SEDE_SCHOOL_ID,
  enrollmentPaymentMethods,
  hasAnySchoolPaymentMethod,
  orderPaymentSchoolId,
  schoolPaymentInfoFromRow,
  type SchoolPaymentSettingsRow,
} from "./school-payment-rules";

const EMPTY: SchoolPaymentSettingsRow = {
  ibanEnabled: false,
  iban: null,
  ibanHolder: null,
  ibanHolderAddress: null,
  bicSwift: null,
  revolutTag: null,
  mbwayEnabled: false,
  mbwayPhone: null,
  cashEnabled: false,
  revolutEnabled: false,
};

describe("schoolPaymentInfoFromRow", () => {
  it("sem linha: nenhum meio (nunca os de outra escola)", () => {
    expect(schoolPaymentInfoFromRow("escola-b", null, true)).toEqual(NO_SCHOOL_PAYMENT_INFO);
    expect(hasAnySchoolPaymentMethod(NO_SCHOOL_PAYMENT_INFO)).toBe(false);
  });

  it("IBAN e MB Way precisam de estar ligados e preenchidos", () => {
    expect(schoolPaymentInfoFromRow("escola-b", { ...EMPTY, iban: "PT50" }, true).transfer).toBeNull();
    expect(schoolPaymentInfoFromRow("escola-b", { ...EMPTY, ibanEnabled: true, iban: "  " }, true).transfer).toBeNull();
    expect(schoolPaymentInfoFromRow("escola-b", { ...EMPTY, mbwayPhone: "912345678" }, true).mbwayPhone).toBeNull();
    expect(schoolPaymentInfoFromRow("escola-b", { ...EMPTY, ibanEnabled: true, iban: "PT50" }, true).transfer?.iban).toBe("PT50");
    expect(schoolPaymentInfoFromRow("escola-b", { ...EMPTY, mbwayEnabled: true, mbwayPhone: "912345678" }, true).mbwayPhone).toBe("912345678");
  });

  it("Revolut online só com o meio ligado e a conta da própria escola configurada", () => {
    const on = { ...EMPTY, revolutEnabled: true };
    expect(schoolPaymentInfoFromRow(SEDE_SCHOOL_ID, on, true).onlineRevolut).toBe(true);
    expect(schoolPaymentInfoFromRow(SEDE_SCHOOL_ID, on, false).onlineRevolut).toBe(false);
    expect(schoolPaymentInfoFromRow(SEDE_SCHOOL_ID, EMPTY, true).onlineRevolut).toBe(false);
    expect(schoolPaymentInfoFromRow("escola-b", on, true).onlineRevolut).toBe(true);
    expect(schoolPaymentInfoFromRow("escola-b", on, false).onlineRevolut).toBe(false);
    expect(schoolPaymentInfoFromRow("escola-b", EMPTY, true).onlineRevolut).toBe(false);
  });
});

describe("enrollmentPaymentMethods", () => {
  const sede = schoolPaymentInfoFromRow(SEDE_SCHOOL_ID, { ...EMPTY, ibanEnabled: true, iban: "LT38", cashEnabled: true, revolutEnabled: true }, true);

  it("a Sede mantém as opções atuais, com Revolut só na adesão do próprio aluno", () => {
    expect(enrollmentPaymentMethods(sede, { includeOnline: true })).toEqual(["REVOLUT", "CASH", "TRANSFER"]);
    expect(enrollmentPaymentMethods(sede, { includeOnline: false })).toEqual(["CASH", "TRANSFER"]);
  });

  it("outra escola só tem os seus meios", () => {
    const row = { ...EMPTY, mbwayEnabled: true, mbwayPhone: "912345678", revolutEnabled: true };
    expect(enrollmentPaymentMethods(schoolPaymentInfoFromRow("escola-b", row, false), { includeOnline: true })).toEqual(["MBWAY"]);
    expect(enrollmentPaymentMethods(schoolPaymentInfoFromRow("escola-b", row, true), { includeOnline: true })).toEqual(["REVOLUT", "MBWAY"]);
    expect(enrollmentPaymentMethods(NO_SCHOOL_PAYMENT_INFO, { includeOnline: true })).toEqual([]);
  });
});

describe("orderPaymentSchoolId", () => {
  it("encomenda sem escola (loja pública) é da Sede", () => {
    expect(orderPaymentSchoolId(null)).toBe(SEDE_SCHOOL_ID);
    expect(orderPaymentSchoolId("escola-b")).toBe("escola-b");
  });
});
