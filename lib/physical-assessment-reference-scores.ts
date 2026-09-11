/**
 * Tabelas de referência (raparigas / rapazes) alinhadas ao documento fornecido
 * (abdominais, flexões, IMC zona saudável por idade). As notas 1–10 são uma
 * conversão pedagógica interna — não substituem critério clínico nem o juízo do instrutor.
 *
 * Testes não recolhidos na ficha digital (VAIVÉM, milha, 4×10 m, 20/40 m, impulsões,
 * senta-e-alcança em cm, etc.) não entram no cálculo automático.
 */
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";
import { formatRunPaceMinPerKm, getRunPaceMinPerKm, runMetersPerMinFromPace } from "@/lib/run-pace";

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

/**
 * Referências para adultos (19+): abdominais 1 min. de Golding et al. (1986), "The Y's Way to
 * Physical Fitness" (YMCA) — teste de 1 minuto, igual ao campo desta ficha. Flexões do ACSM
 * ("Health-Related Physical Fitness Assessment Manual") — repetições até à exaustão, não
 * especificamente 1 minuto; usa-se aqui como aproximação (prática comum em calculadoras de
 * fitness), não é uma correspondência perfeita ao protocolo desta ficha.
 * IMC: faixa saudável da OMS para adultos (18,5–24,9 kg/m²), não varia por idade.
 */
type AdultTierKey = "VERY_POOR" | "POOR" | "BELOW_AVERAGE" | "AVERAGE" | "ABOVE_AVERAGE" | "GOOD" | "EXCELLENT";

const ADULT_TIER_SCORE: Record<AdultTierKey, number> = {
  VERY_POOR: 2,
  POOR: 3,
  BELOW_AVERAGE: 4,
  AVERAGE: 6,
  ABOVE_AVERAGE: 7,
  GOOD: 8,
  EXCELLENT: 9,
};

const ADULT_TIER_LABEL_PT: Record<AdultTierKey, string> = {
  VERY_POOR: "Muito fraco",
  POOR: "Fraco",
  BELOW_AVERAGE: "Abaixo da média",
  AVERAGE: "Média",
  ABOVE_AVERAGE: "Acima da média",
  GOOD: "Bom",
  EXCELLENT: "Excelente",
};

const ADULT_TIER_LABEL_EN: Record<AdultTierKey, string> = {
  VERY_POOR: "Very poor",
  POOR: "Poor",
  BELOW_AVERAGE: "Below average",
  AVERAGE: "Average",
  ABOVE_AVERAGE: "Above average",
  GOOD: "Good",
  EXCELLENT: "Excellent",
};

type AdultTier = { min: number; score: number; label: string; labelEn: string };
type AdultAgeBand = { minAge: number; maxAge: number; tiers: AdultTier[] };

function tier(min: number, key: AdultTierKey): AdultTier {
  return { min, score: ADULT_TIER_SCORE[key], label: ADULT_TIER_LABEL_PT[key], labelEn: ADULT_TIER_LABEL_EN[key] };
}

/** Abdominais 1 min. — homens (Golding et al. 1986). */
const ADULT_SITUP_1MIN_MALE: AdultAgeBand[] = [
  { minAge: 19, maxAge: 25, tiers: [tier(0, "VERY_POOR"), tier(25, "POOR"), tier(31, "BELOW_AVERAGE"), tier(35, "AVERAGE"), tier(39, "ABOVE_AVERAGE"), tier(44, "GOOD"), tier(50, "EXCELLENT")] },
  { minAge: 26, maxAge: 35, tiers: [tier(0, "VERY_POOR"), tier(22, "POOR"), tier(29, "BELOW_AVERAGE"), tier(31, "AVERAGE"), tier(35, "ABOVE_AVERAGE"), tier(40, "GOOD"), tier(46, "EXCELLENT")] },
  { minAge: 36, maxAge: 45, tiers: [tier(0, "VERY_POOR"), tier(17, "POOR"), tier(23, "BELOW_AVERAGE"), tier(27, "AVERAGE"), tier(30, "ABOVE_AVERAGE"), tier(35, "GOOD"), tier(42, "EXCELLENT")] },
  { minAge: 46, maxAge: 55, tiers: [tier(0, "VERY_POOR"), tier(13, "POOR"), tier(18, "BELOW_AVERAGE"), tier(22, "AVERAGE"), tier(25, "ABOVE_AVERAGE"), tier(29, "GOOD"), tier(36, "EXCELLENT")] },
  { minAge: 56, maxAge: 65, tiers: [tier(0, "VERY_POOR"), tier(9, "POOR"), tier(13, "BELOW_AVERAGE"), tier(17, "AVERAGE"), tier(21, "ABOVE_AVERAGE"), tier(25, "GOOD"), tier(32, "EXCELLENT")] },
  { minAge: 66, maxAge: 200, tiers: [tier(0, "VERY_POOR"), tier(7, "POOR"), tier(11, "BELOW_AVERAGE"), tier(15, "AVERAGE"), tier(19, "ABOVE_AVERAGE"), tier(22, "GOOD"), tier(29, "EXCELLENT")] },
];

/** Abdominais 1 min. — mulheres (Golding et al. 1986). */
const ADULT_SITUP_1MIN_FEMALE: AdultAgeBand[] = [
  { minAge: 19, maxAge: 25, tiers: [tier(0, "VERY_POOR"), tier(18, "POOR"), tier(25, "BELOW_AVERAGE"), tier(29, "AVERAGE"), tier(33, "ABOVE_AVERAGE"), tier(37, "GOOD"), tier(44, "EXCELLENT")] },
  { minAge: 26, maxAge: 35, tiers: [tier(0, "VERY_POOR"), tier(13, "POOR"), tier(21, "BELOW_AVERAGE"), tier(25, "AVERAGE"), tier(29, "ABOVE_AVERAGE"), tier(33, "GOOD"), tier(40, "EXCELLENT")] },
  { minAge: 36, maxAge: 45, tiers: [tier(0, "VERY_POOR"), tier(7, "POOR"), tier(15, "BELOW_AVERAGE"), tier(19, "AVERAGE"), tier(23, "ABOVE_AVERAGE"), tier(27, "GOOD"), tier(34, "EXCELLENT")] },
  { minAge: 46, maxAge: 55, tiers: [tier(0, "VERY_POOR"), tier(5, "POOR"), tier(10, "BELOW_AVERAGE"), tier(14, "AVERAGE"), tier(18, "ABOVE_AVERAGE"), tier(22, "GOOD"), tier(28, "EXCELLENT")] },
  { minAge: 56, maxAge: 65, tiers: [tier(0, "VERY_POOR"), tier(3, "POOR"), tier(7, "BELOW_AVERAGE"), tier(10, "AVERAGE"), tier(13, "ABOVE_AVERAGE"), tier(18, "GOOD"), tier(25, "EXCELLENT")] },
  { minAge: 66, maxAge: 200, tiers: [tier(0, "VERY_POOR"), tier(2, "POOR"), tier(5, "BELOW_AVERAGE"), tier(11, "AVERAGE"), tier(14, "ABOVE_AVERAGE"), tier(17, "GOOD"), tier(24, "EXCELLENT")] },
];

/** Flexões (ACSM, até à exaustão — usado como aproximação ao teste de 1 min.) — homens. */
const ADULT_PUSHUP_MALE: AdultAgeBand[] = [
  { minAge: 19, maxAge: 29, tiers: [tier(0, "POOR"), tier(20, "BELOW_AVERAGE"), tier(24, "AVERAGE"), tier(30, "ABOVE_AVERAGE"), tier(39, "GOOD"), tier(47, "EXCELLENT")] },
  { minAge: 30, maxAge: 39, tiers: [tier(0, "POOR"), tier(15, "BELOW_AVERAGE"), tier(20, "AVERAGE"), tier(25, "ABOVE_AVERAGE"), tier(34, "GOOD"), tier(41, "EXCELLENT")] },
  { minAge: 40, maxAge: 49, tiers: [tier(0, "POOR"), tier(12, "BELOW_AVERAGE"), tier(16, "AVERAGE"), tier(21, "ABOVE_AVERAGE"), tier(28, "GOOD"), tier(34, "EXCELLENT")] },
  { minAge: 50, maxAge: 59, tiers: [tier(0, "POOR"), tier(9, "BELOW_AVERAGE"), tier(13, "AVERAGE"), tier(18, "ABOVE_AVERAGE"), tier(25, "GOOD"), tier(31, "EXCELLENT")] },
  { minAge: 60, maxAge: 200, tiers: [tier(0, "POOR"), tier(6, "BELOW_AVERAGE"), tier(11, "AVERAGE"), tier(17, "ABOVE_AVERAGE"), tier(24, "GOOD"), tier(30, "EXCELLENT")] },
];

/** Flexões (ACSM) — mulheres. */
const ADULT_PUSHUP_FEMALE: AdultAgeBand[] = [
  { minAge: 19, maxAge: 29, tiers: [tier(0, "POOR"), tier(12, "BELOW_AVERAGE"), tier(17, "AVERAGE"), tier(23, "ABOVE_AVERAGE"), tier(30, "GOOD"), tier(36, "EXCELLENT")] },
  { minAge: 30, maxAge: 39, tiers: [tier(0, "POOR"), tier(10, "BELOW_AVERAGE"), tier(14, "AVERAGE"), tier(22, "ABOVE_AVERAGE"), tier(30, "GOOD"), tier(37, "EXCELLENT")] },
  { minAge: 40, maxAge: 49, tiers: [tier(0, "POOR"), tier(8, "BELOW_AVERAGE"), tier(11, "AVERAGE"), tier(17, "ABOVE_AVERAGE"), tier(24, "GOOD"), tier(31, "EXCELLENT")] },
  { minAge: 50, maxAge: 59, tiers: [tier(0, "POOR"), tier(7, "BELOW_AVERAGE"), tier(10, "AVERAGE"), tier(14, "ABOVE_AVERAGE"), tier(21, "GOOD"), tier(25, "EXCELLENT")] },
  { minAge: 60, maxAge: 200, tiers: [tier(0, "VERY_POOR"), tier(3, "BELOW_AVERAGE"), tier(5, "AVERAGE"), tier(12, "ABOVE_AVERAGE"), tier(19, "GOOD"), tier(23, "EXCELLENT")] },
];

const ADULT_BMI_HEALTHY: BmiBand = { age: 0, min: 18.5, max: 24.9 };

function adultBandFor(rows: AdultAgeBand[], ageYears: number): AdultAgeBand {
  return rows.find((r) => ageYears >= r.minAge && ageYears <= r.maxAge) ?? rows[rows.length - 1];
}

/** Maior tier cujo mínimo é atingido pelas repetições (staircase, tal como as tabelas de origem). */
function adultTierForReps(reps: number, band: AdultAgeBand): AdultTier {
  let chosen = band.tiers[0];
  for (const t of band.tiers) {
    if (reps >= t.min) chosen = t;
  }
  return chosen;
}

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
  /** Aproximação a partir do ritmo de corrida (min/km); tabelas oficiais usam 20/40 m. */
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

  if (ageYears >= 19) {
    return computeAdultReferenceScores(d, { ageYears, sex, h, w }, push, linesPt, linesEn);
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
  const runPace = getRunPaceMinPerKm(d);
  if (runPace != null) {
    const mpm = runMetersPerMinFromPace(runPace);
    const runBase = runMetersPerMinToScore10(mpm, sex, ageYears);
    runScore = runBase;
    scoreSpeed = Math.max(2, Math.min(10, runBase - 1));
    const paceLabel = formatRunPaceMinPerKm(runPace, "pt");
    push(
      `Ritmo de corrida (${paceLabel}): resistência (aprox.) ${runScore}; velocidade (aprox., mais exigente) ${scoreSpeed} — não substitui VAIVÉM/milha nem tempos 20/40 m.`,
      `Run pace (${formatRunPaceMinPerKm(runPace, "en")}): endurance (approx.) ${runScore}; speed (approx., stricter) ${scoreSpeed} — does not replace shuttle/mile or 20/40 m tables.`
    );
  } else {
    push(
      "Velocidade / resistência aeróbia (tabelas VAIVÉM, milha): não registados nesta ficha; podes usar abdominais e ritmo de corrida (min/km) para resistência aproximada.",
      "Aerobic endurance (shuttle, mile tables): not on this form; use sit-ups and run pace (min/km) for a rough endurance estimate."
    );
  }

  let scoreEndurance: number | null = abdomScore;
  if (abdomScore != null && runScore != null) {
    scoreEndurance = Math.round((abdomScore + runScore) / 2);
    push(`Resistência combinada (abdominais + ritmo de corrida): média → ${scoreEndurance}.`, `Combined endurance (sit-ups + run pace): average → ${scoreEndurance}.`);
  } else if (abdomScore != null) {
    scoreEndurance = abdomScore;
    push(`Resistência: baseada nas abdominais → ${scoreEndurance}.`, `Endurance: based on sit-ups → ${scoreEndurance}.`);
  } else if (runScore != null) {
    scoreEndurance = runScore;
    push(`Resistência: só ritmo de corrida (aproximação) → ${scoreEndurance}.`, `Endurance: run pace only (approximation) → ${scoreEndurance}.`);
  } else {
    push("Resistência: sem abdominais nem ritmo de corrida — usa nota manual ou preenche os testes.", "Endurance: no sit-ups or run pace — set manually or fill tests.");
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

/** Ramo adulto (19+) de {@link computePhysicalAssessmentReferenceScores} — ver tabelas ADULT_* acima. */
function computeAdultReferenceScores(
  d: Partial<PhysicalAssessmentFormData>,
  opts: { ageYears: number; sex: ReferenceSex; h: number | null | undefined; w: number | null | undefined },
  push: (pt: string, en: string) => void,
  linesPt: string[],
  linesEn: string[]
): ReferenceScoreBreakdown {
  const { ageYears, sex, h, w } = opts;
  const sexLabelPt = sex === "F" ? "mulheres" : "homens";
  const sexLabelEn = sex === "F" ? "women" : "men";

  const pushupBand = adultBandFor(sex === "F" ? ADULT_PUSHUP_FEMALE : ADULT_PUSHUP_MALE, ageYears);
  let scoreStrength: number | null = null;
  if (typeof d.pushups1min === "number" && d.pushups1min >= 0) {
    const t = adultTierForReps(d.pushups1min, pushupBand);
    scoreStrength = t.score;
    push(
      `Força (flexões, ACSM, ${sexLabelPt} ${pushupBand.minAge}–${pushupBand.maxAge === 200 ? "+" : pushupBand.maxAge} anos): ${d.pushups1min} rep. → ${t.label} → sugestão ${scoreStrength}. Tabela até à exaustão, usada como aproximação ao teste de 1 min.`,
      `Strength (push-ups, ACSM, ${sexLabelEn} ${pushupBand.minAge}–${pushupBand.maxAge === 200 ? "+" : pushupBand.maxAge}): ${d.pushups1min} reps → ${t.labelEn} → suggestion ${scoreStrength}. To-exhaustion table, used as an approximation for the 1-min test.`
    );
  } else {
    push("Força (flexões): sem valor — preenche o teste ou atribui nota manual.", "Strength (push-ups): no value — fill the test or set the score manually.");
  }

  const situpBand = adultBandFor(sex === "F" ? ADULT_SITUP_1MIN_FEMALE : ADULT_SITUP_1MIN_MALE, ageYears);
  let abdomScore: number | null = null;
  if (typeof d.situps1min === "number" && d.situps1min >= 0) {
    const t = adultTierForReps(d.situps1min, situpBand);
    abdomScore = t.score;
    push(
      `Abdominais 1 min (Golding/YMCA, ${sexLabelPt} ${situpBand.minAge}–${situpBand.maxAge === 200 ? "+" : situpBand.maxAge} anos): ${d.situps1min} rep. → ${t.label} → ${abdomScore}.`,
      `Sit-ups 1 min (Golding/YMCA, ${sexLabelEn} ${situpBand.minAge}–${situpBand.maxAge === 200 ? "+" : situpBand.maxAge}): ${d.situps1min} reps → ${t.labelEn} → ${abdomScore}.`
    );
  }

  let runScore: number | null = null;
  let scoreSpeed: number | null = null;
  const runPaceAdult = getRunPaceMinPerKm(d);
  if (runPaceAdult != null) {
    const mpm = runMetersPerMinFromPace(runPaceAdult);
    const runBase = runMetersPerMinToScore10(mpm, sex, 18);
    runScore = runBase;
    scoreSpeed = Math.max(2, Math.min(10, runBase - 1));
    const paceLabel = formatRunPaceMinPerKm(runPaceAdult, "pt");
    push(
      `Ritmo de corrida (${paceLabel}): resistência (aprox., sem tabela validada para adultos — usa a referência de 18 anos como base) ${runScore}; velocidade (aprox.) ${scoreSpeed}.`,
      `Run pace (${formatRunPaceMinPerKm(runPaceAdult, "en")}): endurance (approx., no validated adult table — using the 18-year-old reference as a base) ${runScore}; speed (approx.) ${scoreSpeed}.`
    );
  } else {
    push(
      "Velocidade / resistência aeróbia: não registados nesta ficha; podes usar abdominais e ritmo de corrida (min/km) para resistência aproximada.",
      "Aerobic endurance: not on this form; use sit-ups and run pace (min/km) for a rough endurance estimate."
    );
  }

  let scoreEndurance: number | null = abdomScore;
  if (abdomScore != null && runScore != null) {
    scoreEndurance = Math.round((abdomScore + runScore) / 2);
    push(`Resistência combinada (abdominais + ritmo de corrida): média → ${scoreEndurance}.`, `Combined endurance (sit-ups + run pace): average → ${scoreEndurance}.`);
  } else if (abdomScore != null) {
    scoreEndurance = abdomScore;
    push(`Resistência: baseada nas abdominais → ${scoreEndurance}.`, `Endurance: based on sit-ups → ${scoreEndurance}.`);
  } else if (runScore != null) {
    scoreEndurance = runScore;
    push(`Resistência: só ritmo de corrida (aproximação) → ${scoreEndurance}.`, `Endurance: run pace only (approximation) → ${scoreEndurance}.`);
  } else {
    push("Resistência: sem abdominais nem ritmo de corrida — usa nota manual ou preenche os testes.", "Endurance: no sit-ups or run pace — set manually or fill tests.");
  }

  let scoreCondition: number | null = null;
  if (typeof h === "number" && typeof w === "number" && h > 0 && w > 0) {
    const bmi = w / (h / 100) ** 2;
    scoreCondition = bmiToScore10(bmi, ADULT_BMI_HEALTHY);
    push(
      `Condição / composição (IMC): ${bmi.toFixed(1)} kg/m² vs zona saudável adulta 18,5–24,9 (OMS) → ${scoreCondition}.`,
      `Condition / composition (BMI): ${bmi.toFixed(1)} vs adult healthy range 18.5–24.9 (WHO) → ${scoreCondition}.`
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
