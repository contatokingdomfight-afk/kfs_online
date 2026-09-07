import { describe, expect, it } from "vitest";
import { getDashboardLessonWeekRangeLisbon } from "./lesson-utils";

// Janeiro está em WET (UTC+0) em Lisboa, então UTC == hora de Lisboa nestes testes.
describe("getDashboardLessonWeekRangeLisbon", () => {
  it("numa quarta-feira, devolve hoje até ao sábado desta semana", () => {
    const result = getDashboardLessonWeekRangeLisbon(new Date("2024-01-03T10:00:00Z"));
    expect(result).toEqual({ start: "2024-01-03", end: "2024-01-06", usingNextWeek: false });
  });

  it("no sábado antes do meio-dia, ainda mostra a semana atual (só hoje)", () => {
    const result = getDashboardLessonWeekRangeLisbon(new Date("2024-01-06T11:59:00Z"));
    expect(result).toEqual({ start: "2024-01-06", end: "2024-01-06", usingNextWeek: false });
  });

  it("no sábado exatamente às 12h, já passa a mostrar a semana seguinte inteira", () => {
    const result = getDashboardLessonWeekRangeLisbon(new Date("2024-01-06T12:00:00Z"));
    expect(result).toEqual({ start: "2024-01-08", end: "2024-01-13", usingNextWeek: true });
  });

  it("no sábado à tarde, mostra a semana seguinte inteira", () => {
    const result = getDashboardLessonWeekRangeLisbon(new Date("2024-01-06T18:00:00Z"));
    expect(result).toEqual({ start: "2024-01-08", end: "2024-01-13", usingNextWeek: true });
  });

  it("no domingo, não ativa o corte de sábado (só olha para hoje)", () => {
    const result = getDashboardLessonWeekRangeLisbon(new Date("2024-01-07T10:00:00Z"));
    expect(result).toEqual({ start: "2024-01-07", end: "2024-01-07", usingNextWeek: false });
  });
});
