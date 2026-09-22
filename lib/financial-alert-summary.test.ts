import { describe, expect, it } from "vitest";
import { buildFinancialWeeklyAlertLines } from "./financial-alert-summary";

describe("buildFinancialWeeklyAlertLines", () => {
  it("formats revenue, expenses and balance in EUR (pt-PT)", () => {
    const lines = buildFinancialWeeklyAlertLines({ revenueTotal: 1234.5, expensesTotal: 800, balance: 434.5 }, 0);
    expect(lines[0]).toContain("1234,50");
    expect(lines[0]).toContain("€");
    expect(lines[1]).toContain("800,00");
    expect(lines[2]).toContain("434,50");
  });

  it("flags a negative balance with a warning marker", () => {
    const lines = buildFinancialWeeklyAlertLines({ revenueTotal: 500, expensesTotal: 900, balance: -400 }, 0);
    expect(lines[2]).toContain("⚠️");
  });

  it("does not flag a zero or positive balance", () => {
    const lines = buildFinancialWeeklyAlertLines({ revenueTotal: 900, expensesTotal: 900, balance: 0 }, 0);
    expect(lines[2]).not.toContain("⚠️");
  });

  it("flags inadimplência when there are overdue students", () => {
    const lines = buildFinancialWeeklyAlertLines({ revenueTotal: 900, expensesTotal: 100, balance: 800 }, 3);
    expect(lines[3]).toBe("Alunos inadimplentes: 3 ⚠️");
  });

  it("does not flag inadimplência when there are none", () => {
    const lines = buildFinancialWeeklyAlertLines({ revenueTotal: 900, expensesTotal: 100, balance: 800 }, 0);
    expect(lines[3]).toBe("Alunos inadimplentes: 0");
  });

  it("always returns exactly 4 lines", () => {
    const lines = buildFinancialWeeklyAlertLines({ revenueTotal: 0, expensesTotal: 0, balance: 0 }, 0);
    expect(lines).toHaveLength(4);
  });
});
