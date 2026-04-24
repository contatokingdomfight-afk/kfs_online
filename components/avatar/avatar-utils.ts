/**
 * Utilitários do avatar SVG (sem dependências externas).
 * Escala com expoente < 1 para realçar diferenças visuais face ao ratio bruto.
 */

import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";

export type Modality = "boxing" | "muay_thai" | "bjj";

/** Pose do corpo (independente da modalidade, que define sobretudo equipamento). */
export type PoseTag = "auto" | "star";

export const POSE_TAG_LABELS: Record<PoseTag, string> = {
  auto: "Guarda",
  star: "Estrela",
};

export type AvatarMeasurements = {
  shoulders?: number;
  /** Circunferência do tórax (cm) — refina largura de ombros/torso no SVG. */
  chest?: number;
  waist?: number;
  hips?: number;
  thigh?: number;
  calf?: number;
  arm?: number;
  /** Entrepé médio (cm) — ajusta comprimento visual da perna vs altura. */
  legInseam?: number;
  height?: number;
  weight?: number;
};

export type AvatarProps = {
  modality?: Modality;
  measurements?: AvatarMeasurements;
  className?: string;
  /** `auto` = guarda típica da modalidade; `star` = braços e pernas bem abertos. */
  poseTag?: PoseTag;
};

/** Referências antropométricas (cm) — valores médios de referência ilustrativa. */
export const REF = {
  shoulders: 112,
  chest: 96,
  waist: 82,
  hips: 98,
  thigh: 54,
  calf: 36,
  arm: 32,
  legInseam: 78,
  height: 172,
  weight: 74,
} as const;

export function scaleMeasurement(measured: number | undefined, ref: number): number {
  if (measured == null || measured <= 0 || !Number.isFinite(measured)) return 1;
  const ratio = measured / ref;
  const s = Math.pow(ratio, 0.6);
  return Math.min(Math.max(s, 0.6), 1.5);
}

/** Peso vs altura → factor subtil de “volume” de torso (ilustrativo, não clínico). */
export function bulkFactor(height?: number, weight?: number): number {
  if (height == null || weight == null || height < 130 || height > 220 || weight < 40 || weight > 160) return 1;
  const hM = height / 100;
  const bmi = weight / (hM * hM);
  const t = (bmi - 22) / 10;
  return Math.min(1.12, Math.max(0.88, 1 + t * 0.06));
}

export type BodyScaleFactors = {
  shoulder: number;
  chest: number;
  waist: number;
  hip: number;
  thigh: number;
  calf: number;
  arm: number;
  legInseam: number;
  height: number;
  bulk: number;
};

export function buildBodyScaleFactors(m?: AvatarMeasurements | null): BodyScaleFactors {
  const x = m ?? {};
  return {
    shoulder: scaleMeasurement(x.shoulders, REF.shoulders),
    chest: scaleMeasurement(x.chest, REF.chest),
    waist: scaleMeasurement(x.waist, REF.waist),
    hip: scaleMeasurement(x.hips, REF.hips),
    thigh: scaleMeasurement(x.thigh, REF.thigh),
    calf: scaleMeasurement(x.calf, REF.calf),
    arm: scaleMeasurement(x.arm, REF.arm),
    legInseam: scaleMeasurement(x.legInseam, REF.legInseam),
    height: scaleMeasurement(x.height, REF.height),
    bulk: bulkFactor(x.height, x.weight),
  };
}

function avgPair(a?: number | null, b?: number | null): number | undefined {
  const xs = [a, b].filter((n): n is number => typeof n === "number" && n > 0 && Number.isFinite(n));
  if (xs.length === 0) return undefined;
  return xs.reduce((s, n) => s + n, 0) / xs.length;
}

/** Mapeia ficha física + perfil para medidas do avatar (cm). */
export function mapFormDataToAvatarMeasurements(
  fd: Partial<PhysicalAssessmentFormData>,
  profile?: { heightCm?: number | null; weightKg?: number | null } | null
): AvatarMeasurements {
  const armCirc = avgPair(fd.circArmLeftCm, fd.circArmRightCm);
  const fore = avgPair(fd.circForearmLeftCm, fd.circForearmRightCm);
  const shouldersGuess =
    typeof fd.circNeckCm === "number" && fd.circNeckCm > 0
      ? fd.circNeckCm * 2.75
      : fore != null
        ? fore * 3.1
        : undefined;
  const fromChest =
    typeof fd.circChestCm === "number" && fd.circChestCm > 0 ? fd.circChestCm * 1.09 : undefined;
  const shouldersFromEstimates =
    fromChest != null && shouldersGuess != null
      ? Math.max(shouldersGuess, fromChest)
      : (fromChest ?? shouldersGuess);
  const measuredBreadth =
    typeof fd.breadthShoulderCm === "number" && fd.breadthShoulderCm >= 18 && fd.breadthShoulderCm <= 75
      ? fd.breadthShoulderCm
      : undefined;
  const shoulders = measuredBreadth ?? shouldersFromEstimates;

  return {
    shoulders,
    chest: fd.circChestCm ?? undefined,
    waist: fd.circAbdomenCm ?? undefined,
    hips: fd.circHipCm ?? undefined,
    thigh: avgPair(fd.circThighLeftCm, fd.circThighRightCm),
    calf: avgPair(fd.circCalfLeftCm, fd.circCalfRightCm),
    arm: armCirc,
    legInseam: avgPair(fd.lenLegInseamLeftCm, fd.lenLegInseamRightCm),
    height: profile?.heightCm != null ? Number(profile.heightCm) : undefined,
    weight: profile?.weightKg != null ? Number(profile.weightKg) : undefined,
  };
}
