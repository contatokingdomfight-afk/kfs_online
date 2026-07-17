import { describe, expect, it } from "vitest";
import { computeFamilyPricingFromMembers, type FamilyMemberPriceInfo } from "./family-tuition";

function member(overrides: Partial<FamilyMemberPriceInfo>): FamilyMemberPriceInfo {
  return {
    studentId: "s1",
    role: "MEMBER",
    referencePlanId: "plan-x",
    referencePlanName: "Plan X",
    referencePrice: 100,
    usedFallback: false,
    ...overrides,
  };
}

describe("computeFamilyPricingFromMembers", () => {
  it("soma os preços de referência e aplica o desconto do grupo", () => {
    const members = [
      member({ studentId: "titular", role: "TITULAR", referencePrice: 100 }),
      member({ studentId: "filho1", referencePrice: 40 }),
      member({ studentId: "filho2", referencePrice: 40 }),
    ];
    const out = computeFamilyPricingFromMembers(members, 10);
    expect(out.baseTotal).toBe(180);
    expect(out.discountAmount).toBe(18);
    expect(out.finalMonthlyAmount).toBe(162);
    expect(out.membersMissingReferencePlan).toEqual([]);
  });

  it("sem desconto (0%), o total final é igual à base", () => {
    const members = [member({ referencePrice: 80 }), member({ studentId: "s2", referencePrice: 80 })];
    const out = computeFamilyPricingFromMembers(members, 0);
    expect(out.baseTotal).toBe(160);
    expect(out.discountAmount).toBe(0);
    expect(out.finalMonthlyAmount).toBe(160);
  });

  it("lista membros que usaram o fallback (sem plano de referência definido)", () => {
    const members = [
      member({ studentId: "com-plano", usedFallback: false, referencePrice: 100 }),
      member({ studentId: "sem-plano", usedFallback: true, referencePrice: 80 }),
    ];
    const out = computeFamilyPricingFromMembers(members, 0);
    expect(out.membersMissingReferencePlan).toEqual(["sem-plano"]);
  });

  it("arredonda a 2 casas decimais", () => {
    const members = [member({ referencePrice: 55.5 }), member({ studentId: "s2", referencePrice: 33.33 })];
    const out = computeFamilyPricingFromMembers(members, 15);
    // base = 88.83; desconto 15% = 13.3245 -> 13.32; final = 75.51
    expect(out.baseTotal).toBe(88.83);
    expect(out.discountAmount).toBe(13.32);
    expect(out.finalMonthlyAmount).toBe(75.51);
  });

  it("grupo sem membros dá base e total zero", () => {
    const out = computeFamilyPricingFromMembers([], 20);
    expect(out.baseTotal).toBe(0);
    expect(out.discountAmount).toBe(0);
    expect(out.finalMonthlyAmount).toBe(0);
  });
});
