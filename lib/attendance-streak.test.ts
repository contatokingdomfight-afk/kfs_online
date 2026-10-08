import { describe, expect, it } from "vitest";
import { weekDayMarks, weeksInARow } from "@/lib/attendance-streak";

// 2026-10-08 é quinta-feira (semana de 5 a 11 de outubro).
const TODAY = "2026-10-08";

describe("weeksInARow", () => {
  it("conta semanas seguidas incluindo a actual", () => {
    expect(weeksInARow(["2026-10-06", "2026-09-30", "2026-09-22", "2026-09-15"], TODAY)).toBe(4);
  });

  it("se esta semana ainda não tem treino, começa na anterior (não quebra a meio da semana)", () => {
    expect(weeksInARow(["2026-10-02", "2026-09-24"], TODAY)).toBe(2);
  });

  it("uma semana inteira sem treino quebra a sequência", () => {
    expect(weeksInARow(["2026-10-06", "2026-09-16"], TODAY)).toBe(1);
  });

  it("várias presenças na mesma semana contam como uma semana", () => {
    expect(weeksInARow(["2026-10-05", "2026-10-06", "2026-10-07"], TODAY)).toBe(1);
  });

  it("sem presenças recentes dá 0", () => {
    expect(weeksInARow([], TODAY)).toBe(0);
    expect(weeksInARow(["2026-08-01"], TODAY)).toBe(0);
  });

  it("atravessa a mudança de ano", () => {
    expect(weeksInARow(["2027-01-05", "2026-12-30", "2026-12-22"], "2027-01-06")).toBe(3);
  });
});

describe("weekDayMarks", () => {
  it("devolve segunda a domingo com hoje, treinos e «Vou»", () => {
    const marks = weekDayMarks(TODAY, ["2026-10-05", "2026-10-07"], ["2026-10-07", "2026-10-09"], "pt");
    expect(marks.map((m) => m.ymd)).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
    expect(marks.find((m) => m.isToday)?.ymd).toBe(TODAY);
    expect(marks.filter((m) => m.trained).map((m) => m.ymd)).toEqual(["2026-10-05", "2026-10-07"]);
    // «Vou» num dia em que já treinou não conta como pendente.
    expect(marks.filter((m) => m.going).map((m) => m.ymd)).toEqual(["2026-10-09"]);
  });
});
