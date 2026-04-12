/** Faixas etárias para o ranking (idade calculada em SQL com `AGE`). */
export const RANK_AGE_BUCKETS = ["KIDS", "TEENS", "ADULTS", "MASTERS"] as const;
export type RankAgeBucket = (typeof RANK_AGE_BUCKETS)[number];

/** Modalidades aceites no filtro (alinhado a `Student.primaryModality` e `MODALITY_LABELS`). */
export const RANK_MODALITY_FILTER_CODES = ["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"] as const;

export function parseRankAgeParam(value: string | undefined): RankAgeBucket | null {
  if (!value || typeof value !== "string") return null;
  const v = value.trim().toUpperCase();
  return (RANK_AGE_BUCKETS as readonly string[]).includes(v) ? (v as RankAgeBucket) : null;
}

export function parseRankModalityParam(value: string | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  return (RANK_MODALITY_FILTER_CODES as readonly string[]).includes(v as (typeof RANK_MODALITY_FILTER_CODES)[number])
    ? v
    : null;
}
