import { describe, expect, it } from "vitest";
import { computeWellnessZone, parseWellnessFromFormData, quickAnswersToWellness } from "./wellness-score";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("computeWellnessZone", () => {
  it("returns GREEN for good recovery inputs", () => {
    expect(
      computeWellnessZone({
        sleepHours: 8,
        sleepQuality: 5,
        hydrationOk: true,
        stress: 1,
        fatigue: 1,
      })
    ).toBe("GREEN");
  });

  it("returns RED for severe lack of sleep and high fatigue", () => {
    expect(
      computeWellnessZone({
        sleepHours: 4,
        sleepQuality: 2,
        hydrationOk: false,
        stress: 5,
        fatigue: 5,
      })
    ).toBe("RED");
  });

  it("campos não perguntados (null) não somam risco", () => {
    expect(computeWellnessZone({ sleepHours: 7.5, sleepQuality: null, hydrationOk: null, stress: 3, fatigue: 3 })).toBe("GREEN");
  });
});

describe("questionário rápido", () => {
  it("bem dormido e fresco → verde", () => {
    const w = quickAnswersToWellness({ sleep: "7-8", body: "fresh", mind: "calm" })!;
    expect(w).toMatchObject({ sleepHours: 7.5, fatigue: 2, stress: 2, sleepQuality: null, hydrationOk: null });
    expect(computeWellnessZone(w)).toBe("GREEN");
  });

  it("pouco sono → amarelo; pouco sono + cansado → vermelho", () => {
    expect(computeWellnessZone(quickAnswersToWellness({ sleep: "lt5", body: "normal", mind: "normal" })!)).toBe("YELLOW");
    expect(computeWellnessZone(quickAnswersToWellness({ sleep: "lt5", body: "tired", mind: "normal" })!)).toBe("RED");
  });

  it("cansado e stressado, mesmo com bom sono → amarelo", () => {
    expect(computeWellnessZone(quickAnswersToWellness({ sleep: "8p", body: "tired", mind: "stressed" })!)).toBe("YELLOW");
  });

  it("formulário: sem respostas = saltar; a meio = erro; completo = registo", () => {
    expect(parseWellnessFromFormData(form({}))).toEqual({ ok: true, wellness: "skip" });
    expect(parseWellnessFromFormData(form({ wSleep: "7-8", skipWellness: "1" }))).toEqual({ ok: true, wellness: "skip" });
    expect(parseWellnessFromFormData(form({ wSleep: "7-8" })).ok).toBe(false);
    const full = parseWellnessFromFormData(form({ wSleep: "6-7", wBody: "normal", wMind: "calm" }));
    expect(full).toMatchObject({ ok: true, wellness: { sleepHours: 6.5, fatigue: 3, stress: 2 } });
  });
});
