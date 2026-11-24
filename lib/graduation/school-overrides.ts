/**
 * Ajustes de uma escola aos requisitos de cada grau (configuração híbrida, decisão 2026-11-24):
 * tempo e presenças mínimas até ±25 % do valor da rede; nota mínima só para cima.
 * Graus, ordem, cores e XP ficam sempre os da rede. Módulo puro (sem Supabase) para testar.
 */

export const SCHOOL_OVERRIDE_PCT = 0.25;

export type SchoolGradeOverride = {
  gradeId: string;
  minMonths: number | null;
  minAttendances: number | null;
  minPerformanceAvg: number | null;
};

type GradeRequirements = {
  id: string;
  minMonths: number;
  minAttendances: number | null;
  minPerformanceAvg: number | null;
};

export type OverrideLimits = {
  minMonths: { min: number; max: number };
  /** null = a rede não exige presenças neste grau → a escola também não ajusta. */
  minAttendances: { min: number; max: number } | null;
  /** Mínimo = valor da rede (ou 1 se a rede não exige); máximo 5. */
  minPerformanceAvg: { min: number; max: number };
};

export function schoolOverrideLimits(grade: Pick<GradeRequirements, "minMonths" | "minAttendances" | "minPerformanceAvg">): OverrideLimits {
  const range = (v: number) => ({ min: Math.max(0, Math.ceil(v * (1 - SCHOOL_OVERRIDE_PCT))), max: Math.floor(v * (1 + SCHOOL_OVERRIDE_PCT)) });
  return {
    minMonths: range(grade.minMonths),
    minAttendances: grade.minAttendances == null ? null : range(grade.minAttendances),
    minPerformanceAvg: { min: grade.minPerformanceAvg ?? 1, max: 5 },
  };
}

/** Erro (pt) se o ajuste sai dos limites; null se está tudo bem. Valores null = repor o da rede. */
export function validateSchoolGradeOverride(
  grade: GradeRequirements & { name: string },
  o: Omit<SchoolGradeOverride, "gradeId">
): string | null {
  const lim = schoolOverrideLimits(grade);
  const isInt = (v: number) => Number.isInteger(v);
  if (o.minMonths != null && (!isInt(o.minMonths) || o.minMonths < lim.minMonths.min || o.minMonths > lim.minMonths.max)) {
    return `${grade.name}: o tempo tem de ficar entre ${lim.minMonths.min} e ${lim.minMonths.max} meses (rede: ${grade.minMonths}).`;
  }
  if (o.minAttendances != null) {
    if (!lim.minAttendances) return `${grade.name}: a rede não exige presenças neste grau.`;
    if (!isInt(o.minAttendances) || o.minAttendances < lim.minAttendances.min || o.minAttendances > lim.minAttendances.max) {
      return `${grade.name}: as presenças têm de ficar entre ${lim.minAttendances.min} e ${lim.minAttendances.max} (rede: ${grade.minAttendances}).`;
    }
  }
  if (o.minPerformanceAvg != null) {
    const v = o.minPerformanceAvg;
    if (!Number.isFinite(v) || v < lim.minPerformanceAvg.min || v > lim.minPerformanceAvg.max || Math.round(v * 100) !== v * 100) {
      return `${grade.name}: a nota mínima só pode subir (entre ${lim.minPerformanceAvg.min} e 5).`;
    }
  }
  return null;
}

/** Aplica os ajustes da escola aos graus (os valores fora dos limites são ignorados — fica o da rede). */
export function applySchoolGradeOverrides<G extends GradeRequirements & { name: string }>(grades: G[], overrides: SchoolGradeOverride[]): G[] {
  if (overrides.length === 0) return grades;
  const byGrade = new Map(overrides.map((o) => [o.gradeId, o]));
  return grades.map((g) => {
    const o = byGrade.get(g.id);
    if (!o) return g;
    const lim = schoolOverrideLimits(g);
    const inRange = (v: number | null, r: { min: number; max: number } | null) => v != null && r != null && v >= r.min && v <= r.max;
    return {
      ...g,
      minMonths: inRange(o.minMonths, lim.minMonths) ? (o.minMonths as number) : g.minMonths,
      minAttendances: inRange(o.minAttendances, lim.minAttendances) ? o.minAttendances : g.minAttendances,
      minPerformanceAvg: inRange(o.minPerformanceAvg, lim.minPerformanceAvg) ? o.minPerformanceAvg : g.minPerformanceAvg,
    };
  });
}
