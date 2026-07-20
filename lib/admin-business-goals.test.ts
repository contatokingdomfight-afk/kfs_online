import { describe, expect, it } from "vitest";
import {
  deriveGoalStatusAfterProgress,
  isGoalOverdue,
  progressPercent,
  recalculateCurrentValueFromEntries,
} from "./admin-business-goals";

describe("admin-business-goals", () => {
  it("calcula percentagem de progresso", () => {
    expect(progressPercent(50, 100)).toBe(50);
    expect(progressPercent(150, 100)).toBe(100);
    expect(progressPercent(0, 0)).toBe(0);
  });

  it("detecta meta em atraso", () => {
    expect(
      isGoalOverdue({ status: "ACTIVE", targetEndDate: "2026-01-01" }, new Date("2026-07-20"))
    ).toBe(true);
    expect(
      isGoalOverdue({ status: "COMPLETED", targetEndDate: "2026-01-01" }, new Date("2026-07-20"))
    ).toBe(false);
  });

  it("recalcula valor actual a partir dos lançamentos", () => {
    expect(recalculateCurrentValueFromEntries([{ deltaValue: 10 }, { deltaValue: 5 }, { deltaValue: -2 }])).toBe(13);
    expect(recalculateCurrentValueFromEntries([{ deltaValue: -50 }])).toBe(0);
  });

  it("conclui meta automaticamente ao atingir alvo", () => {
    expect(deriveGoalStatusAfterProgress(100, 100, "ACTIVE")).toBe("COMPLETED");
    expect(deriveGoalStatusAfterProgress(50, 100, "ACTIVE")).toBe("ACTIVE");
    expect(deriveGoalStatusAfterProgress(100, 100, "CANCELLED")).toBe("CANCELLED");
  });
});
