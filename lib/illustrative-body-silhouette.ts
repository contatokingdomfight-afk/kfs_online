/**
 * Geometria para silhueta corporal ilustrativa a partir de antropometria opcional da ficha física.
 * Proporções são heurísticas (não anatómicas nem clínicas); só para evolução visual aproximada.
 */
import type { PhysicalAssessmentFormData } from "./physical-assessment-types";

/** Altura e peso do perfil do aluno (ex. `StudentProfile`) para escala ilustrativa da silhueta. */
export type ProfileBodyMetrics = { heightCm: number | null; weightKg: number | null };

const REF = {
  head: 56,
  neck: 37,
  arm: 32,
  shoulderBreadth: 41,
  abdomen: 84,
  hip: 98,
  thigh: 56,
  calf: 37,
  footLength: 26,
} as const;

function scale(measured: number | null | undefined, ref: number): number {
  if (measured == null || measured < 8) return 1;
  const r = Math.sqrt(measured / ref);
  return Math.min(1.32, Math.max(0.74, r));
}

function avg(a: number, b: number): number {
  return (a + b) / 2;
}

/**
 * O campo `formData` na BD pode chegar já como objeto ou como string JSON (consoante o cliente).
 * Sem isto, `typeof raw === "string"` falha checagens e a silhueta não aparece.
 */
export function normalizePhysicalFormDataJson(
  raw: unknown
): Partial<PhysicalAssessmentFormData> | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Partial<PhysicalAssessmentFormData>;
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    try {
      const p = JSON.parse(s) as unknown;
      if (typeof p === "object" && p !== null && !Array.isArray(p)) {
        return p as Partial<PhysicalAssessmentFormData>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/** Combina parse JSON + regra de contagem mínima de medidas (para dados vindos da BD). */
export function storedFormDataHasSilhouette(formData: unknown): boolean {
  const p = normalizePhysicalFormDataJson(formData);
  return p != null && hasIllustrativeAnthropometry(p);
}

/** Pelo menos duas medidas para evitar silhueta a partir de um único valor isolado. */
export function hasIllustrativeAnthropometry(d: Partial<PhysicalAssessmentFormData>): boolean {
  const vals = [
    d.circHeadCm,
    d.circNeckCm,
    d.lenArmShoulderFingertipLeftCm,
    d.lenArmShoulderFingertipRightCm,
    d.circArmLeftCm,
    d.circArmRightCm,
    d.circBicepsLeftCm,
    d.circBicepsRightCm,
    d.circForearmLeftCm,
    d.circForearmRightCm,
    d.circAbdomenCm,
    d.circChestCm,
    d.circHipCm,
    d.circThighLeftCm,
    d.circThighRightCm,
    d.circCalfLeftCm,
    d.circCalfRightCm,
    d.footLengthCm,
    d.lenLegInseamLeftCm,
    d.lenLegInseamRightCm,
    d.breadthShoulderCm,
  ];
  const n = vals.filter((v) => typeof v === "number" && v > 0).length;
  return n >= 2;
}

export type SilhouetteParts = {
  head: { cx: number; cy: number; rx: number; ry: number };
  neck: { x: number; y: number; w: number; h: number };
  torsoPoints: string;
  armL: { x: number; y: number; w: number; h: number };
  armR: { x: number; y: number; w: number; h: number };
  thighL: { x: number; y: number; w: number; h: number };
  thighR: { x: number; y: number; w: number; h: number };
  calfL: { x: number; y: number; w: number; h: number };
  calfR: { x: number; y: number; w: number; h: number };
  footL: { x: number; y: number; w: number; h: number };
  footR: { x: number; y: number; w: number; h: number };
};

const CX = 50;

/** Altura de referência (cm) para escalar a silhueta quando só há altura/peso do perfil. */
const REF_HEIGHT_CM = 172;

/**
 * Factor multiplicativo (≈0,86–1,14) para a silhueta com base em altura e, secundariamente, peso do perfil.
 * Não substitui medidas antropométricas na ficha.
 */
export function computeGlobalBodyScale(
  heightCm?: number | null,
  weightKg?: number | null
): number {
  const h = typeof heightCm === "number" && heightCm >= 130 && heightCm <= 220 ? heightCm : null;
  const w = typeof weightKg === "number" && weightKg >= 35 && weightKg <= 200 ? weightKg : null;

  if (h != null) {
    const fromHeight = h / REF_HEIGHT_CM;
    let s = Math.min(1.14, Math.max(0.86, fromHeight));
    if (w != null && h > 0) {
      const bmi = w / ((h / 100) * (h / 100));
      const bmiAdj = 1 + Math.min(0.06, Math.max(-0.06, (bmi - 22) * 0.012));
      s = Math.min(1.14, Math.max(0.86, s * bmiAdj));
    }
    return s;
  }

  if (w != null) {
    const fromWeight = Math.sqrt(w / 72);
    return Math.min(1.1, Math.max(0.9, fromWeight));
  }

  return 1;
}

export function buildSilhouetteParts(fd: Partial<PhysicalAssessmentFormData>): SilhouetteParts {
  const rHead = scale(fd.circHeadCm, REF.head);
  const rNeck = scale(fd.circNeckCm, REF.neck);
  const rArmL = scale(fd.circArmLeftCm, REF.arm);
  const rArmR = scale(fd.circArmRightCm, REF.arm);
  const rShoulderBreadth = scale(fd.breadthShoulderCm, REF.shoulderBreadth);
  const rAbd = scale(fd.circAbdomenCm, REF.abdomen);
  const rHip = scale(fd.circHipCm, REF.hip);
  const rThL = scale(fd.circThighLeftCm, REF.thigh);
  const rThR = scale(fd.circThighRightCm, REF.thigh);
  const rCaL = scale(fd.circCalfLeftCm, REF.calf);
  const rCaR = scale(fd.circCalfRightCm, REF.calf);
  const rFoot = scale(fd.footLengthCm, REF.footLength);

  const headRx = 11 * rHead;
  const headRy = 13.5 * rHead;
  const neckW = 6.5 * rNeck;
  const neckH = 11;

  const yTop = 38;
  const yMid = 70;
  const yWaist = 94;
  const yHip = 116;
  const wTopFromArms = 16 * avg(rArmL, rArmR);
  const wTopFromBreadth = 10.2 * rShoulderBreadth;
  const wTop =
    typeof fd.breadthShoulderCm === "number" && fd.breadthShoulderCm >= 18
      ? avg(wTopFromArms, wTopFromBreadth)
      : wTopFromArms;
  const wWaist = 9.5 * rAbd;
  const wMid = avg(wTop, wWaist);
  const wHip = 14.5 * rHip;

  const torsoPoints = [
    `${CX - wTop},${yTop}`,
    `${CX + wTop},${yTop}`,
    `${CX + wMid},${yMid}`,
    `${CX + wWaist},${yWaist}`,
    `${CX + wHip},${yHip}`,
    `${CX - wHip},${yHip}`,
    `${CX - wWaist},${yWaist}`,
    `${CX - wMid},${yMid}`,
  ].join(" ");

  const armW = 6.2;
  const wArmL = armW * rArmL;
  const wArmR = armW * rArmR;
  const armY = 44;
  const armH = 66;
  const armLx = CX - wTop - wArmL - 1.2;
  const armRx = CX + wTop + 1.2;

  const crotchGap = 5;
  const yThigh0 = yHip;
  const thighH = 42;
  const wThL = Math.max(5.2, 5.8 * rThL);
  const wThR = Math.max(5.2, 5.8 * rThR);
  const thighLx = CX - crotchGap / 2 - wThL;
  const thighRx = CX + crotchGap / 2;

  const yCalf0 = yThigh0 + thighH;
  const calfH = 40;
  const wCaL = Math.max(4.2, 5 * rCaL);
  const wCaR = Math.max(4.2, 5 * rCaR);
  const calfLx = CX - crotchGap / 2 - wCaL;
  const calfRx = CX + crotchGap / 2;

  const yFoot0 = yCalf0 + calfH;
  const footH = 15;
  const footW = Math.max(6.5, 9 * rFoot);
  const footLx = CX - crotchGap / 2 - footW;
  const footRx = CX + crotchGap / 2;

  return {
    head: { cx: CX, cy: 17, rx: headRx, ry: headRy },
    neck: { x: CX - neckW / 2, y: 28, w: neckW, h: neckH },
    torsoPoints,
    armL: { x: armLx, y: armY, w: wArmL, h: armH },
    armR: { x: armRx, y: armY, w: wArmR, h: armH },
    thighL: { x: thighLx, y: yThigh0, w: wThL, h: thighH },
    thighR: { x: thighRx, y: yThigh0, w: wThR, h: thighH },
    calfL: { x: calfLx, y: yCalf0, w: wCaL, h: calfH },
    calfR: { x: calfRx, y: yCalf0, w: wCaR, h: calfH },
    footL: { x: footLx, y: yFoot0, w: footW, h: footH },
    footR: { x: footRx, y: yFoot0, w: footW, h: footH },
  };
}
