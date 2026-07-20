/**
 * Metas de negócio do administrador — progresso manual com lançamentos.
 */

import { parseDecimalAmount } from "@/lib/parse-decimal-amount";

export type AdminGoalMetricType = "QUANTITY" | "MONETARY";
export type AdminGoalStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export type AdminBusinessGoalRow = {
  id: string;
  title: string;
  description: string | null;
  metricType: AdminGoalMetricType;
  targetValue: number;
  currentValue: number;
  startDate: string;
  targetEndDate: string;
  schoolId: string | null;
  status: AdminGoalStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminGoalEntryRow = {
  id: string;
  goalId: string;
  deltaValue: number;
  note: string | null;
  recordedAt: string;
  createdByUserId: string;
  createdAt: string;
};

export type AdminGoalWithSchool = AdminBusinessGoalRow & {
  schoolName: string | null;
};

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  return 0;
}

export function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

/** Meta activa com data de conclusão já passada. */
export function isGoalOverdue(goal: Pick<AdminBusinessGoalRow, "status" | "targetEndDate">, today = new Date()): boolean {
  if (goal.status !== "ACTIVE") return false;
  const end = goal.targetEndDate.slice(0, 10);
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return end < `${y}-${m}-${d}`;
}

export function deriveGoalStatusAfterProgress(
  currentValue: number,
  targetValue: number,
  existingStatus: AdminGoalStatus
): AdminGoalStatus {
  if (existingStatus === "CANCELLED") return "CANCELLED";
  if (currentValue >= targetValue) return "COMPLETED";
  return "ACTIVE";
}

export function recalculateCurrentValueFromEntries(entries: { deltaValue: number }[]): number {
  const sum = entries.reduce((acc, e) => acc + toNumber(e.deltaValue), 0);
  return Math.max(0, sum);
}

export function formatGoalValue(metricType: AdminGoalMetricType, value: number, locale: "pt" | "en" = "pt"): string {
  if (metricType === "MONETARY") {
    return new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
  return locale === "pt" ? `${formatted} un.` : `${formatted} units`;
}

export function parseGoalMetricInput(
  raw: string | null | undefined,
  metricType: AdminGoalMetricType
): number | null {
  const trimmed = (raw ?? "").trim().replace(/\s/g, "");
  if (!trimmed) return null;

  if (metricType === "MONETARY") {
    return parseDecimalAmount(trimmed);
  }

  const normalized = trimmed.includes(",") ? trimmed.replace(",", ".") : trimmed;
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? null : n;
}

export function validateGoalDates(startDate: string, targetEndDate: string): string | null {
  if (!startDate || !targetEndDate) return "Datas de início e conclusão são obrigatórias.";
  if (targetEndDate < startDate) return "A data de conclusão deve ser igual ou posterior à de início.";
  return null;
}

export const GOAL_STATUS_LABELS_PT: Record<AdminGoalStatus, string> = {
  ACTIVE: "Activa",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export const GOAL_METRIC_LABELS_PT: Record<AdminGoalMetricType, string> = {
  QUANTITY: "Quantidade",
  MONETARY: "Monetária",
};
