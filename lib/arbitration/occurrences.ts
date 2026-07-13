import type { OccurrenceInput, CornerOccurrences } from "./types";

export type OccurrenceFieldKey = keyof CornerOccurrences;

export const OCCURRENCE_FIELD_KEYS: OccurrenceFieldKey[] = [
  "knockdown",
  "illegalStrike",
  "verbalWarning",
  "pointDeduction",
  "count",
  "excessiveHolding",
  "lackOfAggressiveness",
  "other",
];

export const OCCURRENCE_LABELS_PT: Record<OccurrenceFieldKey, string> = {
  illegalStrike: "Golpe ilegal",
  verbalWarning: "Advertência verbal",
  pointDeduction: "Perda de ponto",
  knockdown: "Knockdown sofrido (−3 no placar)",
  count: "Contagem",
  excessiveHolding: "Segurar excessivamente",
  lackOfAggressiveness: "Falta de combatividade",
  other: "Outro",
};

const DB_KEY_MAP: Record<OccurrenceFieldKey, { blue: string; red: string }> = {
  illegalStrike: { blue: "blueIllegalStrike", red: "redIllegalStrike" },
  verbalWarning: { blue: "blueVerbalWarning", red: "redVerbalWarning" },
  pointDeduction: { blue: "bluePointDeduction", red: "redPointDeduction" },
  knockdown: { blue: "blueKnockdown", red: "redKnockdown" },
  count: { blue: "blueCount", red: "redCount" },
  excessiveHolding: { blue: "blueExcessiveHolding", red: "redExcessiveHolding" },
  lackOfAggressiveness: { blue: "blueLackOfAggressiveness", red: "redLackOfAggressiveness" },
  other: { blue: "blueOther", red: "redOther" },
};

export const KNOCKDOWN_OFFICIAL_DEDUCTION = 3;
export const POINT_DEDUCTION_OFFICIAL_MIN = 1;
/** Placar oficial mínimo após descontos (ex.: 9 − 3 knockdown = 6). */
export const OFFICIAL_SCORE_MIN = 6;

export function emptyCornerOccurrences(): CornerOccurrences {
  return {
    illegalStrike: false,
    verbalWarning: false,
    pointDeduction: false,
    knockdown: false,
    count: false,
    excessiveHolding: false,
    lackOfAggressiveness: false,
    other: false,
  };
}

export function emptyOccurrences(): OccurrenceInput {
  return {
    blue: emptyCornerOccurrences(),
    red: emptyCornerOccurrences(),
    blueOfficialPointDeduction: 0,
    redOfficialPointDeduction: 0,
    notes: "",
  };
}

export function occurrencesFromDbRow(row: Record<string, unknown> | null | undefined): OccurrenceInput {
  if (!row) return emptyOccurrences();
  const blue = emptyCornerOccurrences();
  const red = emptyCornerOccurrences();
  for (const key of OCCURRENCE_FIELD_KEYS) {
    const map = DB_KEY_MAP[key];
    blue[key] = Boolean(row[map.blue]);
    red[key] = Boolean(row[map.red]);
  }
  return {
    blue,
    red,
    blueOfficialPointDeduction: 0,
    redOfficialPointDeduction: 0,
    notes: typeof row.notes === "string" ? row.notes : "",
  };
}

export function occurrencesToDbPayload(input: OccurrenceInput) {
  const payload: Record<string, boolean | string | null> = {
    notes: input.notes?.trim() || null,
  };
  for (const key of OCCURRENCE_FIELD_KEYS) {
    const map = DB_KEY_MAP[key];
    payload[map.blue] = input.blue[key];
    payload[map.red] = input.red[key];
  }
  return payload;
}

/** Conta células marcadas na matriz Azul/Vermelho. */
export function countOccurrenceMarks(input: OccurrenceInput): number {
  let count = 0;
  for (const key of OCCURRENCE_FIELD_KEYS) {
    if (input.blue[key]) count++;
    if (input.red[key]) count++;
  }
  return count;
}

export function occurrencesCollapsedHint(input: OccurrenceInput): string {
  const marks = countOccurrenceMarks(input);
  const hasNotes = input.notes.trim().length > 0;
  if (marks === 0 && !hasNotes) return "Opcional — toque para abrir";
  const parts: string[] = [];
  if (marks > 0) parts.push(`${marks} marcação${marks === 1 ? "" : "ões"}`);
  if (hasNotes) parts.push("com notas");
  return parts.join(", ");
}

/** Desconto automático no placar 10-Point Must com base nas ocorrências marcadas. */
export function officialDeductionForCorner(
  corner: CornerOccurrences,
  manualDeduction: number
): number {
  let d = Math.max(0, Math.round(manualDeduction));
  if (corner.pointDeduction) d = Math.max(d, POINT_DEDUCTION_OFFICIAL_MIN);
  if (corner.knockdown) d = Math.max(d, KNOCKDOWN_OFFICIAL_DEDUCTION);
  return d;
}

/** Aplica desconto no placar 10-Point Must (mínimo {@link OFFICIAL_SCORE_MIN}). */
export function applyOfficialPointDeduction(score: number, deduction: number): number {
  const d = Math.max(0, Math.min(9, Math.round(deduction)));
  return Math.max(OFFICIAL_SCORE_MIN, score - d);
}

/** Sincroniza descontos oficiais a partir das ocorrências (perda de ponto, knockdown, etc.). */
export function syncDeductionsFromOccurrences(input: OccurrenceInput): OccurrenceInput {
  return {
    ...input,
    blueOfficialPointDeduction: officialDeductionForCorner(input.blue, input.blueOfficialPointDeduction),
    redOfficialPointDeduction: officialDeductionForCorner(input.red, input.redOfficialPointDeduction),
  };
}
