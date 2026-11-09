import { describe, expect, it } from "vitest";
import { exemptMonthCount, firstChargedMonthAfter, isPauseActiveOn, pauseExemptsMonth } from "@/lib/tuition-pause";

describe("pausa de mensalidade", () => {
  it("mês de início: até ao dia de pagamento não cobra, depois cobra", () => {
    expect(pauseExemptsMonth({ startDate: "2026-11-03", endDate: null }, "2026-11", 5)).toBe(true);
    expect(pauseExemptsMonth({ startDate: "2026-11-05", endDate: null }, "2026-11", 5)).toBe(true);
    expect(pauseExemptsMonth({ startDate: "2026-11-12", endDate: null }, "2026-11", 5)).toBe(false);
    expect(pauseExemptsMonth({ startDate: "2026-11-12", endDate: null }, "2026-12", 5)).toBe(true);
    expect(pauseExemptsMonth({ startDate: "2026-11-12", endDate: null }, "2026-10", 5)).toBe(false);
  });
  it("mês de regresso: até dia 15 cobra, depois só o seguinte", () => {
    const p = { startDate: "2026-11-03", endDate: "2027-01-15" };
    expect(pauseExemptsMonth(p, "2026-12", 5)).toBe(true);
    expect(pauseExemptsMonth(p, "2027-01", 5)).toBe(false);
    const q = { startDate: "2026-11-03", endDate: "2027-01-20" };
    expect(pauseExemptsMonth(q, "2027-01", 5)).toBe(true);
    expect(pauseExemptsMonth(q, "2027-02", 5)).toBe(false);
  });
  it("conta meses não cobrados e primeiro mês cobrado", () => {
    expect(exemptMonthCount({ startDate: "2026-11-03", endDate: "2027-01-20" }, 5)).toBe(3);
    expect(firstChargedMonthAfter({ startDate: "2026-11-03", endDate: "2027-01-20" }, 5)).toBe("2027-02");
    expect(firstChargedMonthAfter({ startDate: "2026-11-03", endDate: "2027-01-10" }, 5)).toBe("2027-01");
  });
  it("em curso entre início e regresso", () => {
    expect(isPauseActiveOn({ startDate: "2026-11-03", endDate: null }, "2026-11-09")).toBe(true);
    expect(isPauseActiveOn({ startDate: "2026-11-03", endDate: "2026-11-09" }, "2026-11-09")).toBe(false);
    expect(isPauseActiveOn({ startDate: "2026-11-20", endDate: null }, "2026-11-09")).toBe(false);
  });
});
