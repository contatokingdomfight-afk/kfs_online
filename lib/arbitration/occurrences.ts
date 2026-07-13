import type { OccurrenceInput, CornerOccurrences } from "./types";

export type OccurrenceFieldKey = keyof CornerOccurrences;

export const OCCURRENCE_FIELD_KEYS: OccurrenceFieldKey[] = [
  "illegalStrike",
  "verbalWarning",
  "pointDeduction",
  "knockdown",
  "count",
  "excessiveHolding",
  "lackOfAggressiveness",
  "other",
];

export const OCCURRENCE_LABELS_PT: Record<OccurrenceFieldKey, string> = {
  illegalStrike: "Golpe ilegal",
  verbalWarning: "Advertência verbal",
  pointDeduction: "Perda de ponto",
  knockdown: "Knockdown",
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

/** Aplica desconto no placar 10-Point Must (mínimo 7). */
export function applyOfficialPointDeduction(score: number, deduction: number): number {
  const d = Math.max(0, Math.min(3, Math.round(deduction)));
  return Math.max(7, score - d);
}

/** Se marcou «Perda de ponto» na ocorrência, sugere desconto de 1 no placar. */
export function syncDeductionsFromOccurrences(input: OccurrenceInput): OccurrenceInput {
  return {
    ...input,
    blueOfficialPointDeduction: input.blue.pointDeduction ? Math.max(1, input.blueOfficialPointDeduction) : input.blueOfficialPointDeduction,
    redOfficialPointDeduction: input.red.pointDeduction ? Math.max(1, input.redOfficialPointDeduction) : input.redOfficialPointDeduction,
  };
}
