import { describe, expect, it } from "vitest";
import { applySchoolGradeOverrides, schoolOverrideLimits, validateSchoolGradeOverride } from "./school-overrides";

const grade = { id: "g1", name: "Prajied Azul", minMonths: 4, minAttendances: 40, minPerformanceAvg: 2.5 };

describe("schoolOverrideLimits", () => {
  it("±25 % no tempo e presenças; nota só sobe", () => {
    expect(schoolOverrideLimits(grade)).toEqual({
      minMonths: { min: 3, max: 5 },
      minAttendances: { min: 30, max: 50 },
      minPerformanceAvg: { min: 2.5, max: 5 },
    });
  });
  it("sem presenças na rede → sem ajuste de presenças", () => {
    expect(schoolOverrideLimits({ ...grade, minAttendances: null }).minAttendances).toBeNull();
  });
});

describe("validateSchoolGradeOverride", () => {
  const none = { minMonths: null, minAttendances: null, minPerformanceAvg: null };
  it("aceita dentro dos limites", () => {
    expect(validateSchoolGradeOverride(grade, { minMonths: 3, minAttendances: 50, minPerformanceAvg: 3 })).toBeNull();
  });
  it("recusa fora dos ±25 %", () => {
    expect(validateSchoolGradeOverride(grade, { ...none, minMonths: 2 })).toMatch(/entre 3 e 5/);
    expect(validateSchoolGradeOverride(grade, { ...none, minAttendances: 51 })).toMatch(/entre 30 e 50/);
  });
  it("recusa baixar a nota mínima", () => {
    expect(validateSchoolGradeOverride(grade, { ...none, minPerformanceAvg: 2 })).toMatch(/só pode subir/);
  });
  it("recusa presenças quando a rede não exige", () => {
    expect(validateSchoolGradeOverride({ ...grade, minAttendances: null }, { ...none, minAttendances: 10 })).toMatch(/não exige/);
  });
});

describe("applySchoolGradeOverrides", () => {
  it("aplica os ajustes válidos e ignora os inválidos", () => {
    const [g] = applySchoolGradeOverrides([grade], [{ gradeId: "g1", minMonths: 5, minAttendances: 99, minPerformanceAvg: 3 }]);
    expect(g.minMonths).toBe(5);
    expect(g.minAttendances).toBe(40);
    expect(g.minPerformanceAvg).toBe(3);
  });
  it("sem ajustes devolve os graus da rede", () => {
    const grades = [grade];
    expect(applySchoolGradeOverrides(grades, [])).toBe(grades);
  });
});
