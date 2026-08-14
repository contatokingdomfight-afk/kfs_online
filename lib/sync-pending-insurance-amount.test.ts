import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { syncPendingInsuranceAmounts } from "./sync-pending-insurance-amount";

vi.mock("./insurance-settings", () => ({
  getInsuranceSettings: vi.fn(),
}));

import { getInsuranceSettings } from "./insurance-settings";

const mockGetInsuranceSettings = vi.mocked(getInsuranceSettings);

function chainable<T>(result: T) {
  const self = {
    eq: () => self,
    then: (onFulfilled: (value: T) => unknown) => Promise.resolve(result).then(onFulfilled),
  };
  return self;
}

function createSupabase(rows: { id: string; amount: number | string }[]): SupabaseClient {
  return {
    from(table: string) {
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

    const rows = [{ id: "pay-1", amount: 25 }];
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

    const rows = [{ id: "pay-1", amount: 30 }];
    const supabase = createSupabase(rows);

    const { updated } = await syncPendingInsuranceAmounts(supabase, { studentId: "student-1" });

    expect(updated).toBe(0);
    expect(rows[0].amount).toBe(30);
  });
});
