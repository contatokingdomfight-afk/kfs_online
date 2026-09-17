import { formatInTimeZone } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";

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

/** Períodos de ranking; ALL = XP total (comportamento histórico, sem filtro). */
export const RANK_PERIODS = ["ALL", "WEEK", "MONTH", "LAST_30D"] as const;
export type RankPeriod = (typeof RANK_PERIODS)[number];

export function parseRankPeriodParam(value: string | undefined): RankPeriod {
  if (!value || typeof value !== "string") return "ALL";
  const v = value.trim().toUpperCase();
  return (RANK_PERIODS as readonly string[]).includes(v) ? (v as RankPeriod) : "ALL";
}

/** Modo de ranking: por XP (com período opcional) ou por evolução nas dimensões de performance. */
export const RANK_MODES = ["XP", "EVOLUTION"] as const;
export type RankMode = (typeof RANK_MODES)[number];

export function parseRankModeParam(value: string | undefined): RankMode {
  if (!value || typeof value !== "string") return "XP";
  const v = value.trim().toUpperCase();
  return v === "EVOLUTION" ? "EVOLUTION" : "XP";
}

/**
 * Data de início (ISO, calendário de Lisboa) para o período escolhido; `null` = sem filtro (sempre).
 * WEEK = desde segunda-feira desta semana; MONTH = desde o dia 1 deste mês; LAST_30D = últimos 30 dias corridos.
 */
export function rankPeriodToStartDate(period: RankPeriod, now: Date = new Date()): string | null {
  if (period === "ALL") return null;

  if (period === "LAST_30D") {
    const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return formatInTimeZone(past, LISBON_TZ, "yyyy-MM-dd");
  }

  const todayYmd = formatInTimeZone(now, LISBON_TZ, "yyyy-MM-dd");
  const [y, m, d] = todayYmd.split("-").map(Number);

  if (period === "MONTH") {
    return `${y}-${String(m).padStart(2, "0")}-01`;
  }

  // WEEK: segunda-feira desta semana (calendário civil, sem depender de fuso na aritmética de dias).
  const dowSundayZero = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).getUTCDay(); // 0=domingo .. 6=sábado
  const daysSinceMonday = (dowSundayZero + 6) % 7;
  const monday = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) - daysSinceMonday));
  return formatInTimeZone(monday, "UTC", "yyyy-MM-dd");
}
