import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { syncPendingInsuranceAmounts } from "./sync-pending-insurance-amount";

vi.mock("./insurance-settings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./insurance-settings")>()),
  getInsuranceSettings: vi.fn(),
}));

// Sem service role nos testes: lê com o cliente simulado.
vi.mock("@/lib/supabase/admin", () => ({ getAdminClientOrNull: () => ({ client: null }) }));

import { getInsuranceSettings } from "./insurance-settings";

const mockGetInsuranceSettings = vi.mocked(getInsuranceSettings);

function chainable<T>(result: T) {
  const self = {
    eq: () => self,
    in: () => self,
    then: (onFulfilled: (value: T) => unknown) => Promise.resolve(result).then(onFulfilled),
  };
  return self;
}

type PayRow = { id: string; amount: number | string; studentId: string };

function createSupabase(
  rows: PayRow[],
  opts: { students?: { id: string; schoolId: string | null }[]; overrides?: Record<string, unknown>[] } = {}
): SupabaseClient {
  return {
    from(table: string) {
      if (table === "Student") return { select: () => chainable({ data: opts.students ?? [], error: null }) };
      if (table === "SchoolPaymentSettings") return { select: () => chainable({ data: opts.overrides ?? [], error: null }) };
      if (table !== "Payment") {
        return { select: () => chainable({ data: [], error: null }) };
      }

      return {
        select: () => chainable({ data: rows, error: null }),
        update: (payload: { amount: string }) => ({
          eq: async (_col: string, id: string) => {
            const row = rows.find((r) => r.id === id);
            if (row) row.amount = payload.amount;
            return { error: null };
          },
        }),
      };
    },
  } as unknown as SupabaseClient;
}

describe("syncPendingInsuranceAmounts", () => {
  beforeEach(() => {
    mockGetInsuranceSettings.mockReset();
  });

  const settings = {
    id: "global",
    annualAmount: 30,
    enrollmentAmount: 0,
    policyReference: null,
    waiverVersion: "1",
    membershipAgreementVersion: "1",
    enrollmentFormVersion: "1",
    updatedAt: new Date().toISOString(),
  };

  it("actualiza seguros LATE com valor antigo para o annualAmount actual", async () => {
    mockGetInsuranceSettings.mockResolvedValue(settings);

    const rows = [{ id: "pay-1", amount: 25, studentId: "student-1" }];
    const supabase = createSupabase(rows);

    const { updated } = await syncPendingInsuranceAmounts(supabase, {
      studentId: "student-1",
      referenceYear: "2026",
    });

    expect(updated).toBe(1);
    expect(rows[0].amount).toBe("30.00");
  });

  it("não altera quando o valor já está correcto", async () => {
    mockGetInsuranceSettings.mockResolvedValue(settings);

    const rows = [{ id: "pay-1", amount: 30, studentId: "student-1" }];
    const supabase = createSupabase(rows);

    const { updated } = await syncPendingInsuranceAmounts(supabase, { studentId: "student-1" });

    expect(updated).toBe(0);
    expect(rows[0].amount).toBe(30);
  });

  it("usa o seguro próprio da escola do aluno quando existe", async () => {
    mockGetInsuranceSettings.mockResolvedValue(settings);

    const rows = [
      { id: "pay-a", amount: 30, studentId: "aluno-escola-b" },
      { id: "pay-b", amount: 25, studentId: "aluno-sede" },
    ];
    const supabase = createSupabase(rows, {
      students: [
        { id: "aluno-escola-b", schoolId: "escola-b" },
        { id: "aluno-sede", schoolId: "sede" },
      ],
      overrides: [{ schoolId: "escola-b", insuranceAnnualAmount: "40.00", enrollmentAmount: null }],
    });

    const { updated } = await syncPendingInsuranceAmounts(supabase);

    expect(updated).toBe(2);
    expect(rows[0].amount).toBe("40.00");
    expect(rows[1].amount).toBe("30.00");
  });
});
