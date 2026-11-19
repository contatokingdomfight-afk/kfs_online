/**
 * Medidas da ficha física → fatores de escala por zona do corpo (mapa corporal «Silhueta» e «Visão muscular»).
 * Medidas em falta ficam com fator 1 (corpo de referência). Limites de ±30 % para o desenho nunca ficar grotesco.
 */
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";

export type BodySex = "m" | "f";

export type BodyMeasures = {
  chest?: number;
  waist?: number;
  hip?: number;
  arm?: number;
  fore?: number;
  thigh?: number;
  calf?: number;
};

export type BodyFactors = {
  sh: number;
  chest: number;
  waist: number;
  hip: number;
  arm: number;
  fore: number;
  thigh: number;
  calf: number;
};

const REF: Record<BodySex, Required<BodyMeasures>> = {
  m: { chest: 98, waist: 82, hip: 96, arm: 34, fore: 28, thigh: 56, calf: 37 },
  f: { chest: 90, waist: 70, hip: 98, arm: 28, fore: 24, thigh: 56, calf: 36 },
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function pos(n: unknown): number | undefined {
  return typeof n === "number" && Number.isFinite(n) && n >= 8 ? n : undefined;
}

function avg(a: number | undefined, b: number | undefined): number | undefined {
  if (a != null && b != null) return (a + b) / 2;
  return a ?? b;
}

export function bodyMeasuresFromForm(d: Partial<PhysicalAssessmentFormData>): { sex: BodySex; measures: BodyMeasures } {
  const sex: BodySex = d.referenceSex === "F" ? "f" : "m";
  const measures: BodyMeasures = {
    chest: pos(d.circChestCm),
    waist: pos(d.circAbdomenCm),
    hip: pos(d.circHipCm),
    arm: avg(pos(d.circBicepsLeftCm), pos(d.circBicepsRightCm)) ?? avg(pos(d.circArmLeftCm), pos(d.circArmRightCm)),
    fore: avg(pos(d.circForearmLeftCm), pos(d.circForearmRightCm)),
    thigh: avg(pos(d.circThighLeftCm), pos(d.circThighRightCm)),
    calf: avg(pos(d.circCalfLeftCm), pos(d.circCalfRightCm)),
  };
  return { sex, measures };
}

export function bodyFactors(m: BodyMeasures, sex: BodySex): BodyFactors {
  const R = REF[sex];
  const r = (k: keyof BodyMeasures) => {
    const v = m[k];
    return v == null ? 1 : clamp(v / R[k], 0.7, 1.3);
  };
  return {
    sh: 1 + (r("chest") - 1) * 0.6,
    chest: r("chest"),
    waist: r("waist"),
    hip: r("hip"),
    arm: r("arm"),
    fore: r("fore"),
    thigh: r("thigh"),
    calf: r("calf"),
  };
}

/** % de gordura → «definição» muscular (1 = músculos bem marcados). Sem dado: valor intermédio. */
export function bodyDefinition(fatPct: number | null | undefined, sex: BodySex): number {
  if (typeof fatPct !== "number" || !Number.isFinite(fatPct)) return 0.7;
  return clamp(1 - (fatPct - (sex === "f" ? 18 : 10)) / 20, 0.12, 1);
}

export const clampNum = clamp;
