import type { ArbitrationCorner, ArbitrationDecisionType, CornerScores, CriteriaKey } from "./types";
import { CRITERIA_KEYS } from "./types";

const MAX_CRITERIA_TOTAL = 30;

export function maxCriteriaTotal(criteriaCount: number): number {
  return Math.max(5, criteriaCount * 5);
}

export function sumCornerScores(
  scores: Record<string, number | null>,
  criteriaIds: string[] = CRITERIA_KEYS
): number | null {
  const values = criteriaIds.map((k) => scores[k]);
  if (values.some((v) => v == null || v < 1 || v > 5)) return null;
  return values.reduce<number>((acc, v) => acc + (v as number), 0);
}

/** Sugere placar 10-Point Must com base na diferença de totais relativamente ao máximo possível. */
export function suggestTenPointMust(
  blueTotal: number,
  redTotal: number,
  maxTotal = MAX_CRITERIA_TOTAL
): { blue: number; red: number } {
  const diff = Math.abs(blueTotal - redTotal);
  if (diff === 0) return { blue: 10, red: 10 };

  const t1 = Math.max(1, Math.round(maxTotal * 0.07));
  const t2 = Math.max(2, Math.round(maxTotal * 0.2));
  const t3 = Math.max(3, Math.round(maxTotal * 0.33));

  let loserScore: number;
  if (diff <= t1) loserScore = 10;
  else if (diff <= t2) loserScore = 9;
  else if (diff <= t3) loserScore = 8;
  else loserScore = 7;

  if (blueTotal > redTotal) return { blue: 10, red: loserScore };
  return { blue: loserScore, red: 10 };
}

export function officialScoresFromDb(row: {
  officialBlueScore: number | null;
  officialRedScore: number | null;
  suggestedBlueOfficial: number | null;
  suggestedRedOfficial: number | null;
}): { blue: number; red: number } | null {
  const blue = row.officialBlueScore ?? row.suggestedBlueOfficial;
  const red = row.officialRedScore ?? row.suggestedRedOfficial;
  if (blue == null || red == null) return null;
  return { blue, red };
}

export function cornerScoresFromEvaluationRow(row: Record<string, unknown>, corner: "blue" | "red"): CornerScores {
  const prefix = corner;
  const result = {} as CornerScores;
  const keyMap: Record<CriteriaKey, string> = {
    offensiveVolume: `${prefix}OffensiveVolume`,
    strikePrecision: `${prefix}StrikePrecision`,
    ringControl: `${prefix}RingControl`,
    movement: `${prefix}Movement`,
    defense: `${prefix}Defense`,
    technique: `${prefix}Technique`,
  };
  for (const k of CRITERIA_KEYS) {
    const v = row[keyMap[k]];
    result[k] = typeof v === "number" ? v : null;
  }
  return result;
}

export function aggregateJudgeTotals(
  rounds: { officialBlueScore: number | null; officialRedScore: number | null }[]
): { blue: number; red: number } | null {
  if (rounds.length === 0) return null;
  let blue = 0;
  let red = 0;
  for (const r of rounds) {
    if (r.officialBlueScore == null || r.officialRedScore == null) return null;
    blue += r.officialBlueScore;
    red += r.officialRedScore;
  }
  return { blue, red };
}

export function winnerFromTotals(blue: number, red: number): ArbitrationCorner {
  if (blue > red) return "BLUE";
  if (red > blue) return "RED";
  return "DRAW";
}

export function computeDecisionType(winners: ArbitrationCorner[]): ArbitrationDecisionType {
  if (winners.length === 0) return "DRAW";
  const blue = winners.filter((w) => w === "BLUE").length;
  const red = winners.filter((w) => w === "RED").length;
  const draw = winners.filter((w) => w === "DRAW").length;
  if (draw === winners.length) return "DRAW";
  const max = Math.max(blue, red, draw);
  const leaders = [blue, red, draw].filter((n) => n === max).length;
  if (leaders > 1 || max < Math.ceil(winners.length / 2)) return "SPLIT";
  if (max === winners.length) return "UNANIMOUS";
  return "MAJORITY";
}

export function modalityLabel(modality: string, locale: "pt" | "en" = "pt"): string {
  if (modality === "BOXING") return locale === "pt" ? "Boxe" : "Boxing";
  if (modality === "MUAY_THAI") return locale === "pt" ? "Muay Thai" : "Muay Thai";
  return modality;
}

export function statusLabel(status: string, locale: "pt" | "en" = "pt"): string {
  const map: Record<string, { pt: string; en: string }> = {
    SCHEDULED: { pt: "Agendado", en: "Scheduled" },
    IN_PROGRESS: { pt: "Em andamento", en: "In progress" },
    COMPLETED: { pt: "Encerrado", en: "Completed" },
    CANCELLED: { pt: "Cancelado", en: "Cancelled" },
  };
  return map[status]?.[locale] ?? status;
}

export function decisionTypeLabel(type: ArbitrationDecisionType | null, locale: "pt" | "en" = "pt"): string {
  if (!type) return "—";
  const map: Record<ArbitrationDecisionType, { pt: string; en: string }> = {
    UNANIMOUS: { pt: "Decisão unânime", en: "Unanimous decision" },
    SPLIT: { pt: "Decisão dividida", en: "Split decision" },
    MAJORITY: { pt: "Decisão por maioria", en: "Majority decision" },
    DRAW: { pt: "Empate", en: "Draw" },
  };
  return map[type][locale];
}

export { MAX_CRITERIA_TOTAL };
