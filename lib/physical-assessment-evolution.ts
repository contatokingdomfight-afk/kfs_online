import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";
import { getRunPaceMinPerKm } from "@/lib/run-pace";

export type PhysicalEvolutionCategory = "corpo" | "testes";

export type PhysicalEvolutionMetric = {
  key: string;
  labelPt: string;
  labelEn: string;
  unit: string;
  category: PhysicalEvolutionCategory;
  /** Só para "testes": lado para onde aponta a evolução positiva (reps/seg ↑, ritmo de corrida ↓). */
  improvementDirection?: "up" | "down";
  getValue: (fd: PhysicalAssessmentFormData) => number | null;
};

export const PHYSICAL_EVOLUTION_METRICS: PhysicalEvolutionMetric[] = [
  { key: "weightKg", labelPt: "Peso", labelEn: "Weight", unit: "kg", category: "corpo", getValue: (fd) => fd.weightKg ?? null },
  { key: "circAbdomenCm", labelPt: "Abdómen", labelEn: "Abdomen", unit: "cm", category: "corpo", getValue: (fd) => fd.circAbdomenCm ?? null },
  { key: "circChestCm", labelPt: "Tórax", labelEn: "Chest", unit: "cm", category: "corpo", getValue: (fd) => fd.circChestCm ?? null },
  { key: "circHipCm", labelPt: "Quadril", labelEn: "Hip", unit: "cm", category: "corpo", getValue: (fd) => fd.circHipCm ?? null },
  { key: "circArmRightCm", labelPt: "Braço (dir.)", labelEn: "Arm (right)", unit: "cm", category: "corpo", getValue: (fd) => fd.circArmRightCm ?? null },
  { key: "circBicepsRightCm", labelPt: "Bíceps (dir.)", labelEn: "Biceps (right)", unit: "cm", category: "corpo", getValue: (fd) => fd.circBicepsRightCm ?? null },
  { key: "circThighRightCm", labelPt: "Coxa (dir.)", labelEn: "Thigh (right)", unit: "cm", category: "corpo", getValue: (fd) => fd.circThighRightCm ?? null },
  { key: "circCalfRightCm", labelPt: "Panturrilha (dir.)", labelEn: "Calf (right)", unit: "cm", category: "corpo", getValue: (fd) => fd.circCalfRightCm ?? null },
  { key: "circNeckCm", labelPt: "Pescoço", labelEn: "Neck", unit: "cm", category: "corpo", getValue: (fd) => fd.circNeckCm ?? null },
  { key: "pushups1min", labelPt: "Flexões / 1 min", labelEn: "Push-ups / 1 min", unit: "reps", category: "testes", improvementDirection: "up", getValue: (fd) => fd.pushups1min ?? null },
  { key: "situps1min", labelPt: "Abdominais / 1 min", labelEn: "Sit-ups / 1 min", unit: "reps", category: "testes", improvementDirection: "up", getValue: (fd) => fd.situps1min ?? null },
  { key: "squats1min", labelPt: "Agachamentos / 1 min", labelEn: "Squats / 1 min", unit: "reps", category: "testes", improvementDirection: "up", getValue: (fd) => fd.squats1min ?? null },
  { key: "pullUps1min", labelPt: "Barras / 1 min", labelEn: "Pull-ups / 1 min", unit: "reps", category: "testes", improvementDirection: "up", getValue: (fd) => fd.pullUps1min ?? null },
  { key: "plankSeconds", labelPt: "Prancha", labelEn: "Plank", unit: "seg", category: "testes", improvementDirection: "up", getValue: (fd) => fd.plankSeconds ?? null },
  { key: "runPaceMinPerKm", labelPt: "Ritmo de corrida", labelEn: "Run pace", unit: "min/km", category: "testes", improvementDirection: "down", getValue: (fd) => getRunPaceMinPerKm(fd) },
];

export type PhysicalEvolutionRow = { assessedAt: string; formData: PhysicalAssessmentFormData };

export type PhysicalEvolutionPoint = { assessedAt: string; value: number };

/** Só devolve pontos onde o valor foi mesmo preenchido — permite fichas com dados em falta (ex.: aluno sem ténis). */
export function buildPhysicalEvolutionSeries(
  rows: PhysicalEvolutionRow[],
  metric: PhysicalEvolutionMetric
): PhysicalEvolutionPoint[] {
  return rows
    .map((r) => ({ assessedAt: r.assessedAt, value: metric.getValue(r.formData) }))
    .filter((p): p is PhysicalEvolutionPoint => typeof p.value === "number" && Number.isFinite(p.value));
}

/** Métricas com pelo menos 2 fichas com o dado preenchido — as únicas que fazem sentido comparar. */
export function getAvailablePhysicalEvolutionMetrics(rows: PhysicalEvolutionRow[]): PhysicalEvolutionMetric[] {
  return PHYSICAL_EVOLUTION_METRICS.filter((m) => buildPhysicalEvolutionSeries(rows, m).length >= 2);
}
