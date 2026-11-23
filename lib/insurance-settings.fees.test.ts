import { describe, expect, it } from "vitest";
import { applySchoolFeeOverrides, type InsuranceSettingsRow } from "./insurance-settings";

const network: InsuranceSettingsRow = {
  id: "global",
  annualAmount: 35,
  enrollmentAmount: 20,
  policyReference: null,
  waiverVersion: "3",
  membershipAgreementVersion: "2",
  enrollmentFormVersion: "1",
  updatedAt: "2026-11-23T00:00:00Z",
};

describe("applySchoolFeeOverrides", () => {
  it("sem valores próprios usa os da rede", () => {
    expect(applySchoolFeeOverrides(network, null)).toMatchObject({ annualAmount: 35, enrollmentAmount: 20 });
    expect(applySchoolFeeOverrides(network, { enrollmentAmount: null, insuranceAnnualAmount: null })).toMatchObject({
      annualAmount: 35,
      enrollmentAmount: 20,
    });
  });

  it("valores da escola substituem os da rede (vindos da BD como texto)", () => {
    expect(applySchoolFeeOverrides(network, { enrollmentAmount: "15.00", insuranceAnnualAmount: "40.50" })).toMatchObject({
      annualAmount: 40.5,
      enrollmentAmount: 15,
    });
  });

  it("zero é um valor válido (escola sem matrícula)", () => {
    expect(applySchoolFeeOverrides(network, { enrollmentAmount: 0 }).enrollmentAmount).toBe(0);
  });

  it("mantém as versões dos documentos da rede", () => {
    expect(applySchoolFeeOverrides(network, { enrollmentAmount: 10 }).membershipAgreementVersion).toBe("2");
  });
});
