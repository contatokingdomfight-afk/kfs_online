import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FamilyContext } from "./family-context";

vi.mock("./family-context", () => ({
  getFamilyContext: vi.fn(),
}));

import { studentHasPaymentUnlock } from "./family-payment-gate";
import { getFamilyContext } from "./family-context";

const mockGetFamilyContext = vi.mocked(getFamilyContext);

function familyContext(role: "TITULAR" | "MEMBER"): FamilyContext {
  return {
    group: {
      id: "fg-1",
      name: "Família Teste",
      billingStudentId: "titular-1",
      planId: "plan-familia",
      schoolId: "school-1",
      isActive: true,
      discountPercent: 10,
    },
    role,
    isTitular: role === "TITULAR",
    billingStudentId: "titular-1",
    memberCount: 2,
  };
}

function createPaymentMockSupabase(paidCount: number): SupabaseClient {
  return {
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        async then() {
          /* unused */
        },
      };
      if (table === "Payment") {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ count: paidCount, error: null }),
            }),
          }),
        };
      }
      return chain;
    },
  } as unknown as SupabaseClient;
}

describe("studentHasPaymentUnlock", () => {
  beforeEach(() => {
    mockGetFamilyContext.mockReset();
  });

  it("desbloqueia com adminGrantedFullAccess sem consultar pagamentos", async () => {
    const supabase = createPaymentMockSupabase(0);
    mockGetFamilyContext.mockResolvedValue(null);

    await expect(studentHasPaymentUnlock(supabase, "student-1", true)).resolves.toBe(true);
    expect(mockGetFamilyContext).not.toHaveBeenCalled();
  });

  it("membro do plano família (não-titular) desbloqueia sem pagamento PAID próprio", async () => {
    mockGetFamilyContext.mockResolvedValue(familyContext("MEMBER"));

    const supabase = createPaymentMockSupabase(0);
    await expect(studentHasPaymentUnlock(supabase, "member-1", false)).resolves.toBe(true);
  });

  it("titular do plano família sem PAID próprio fica bloqueado", async () => {
    mockGetFamilyContext.mockResolvedValue(familyContext("TITULAR"));

    const supabase = createPaymentMockSupabase(0);
    await expect(studentHasPaymentUnlock(supabase, "titular-1", false)).resolves.toBe(false);
  });

  it("titular do plano família com PAID próprio desbloqueia", async () => {
    mockGetFamilyContext.mockResolvedValue(familyContext("TITULAR"));

    const supabase = createPaymentMockSupabase(1);
    await expect(studentHasPaymentUnlock(supabase, "titular-1", false)).resolves.toBe(true);
  });

  it("aluno fora do plano família sem PAID fica bloqueado", async () => {
    mockGetFamilyContext.mockResolvedValue(null);

    const supabase = createPaymentMockSupabase(0);
    await expect(studentHasPaymentUnlock(supabase, "solo-1", false)).resolves.toBe(false);
  });

  it("aluno fora do plano família com PAID desbloqueia", async () => {
    mockGetFamilyContext.mockResolvedValue(null);

    const supabase = createPaymentMockSupabase(2);
    await expect(studentHasPaymentUnlock(supabase, "solo-1", false)).resolves.toBe(true);
  });
});
