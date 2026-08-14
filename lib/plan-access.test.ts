import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("react", () => ({
  cache: (fn: unknown) => fn,
}));

vi.mock("./family-effective-plan", () => ({
  resolveEffectiveAccessPlanId: vi.fn(),
}));

import { getPlanAccess } from "./plan-access";
import { KINGDOM_PLAN_FAMILIA_ID } from "./kingdom-plans-constants";
import { resolveEffectiveAccessPlanId } from "./family-effective-plan";

const mockResolveReferencePlanId = vi.mocked(resolveEffectiveAccessPlanId);

const FAMILY_PLAN_ROW = {
  id: KINGDOM_PLAN_FAMILIA_ID,
  modalityScope: "ALL",
  includesDigitalAccess: true,
  includes_performance_tracking: true,
  includes_check_in: true,
  max_check_ins_per_day: null,
  includes_exclusive_benefits: false,
};

const FIGHTER_REFERENCE_PLAN = {
  id: "plan-fighter",
  modalityScope: "SINGLE",
};

function createMockSupabase(config: {
  student: Record<string, unknown> | null;
  planById: Record<string, Record<string, unknown> | null>;
}): SupabaseClient {
  return {
    from(table: string) {
      const filters: Record<string, string> = {};
      const chain = {
        select: () => chain,
        eq(column: string, value: string) {
          filters[column] = value;
          return chain;
        },
        single: async () => {
          if (table === "Student") {
            return { data: config.student, error: null };
          }
          if (table === "Plan") {
            const planId = filters.id;
            return { data: config.planById[planId] ?? null, error: null };
          }
          return { data: null, error: null };
        },
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

describe("getPlanAccess — plano família", () => {
  beforeEach(() => {
    mockResolveReferencePlanId.mockReset();
  });

  it("sem plano de referência: mantém modalidades ALL do plano família (não bloqueia)", async () => {
    mockResolveReferencePlanId.mockResolvedValue(null);

    const access = await getPlanAccess(
      createMockSupabase({
        student: {
          planId: KINGDOM_PLAN_FAMILIA_ID,
          primaryModality: "MUAY_THAI",
          digitalLibraryAddon: false,
        },
        planById: {
          [KINGDOM_PLAN_FAMILIA_ID]: FAMILY_PLAN_ROW,
        },
      }),
      "student-family-1"
    );

    expect(access.allowedModalities).toEqual(["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"]);
    expect(access.hasCheckIn).toBe(true);
    expect(access.hasDigitalAccess).toBe(true);
    expect(access.hasPerformanceTracking).toBe(true);
    expect(access.maxCheckInsPerDay).toBe(null);
    expect(access.currentPlanId).toBe(KINGDOM_PLAN_FAMILIA_ID);
  });

  it("com plano de referência SINGLE: restringe modalidades ao plano de referência", async () => {
    mockResolveReferencePlanId.mockResolvedValue(FIGHTER_REFERENCE_PLAN.id);

    const access = await getPlanAccess(
      createMockSupabase({
        student: {
          planId: KINGDOM_PLAN_FAMILIA_ID,
          primaryModality: "MUAY_THAI",
          digitalLibraryAddon: false,
        },
        planById: {
          [KINGDOM_PLAN_FAMILIA_ID]: FAMILY_PLAN_ROW,
          [FIGHTER_REFERENCE_PLAN.id]: FIGHTER_REFERENCE_PLAN,
        },
      }),
      "student-family-2"
    );

    expect(access.allowedModalities).toEqual(["MUAY_THAI"]);
    expect(access.hasCheckIn).toBe(true);
    expect(access.hasDigitalAccess).toBe(true);
    expect(access.hasPerformanceTracking).toBe(true);
  });

  it("com plano de referência ALL: todas as modalidades", async () => {
    mockResolveReferencePlanId.mockResolvedValue("plan-full");

    const access = await getPlanAccess(
      createMockSupabase({
        student: {
          planId: KINGDOM_PLAN_FAMILIA_ID,
          primaryModality: "BOXING",
          digitalLibraryAddon: false,
        },
        planById: {
          [KINGDOM_PLAN_FAMILIA_ID]: FAMILY_PLAN_ROW,
          "plan-full": { id: "plan-full", modalityScope: "ALL" },
        },
      }),
      "student-family-3"
    );

    expect(access.allowedModalities).toEqual(["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"]);
  });
});
