import { describe, expect, it } from "vitest";
import {
  PHYSICAL_EVOLUTION_METRICS,
  buildPhysicalEvolutionSeries,
  getAvailablePhysicalEvolutionMetrics,
  type PhysicalEvolutionRow,
} from "./physical-assessment-evolution";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";

function fd(overrides: Partial<PhysicalAssessmentFormData>): PhysicalAssessmentFormData {
  return overrides as PhysicalAssessmentFormData;
}

function row(assessedAt: string, overrides: Partial<PhysicalAssessmentFormData>): PhysicalEvolutionRow {
  return { assessedAt, formData: fd(overrides) };
}

const weightMetric = PHYSICAL_EVOLUTION_METRICS.find((m) => m.key === "weightKg")!;
const runPaceMetric = PHYSICAL_EVOLUTION_METRICS.find((m) => m.key === "runPaceMinPerKm")!;

describe("buildPhysicalEvolutionSeries", () => {
  it("returns one point per row that has the metric filled in", () => {
    const rows = [row("2026-01-01", { weightKg: 80 }), row("2026-02-01", { weightKg: 78 })];
    expect(buildPhysicalEvolutionSeries(rows, weightMetric)).toEqual([
      { assessedAt: "2026-01-01", value: 80 },
      { assessedAt: "2026-02-01", value: 78 },
    ]);
  });

  it("skips rows where the metric is missing (e.g. aluno sem ténis)", () => {
    const rows = [
      row("2026-01-01", { weightKg: 80 }),
      row("2026-02-01", { weightKg: null }),
      row("2026-03-01", {}),
    ];
    expect(buildPhysicalEvolutionSeries(rows, weightMetric)).toEqual([{ assessedAt: "2026-01-01", value: 80 }]);
  });

  it("computes run pace via getRunPaceMinPerKm (legacy meters fallback included)", () => {
    const rows = [
      row("2026-01-01", { runPaceMinPerKm: 6.5 }),
      row("2026-02-01", { runDistance1minMeters: 200 }), // legacy: 1000/200 = 5 min/km
    ];
    const series = buildPhysicalEvolutionSeries(rows, runPaceMetric);
    expect(series).toEqual([
      { assessedAt: "2026-01-01", value: 6.5 },
      { assessedAt: "2026-02-01", value: 5 },
    ]);
  });

  it("returns an empty array when no rows have the metric", () => {
    const rows = [row("2026-01-01", {}), row("2026-02-01", {})];
    expect(buildPhysicalEvolutionSeries(rows, weightMetric)).toEqual([]);
  });
});

describe("getAvailablePhysicalEvolutionMetrics", () => {
  it("excludes metrics with fewer than 2 filled points", () => {
    const rows = [row("2026-01-01", { weightKg: 80, circAbdomenCm: 90 }), row("2026-02-01", { weightKg: 78 })];
    const available = getAvailablePhysicalEvolutionMetrics(rows);
    expect(available.map((m) => m.key)).toContain("weightKg");
    expect(available.map((m) => m.key)).not.toContain("circAbdomenCm");
  });

  it("returns no metrics when fewer than 2 fichas exist", () => {
    const rows = [row("2026-01-01", { weightKg: 80 })];
    expect(getAvailablePhysicalEvolutionMetrics(rows)).toEqual([]);
  });

  it("returns every metric when all have >= 2 filled fichas", () => {
    const both: Partial<PhysicalAssessmentFormData> = {
      weightKg: 80,
      circAbdomenCm: 90,
      circChestCm: 100,
      circHipCm: 95,
      circArmRightCm: 30,
      circBicepsRightCm: 32,
      circThighRightCm: 55,
      circCalfRightCm: 36,
      circNeckCm: 38,
      pushups1min: 20,
      situps1min: 25,
      squats1min: 30,
      pullUps1min: 5,
      plankSeconds: 60,
      runPaceMinPerKm: 6,
    };
    const rows = [row("2026-01-01", both), row("2026-02-01", both)];
    const available = getAvailablePhysicalEvolutionMetrics(rows);
    expect(available.length).toBe(PHYSICAL_EVOLUTION_METRICS.length);
  });
});
