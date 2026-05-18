/**
 * Tabelas de referência (raparigas / rapazes) alinhadas ao documento fornecido
 * (abdominais, flexões, IMC zona saudável por idade). As notas 1–10 são uma
 * conversão pedagógica interna — não substituem critério clínico nem o juízo do instrutor.
 *
 * Testes não recolhidos na ficha digital (VAIVÉM, milha, 4×10 m, 20/40 m, impulsões,
 * senta-e-alcança em cm, etc.) não entram no cálculo automático.
 */
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";

export type ReferenceSex = "F" | "M";

type AbdFlexBand = { age: number; abdHealthy: number; abdAthletic: number; flexHealthy: number; flexAthletic: number };

/** Raparigas — abdominais / flexões (repetições / 1 min, zona saudável ≥ / perfil atlético ≥). */
const GIRLS_ABDOM_FLEX: AbdFlexBand[] = [
  { age: 9, abdHealthy: 9, abdAthletic: 39, flexHealthy: 6, flexAthletic: 14 },
  { age: 10, abdHealthy: 12, abdAthletic: 39, flexHealthy: 7, flexAthletic: 15 },
  { age: 11, abdHealthy: 15, abdAthletic: 46, flexHealthy: 7, flexAthletic: 15 },
  { age: 12, abdHealthy: 18, abdAthletic: 53, flexHealthy: 7, flexAthletic: 15 },
  { age: 13, abdHealthy: 18, abdAthletic: 57, flexHealthy: 7, flexAthletic: 16 },
  { age: 14, abdHealthy: 18, abdAthletic: 59, flexHealthy: 7, flexAthletic: 16 },
  { age: 15, abdHealthy: 18, abdAthletic: 62, flexHealthy: 7, flexAthletic: 17 },
  { age: 16, abdHealthy: 18, abdAthletic: 63, flexHealthy: 7, flexAthletic: 18 },
  { age: 17, abdHealthy: 18, abdAthletic: 65, flexHealthy: 7, flexAthletic: 19 },
  { age: 18, abdHealthy: 18, abdAthletic: 66, flexHealthy: 7, flexAthletic: 19 },
];

/** Rapazes — abdominais / flexões. */
const BOYS_ABDOM_FLEX: AbdFlexBand[] = [
  { age: 9, abdHealthy: 9, abdAthletic: 47, flexHealthy: 6, flexAthletic: 17 },
  { age: 10, abdHealthy: 12, abdAthletic: 47, flexHealthy: 7, flexAthletic: 21 },
  { age: 11, abdHealthy: 15, abdAthletic: 54, flexHealthy: 8, flexAthletic: 21 },
  { age: 12, abdHealthy: 18, abdAthletic: 60, flexHealthy: 10, flexAthletic: 21 },
  { age: 13, abdHealthy: 21, abdAthletic: 66, flexHealthy: 12, flexAthletic: 22 },
  { age: 14, abdHealthy: 24, abdAthletic: 71, flexHealthy: 14, flexAthletic: 24 },
  { age: 15, abdHealthy: 24, abdAthletic: 71, flexHealthy: 16, flexAthletic: 27 },
  { age: 16, abdHealthy: 24, abdAthletic: 71, flexHealthy: 18, flexAthletic: 29 },
  { age: 17, abdHealthy: 24, abdAthletic: 71, flexHealthy: 18, flexAthletic: 32 },
  { age: 18, abdHealthy: 24, abdAthletic: 71, flexHealthy: 18, flexAthletic: 34 },
];

type BmiBand = { age: number; min: number; max: number };

/** IMC (kg/m²) zona saudável — raparigas. */
const GIRLS_BMI_HEALTHY: BmiBand[] = [
  { age: 9, min: 13.3, max: 18.7 },
  { age: 10, min: 13.7, max: 19.4 },
  { age: 11, min: 14.1, max: 20.3 },
  { age: 12, min: 14.7, max: 21.3 },
  { age: 13, min: 15.2, max: 22.3 },
  { age: 14, min: 15.7, max: 23.1 },
  { age: 15, min: 16.0, max: 23.8 },
  { age: 16, min: 16.3, max: 24.3 },
  { age: 17, min: 16.4, max: 24.6 },
  { age: 18, min: 18.5, max: 25.0 },
];

/** IMC zona saudável — rapazes. */
const BOYS_BMI_HEALTHY: BmiBand[] = [
  { age: 9, min: 13.6, max: 18.2 },
  { age: 10, min: 13.9, max: 18.8 },
  { age: 11, min: 14.2, max: 19.5 },
  { age: 12, min: 14.7, max: 20.4 },
  { age: 13, min: 15.2, max: 21.3 },
  { age: 14, min: 15.7, max: 22.2 },
  { age: 15, min: 16.3, max: 23.1 },
  { age: 16, min: 16.7, max: 23.9 },
  { age: 17, min: 17.1, max: 24.6 },
  { age: 18, min: 18.5, max: 25.0 },
];

/** Metros percorridos em 1 min — limiares aproximados para resistência aeróbia leve (não constam nas tabelas VAIVÉM/milha). */
const RUN_M_PER_MIN_SOFT: Record<ReferenceSex, Record<number, { fair: number; good: number }>> = {
  F: {
    9: { fair: 140, good: 200 },
    10: { fair: 145, good: 210 },
    11: { fair: 150, good: 220 },
    12: { fair: 155, good: 230 },
    13: { fair: 160, good: 240 },
    14: { fair: 165, good: 250 },
    15: { fair: 170, good: 255 },
    16: { fair: 172, good: 260 },
    17: { fair: 175, good: 265 },
    18: { fair: 178, good: 270 },
  },
  M: {
    9: { fair: 150, good: 215 },
    10: { fair: 155, good: 225 },
    11: { fair: 160, good: 235 },
    12: { fair: 165, good: 245 },
    13: { fair: 170, good: 255 },
    14: { fair: 175, good: 265 },
    15: { fair: 178, good: 272 },
    16: { fair: 180, good: 278 },
    17: { fair: 182, good: 282 },
    18: { fair: 185, good: 288 },
  },
};

export function ageYearsAtAssessment(dateOfBirthIso: string | null | undefined, assessedAtIso: string): number | null {
  if (!dateOfBirthIso?.trim()) return null;
  const dob = dateOfBirthIso.trim().slice(0, 10);
  const ref = assessedAtIso.trim().slice(0, 10);
  const [y1, m1, d1] = dob.split("-").map(Number);
  const [y2, m2, d2] = ref.split("-").map(Number);
  if (![y1, m1, d1, y2, m2, d2].every((n) => Number.isFinite(n))) return null;
  let age = y2 - y1;
  if (m2 < m1 || (m2 === m1 && d2 < d1)) age -= 1;
  return age;
}

function clampTableAge(ageYears: number): number {
  if (ageYears < 9) return 9;
  if (ageYears > 18) return 18;
  return Math.floor(ageYears);
}

function bandForAge<T extends { age: number }>(rows: T[], ageYears: number): T {
  const a = clampTableAge(ageYears);
  return rows.find((r) => r.age === a) ?? rows[rows.length - 1];
}

/** Converte repetições vs limiares «saudável» e «atlético» para 1–10 (monótono). */
function repsToScore10(reps: number, healthy: number, athletic: number): number {
  if (reps <= 0) return 2;
  if (reps < healthy * 0.5) return 3;
  if (reps < healthy) return 5;
  if (reps < athletic) return 7;
  const span = Math.max(1, athletic - healthy);
  const bonus = Math.min(3, ((reps - athletic) / span) * 3);
  return Math.round(Math.min(10, Math.max(7, 7 + bonus)));
}

function bmiToScore10(bmi: number, band: BmiBand): number {
  const { min, max } = band;
  if (bmi >= min && bmi <= max) return 8;
  const lowGap = min - bmi;
  const highGap = bmi - max;
  const gap = Math.max(lowGap, highGap, 0);
  if (gap <= 0.5) return 7;
  if (gap <= 1.5) return 6;
  if (gap <= 3) return 5;
  return 4;
}

function runMetersPerMinToScore10(mPerMin: number, sex: ReferenceSex, ageYears: number): number {
  const a = clampTableAge(ageYears);
  const row = RUN_M_PER_MIN_SOFT[sex][a] ?? RUN_M_PER_MIN_SOFT[sex][18];
  if (mPerMin < row.fair * 0.75) return 3;
  if (mPerMin < row.fair) return 5;
  if (mPerMin < row.good) return 7;
  return Math.min(10, 7 + Math.round(((mPerMin - row.good) / Math.max(40, row.good)) * 3));
}

function mobilityPostureScore10(d: Partial<PhysicalAssessmentFormData>): number | null {
  const mob = d.mobilityLimitations ?? [];
  const post = d.posturalAssessment ?? [];
  if (mob.length === 0 && post.length === 0) return null;
  let base = 6;
  if (mob.includes("BOA_GERAL") && mob.filter((x) => x !== "BOA_GERAL").length === 0) base += 2;
  else if (mob.length > 0) base -= 1;
  if (post.includes("NORMAL") && post.length === 1) base += 2;
  else if (post.some((p) => p !== "NORMAL")) base -= 1;
  return Math.min(10, Math.max(4, base));
}

export type ReferenceScoreBreakdown = {
  scoreCondition: number | null;
  scoreMobility: number | null;
  scoreCoordination: number | null;
  scoreEndurance: number | null;
  scoreStrength: number | null;
  /** Aproximação a partir da distância 1 min; tabelas oficiais usam 20/40 m. */
  scoreSpeed: number | null;
  linesPt: string[];
  linesEn: string[];
};

/**
 * Calcula sugestões 1–10 a partir da ficha + idade à data + sexo para normas.
 * `heightCm` / `weightKg` devem ser os da própria avaliação quando existirem; senão perfil.
 */
export function computePhysicalAssessmentReferenceScores(
  d: Partial<PhysicalAssessmentFormData>,
  opts: { ageYears: number | null; sex: ReferenceSex | null; heightCm: number | null; weightKg: number | null }
): ReferenceScoreBreakdown {
  const linesPt: string[] = [];
  const linesEn: string[] = [];
  const push = (pt: string, en: string) => {
    linesPt.push(pt);
    linesEn.push(en);
  };

  const { ageYears, sex } = opts;
  const h = d.heightCm ?? opts.heightCm;
  const w = d.weightKg ?? opts.weightKg;

  if (ageYears == null || ageYears < 9) {
    push(
      "Idade à data da avaliação fora do intervalo mínimo (9+ anos) das tabelas usadas aqui — as sugestões automáticas não se aplicam.",
      "Age at assessment is below the minimum (9+ years) for these tables — automatic suggestions do not apply."
    );
    return emptyBreakdown(linesPt, linesEn);
  }
  if (!sex) {
    push("Indica o sexo para normas (raparigas / rapazes) na secção da avaliação do instrutor.", "Select sex for reference norms (girls / boys) in the instructor assessment section.");
    return emptyBreakdown(linesPt, linesEn);
  }

  const abdFlexRows = sex === "F" ? GIRLS_ABDOM_FLEX : BOYS_ABDOM_FLEX;
  const bmiRows = sex === "F" ? GIRLS_BMI_HEALTHY : BOYS_BMI_HEALTHY;
  const band = bandForAge(abdFlexRows, ageYears);
  const bmiBand = bandForAge(bmiRows, ageYears);

  let scoreStrength: number | null = null;
  if (typeof d.pushups1min === "number" && d.pushups1min >= 0) {
    scoreStrength = repsToScore10(d.pushups1min, band.flexHealthy, band.flexAthletic);
    push(
      `Força (flexões): ${d.pushups1min} rep. vs ref. ${sex === "F" ? "raparigas" : "rapazes"} (${band.age} anos): ≥${band.flexHealthy} saudável, ≥${band.flexAthletic} atlético → sugestão ${scoreStrength}.`,
      `Strength (push-ups): ${d.pushups1min} reps vs ${sex === "F" ? "girls" : "boys"} ref. (age ${band.age}): ≥${band.flexHealthy} healthy, ≥${band.flexAthletic} athletic → suggestion ${scoreStrength}.`
    );
  } else {
    push("Força (flexões): sem valor — preenche o teste ou atribui nota manual.", "Strength (push-ups): no value — fill the test or set the score manually.");
  }

  let abdomScore: number | null = null;
  if (typeof d.situps1min === "number" && d.situps1min >= 0) {
    abdomScore = repsToScore10(d.situps1min, band.abdHealthy, band.abdAthletic);
    push(
      `Abdominais (tabela): ${d.situps1min} rep. vs ≥${band.abdHealthy} / ≥${band.abdAthletic} → ${abdomScore}.`,
      `Sit-ups (table): ${d.situps1min} reps vs ≥${band.abdHealthy} / ≥${band.abdAthletic} → ${abdomScore}.`
    );
  }

  let runScore: number | null = null;
  let scoreSpeed: number | null = null;
  if (typeof d.runDistance1minMeters === "number" && d.runDistance1minMeters > 0) {
    const mpm = d.runDistance1minMeters;
    const runBase = runMetersPerMinToScore10(mpm, sex, ageYears);
    runScore = runBase;
    scoreSpeed = Math.max(2, Math.min(10, runBase - 1));
    push(
      `Distância 1 min (${mpm} m/min): resistência (aprox.) ${runScore}; velocidade (aprox., mais exigente) ${scoreSpeed} — não substitui VAIVÉM/milha nem tempos 20/40 m.`,
      `1-min distance (${mpm} m/min): endurance (approx.) ${runScore}; speed (approx., stricter) ${scoreSpeed} — does not replace shuttle/mile or 20/40 m tables.`
    );
  } else {
    push(
      "Velocidade / resistência aeróbia (tabelas VAIVÉM, milha): não registados nesta ficha; podes usar abdominais e distância 1 min para resistência aproximada.",
      "Aerobic endurance (shuttle, mile tables): not on this form; use sit-ups and 1-min distance for a rough endurance estimate."
    );
  }

  let scoreEndurance: number | null = abdomScore;
  if (abdomScore != null && runScore != null) {
    scoreEndurance = Math.round((abdomScore + runScore) / 2);
    push(`Resistência combinada (abdominais + distância 1 min): média → ${scoreEndurance}.`, `Combined endurance (sit-ups + 1-min distance): average → ${scoreEndurance}.`);
  } else if (abdomScore != null) {
    scoreEndurance = abdomScore;
    push(`Resistência: baseada nas abdominais → ${scoreEndurance}.`, `Endurance: based on sit-ups → ${scoreEndurance}.`);
  } else if (runScore != null) {
    scoreEndurance = runScore;
    push(`Resistência: só distância 1 min (aproximação) → ${scoreEndurance}.`, `Endurance: 1-min distance only (approximation) → ${scoreEndurance}.`);
  } else {
    push("Resistência: sem abdominais nem distância 1 min — usa nota manual ou preenche os testes.", "Endurance: no sit-ups or 1-min distance — set manually or fill tests.");
  }

  let scoreCondition: number | null = null;
  if (typeof h === "number" && typeof w === "number" && h > 0 && w > 0) {
    const bmi = w / (h / 100) ** 2;
    scoreCondition = bmiToScore10(bmi, bmiBand);
    push(
      `Condição / composição (IMC): ${bmi.toFixed(1)} kg/m² vs zona saudável ${bmiBand.min}–${bmiBand.max} (${sex === "F" ? "raparigas" : "rapazes"}, ${bmiBand.age} a.) → ${scoreCondition}.`,
      `Condition / composition (BMI): ${bmi.toFixed(1)} vs healthy range ${bmiBand.min}–${bmiBand.max} (${sex === "F" ? "girls" : "boys"}, age ${bmiBand.age}) → ${scoreCondition}.`
    );
  } else {
    push("Condição física (IMC): falta altura e peso nesta ficha — preenche ou usa o perfil.", "Condition (BMI): height and weight missing on this form — fill them or use profile data.");
  }

  const scoreMobility = mobilityPostureScore10(d);
  if (scoreMobility != null) {
    push(
      `Mobilidade / postura: inferida a partir das opções marcadas (sem «Senta e alcança» em cm na ficha) → ${scoreMobility}.`,
      `Mobility / posture: inferred from selected options (no sit-and-reach cm in this form) → ${scoreMobility}.`
    );
  } else {
    push("Mobilidade: sem itens marcados em mobilidade/postura — atribui manualmente.", "Mobility: no mobility/posture items selected — set manually.");
  }

  const parts = [scoreStrength, scoreEndurance, scoreCondition].filter((x): x is number => x != null);
  let scoreCoordination: number | null = null;
  if (parts.length >= 2) {
    scoreCoordination = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
    push(
      `Coordenação: estimativa pela média de força, resistência e condição (${parts.join(", ")}) → ${scoreCoordination} (sem teste 4×10 m).`,
      `Coordination: estimated from mean of strength, endurance, condition → ${scoreCoordination} (no 4×10 m test).`
    );
  } else {
    push("Coordenação: dados insuficientes para estimativa — atribui manualmente.", "Coordination: insufficient data for estimate — set manually.");
  }

  return {
    scoreCondition,
    scoreMobility,
    scoreCoordination,
    scoreEndurance,
    scoreStrength,
    scoreSpeed,
    linesPt,
    linesEn,
  };
}

function emptyBreakdown(linesPt: string[], linesEn: string[]): ReferenceScoreBreakdown {
  return {
    scoreCondition: null,
    scoreMobility: null,
    scoreCoordination: null,
    scoreEndurance: null,
    scoreStrength: null,
    scoreSpeed: null,
    linesPt,
    linesEn,
  };
}
