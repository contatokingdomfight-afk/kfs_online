import { describe, expect, it } from "vitest";
import { ageOnDate, computeBodyFatPct, parseSkinfoldMm } from "./body-fat";

describe("computeBodyFatPct (Jackson-Pollock 3 pregas + Siri)", () => {
  it("homem de 30 anos, 12+20+15 mm → cerca de 14 %", () => {
    const pct = computeBodyFatPct("M", 30, { chest: 12, abdomen: 20, thigh: 15 });
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(12);
    expect(pct!).toBeLessThan(16);
  });

  it("mulher de 28 anos, 14+16+22 mm → cerca de 21 %", () => {
    const pct = computeBodyFatPct("F", 28, { triceps: 14, suprailiac: 16, thigh: 22 });
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(18);
    expect(pct!).toBeLessThan(25);
  });

  it("mais pregas → mais gordura", () => {
    const low = computeBodyFatPct("M", 30, { chest: 8, abdomen: 12, thigh: 10 })!;
    const high = computeBodyFatPct("M", 30, { chest: 20, abdomen: 35, thigh: 25 })!;
    expect(high).toBeGreaterThan(low);
  });

  it("falta uma prega ou idade fora do intervalo → null", () => {
    expect(computeBodyFatPct("M", 30, { chest: 12, abdomen: 20 })).toBeNull();
    expect(computeBodyFatPct("F", 10, { triceps: 14, suprailiac: 16, thigh: 22 })).toBeNull();
  });

  it("usa as pregas certas para cada sexo", () => {
    // Mulher sem tricipital/suprailíaca não calcula, mesmo com peitoral/abdominal.
    expect(computeBodyFatPct("F", 30, { chest: 12, abdomen: 20, thigh: 15 })).toBeNull();
  });
});

describe("parseSkinfoldMm", () => {
  it("aceita vírgula e rejeita valores fora de 1–80 mm", () => {
    expect(parseSkinfoldMm("12,5")).toBe(12.5);
    expect(parseSkinfoldMm("")).toBeNull();
    expect(parseSkinfoldMm("0")).toBeNull();
    expect(parseSkinfoldMm("150")).toBeNull();
    expect(parseSkinfoldMm("abc")).toBeNull();
  });
});

describe("ageOnDate", () => {
  it("conta anos completos", () => {
    expect(ageOnDate("1990-06-15", "2026-06-14")).toBe(35);
    expect(ageOnDate("1990-06-15", "2026-06-15")).toBe(36);
  });
});
