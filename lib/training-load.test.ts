import { describe, expect, it } from "vitest";
import { addDays, computeTrainingLoad, lessonMinutes, zoneForRatio, type TrainingSession } from "@/lib/training-load";

const today = "2026-10-09";

/** Uma aula de 60 min com `rpe` em cada um dos dias indicados (offset a partir de hoje, negativo = passado). */
function sessions(offsets: number[], rpe: number | null = 5, minutes = 60): TrainingSession[] {
  return offsets.map((o) => ({ date: addDays(today, o), rpe, minutes }));
}

describe("lessonMinutes", () => {
  it("calcula a duração e usa 60 quando não dá", () => {
    expect(lessonMinutes("19:00", "20:30")).toBe(90);
    expect(lessonMinutes("19:00:00", "20:00:00")).toBe(60);
    expect(lessonMinutes(null, "20:00")).toBe(60);
    expect(lessonMinutes("20:00", "19:00")).toBe(60);
  });
});

describe("zoneForRatio", () => {
  it("limites 0,8 / 1,3 / 1,5", () => {
    expect(zoneForRatio(0.79)).toBe("low");
    expect(zoneForRatio(0.8)).toBe("ideal");
    expect(zoneForRatio(1.3)).toBe("ideal");
    expect(zoneForRatio(1.31)).toBe("caution");
    expect(zoneForRatio(1.5)).toBe("caution");
    expect(zoneForRatio(1.51)).toBe("high");
    expect(zoneForRatio(null)).toBe("insufficient");
  });
});

describe("computeTrainingLoad", () => {
  it("ritmo constante (2 treinos/semana) dá rácio 1 e zona ideal", () => {
    const s = sessions([-1, -4, -8, -11, -15, -18, -22, -25, -29, -32]);
    const r = computeTrainingLoad(s, today);
    expect(r.acute).toBe(600);
    expect(r.chronic).toBe(600);
    expect(r.ratio).toBe(1);
    expect(r.zone).toBe("ideal");
  });

  it("semana com o dobro dos treinos dá carga alta", () => {
    const s = [...sessions([-1, -2, -3, -4]), ...sessions([-8, -11, -15, -18, -22, -25, -29, -32])];
    const r = computeTrainingLoad(s, today);
    expect(r.ratio).toBe(2);
    expect(r.zone).toBe("high");
  });

  it("sem 2 semanas de histórico antes desta, não há rácio", () => {
    const r = computeTrainingLoad(sessions([-1, -3, -9]), today);
    expect(r.ratio).toBeNull();
    expect(r.zone).toBe("insufficient");
    expect(r.acute).toBe(600);
  });

  it("com 3 semanas de histórico, a média usa só essas semanas (não divide por 4)", () => {
    // 1.º treino há 28 dias → 3 semanas antes da actual; 1 treino por semana.
    const s = sessions([-2, -9, -16, -27]);
    const r = computeTrainingLoad(s, today);
    expect(r.chronic).toBe(300);
    expect(r.ratio).toBe(1);
  });

  it("treinos sem nota não contam para a carga mas são contados à parte", () => {
    const s = [...sessions([-1]), ...sessions([-2], null), ...sessions([-8, -15, -22, -29])];
    const r = computeTrainingLoad(s, today);
    expect(r.acute).toBe(300);
    expect(r.sessions7d).toBe(1);
    expect(r.unrated7d).toBe(1);
    expect(r.days.find((d) => d.date === addDays(today, -2))).toMatchObject({ trained: true, load: 0, rpe: null });
  });

  it("devolve 7 dias e 8 semanas, a última a acabar hoje", () => {
    const r = computeTrainingLoad(sessions([0, -7]), today);
    expect(r.days).toHaveLength(7);
    expect(r.days[6]).toMatchObject({ date: today, load: 300 });
    expect(r.weeks).toHaveLength(8);
    expect(r.weeks[7]).toEqual({ end: today, load: 300 });
    expect(r.weeks[6]).toEqual({ end: addDays(today, -7), load: 300 });
  });
});
