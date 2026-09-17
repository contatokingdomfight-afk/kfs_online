import { describe, expect, it } from "vitest";
import { computeEvolutionScore, type DatedEvaluation } from "./rank-evolution";
import type { ModalityConfig } from "./performance-utils";

const noConfig = new Map<string, ModalityConfig>();

function legacyEval(createdAt: string, value: number): DatedEvaluation {
  return { createdAt, gas: value, technique: value, strength: value, theory: value };
}

describe("computeEvolutionScore", () => {
  it("returns null delta when there are no evaluations", () => {
    const result = computeEvolutionScore([], noConfig, "2026-01-01", "2026-01-31");
    expect(result).toEqual({ baselineScore: null, latestScore: null, delta: null });
  });

  it("uses the evaluation at or before periodStart as baseline, and improves toward periodEnd", () => {
    const evaluations: DatedEvaluation[] = [
      legacyEval("2025-12-01T00:00:00.000Z", 1), // baseline candidate (before period)
      legacyEval("2026-01-15T00:00:00.000Z", 5), // inside period → latest
    ];
    const result = computeEvolutionScore(evaluations, noConfig, "2026-01-01", "2026-01-31");
    expect(result.baselineScore).toBe(2); // legacy 1 → scale1to10 doubles to 2
    expect(result.latestScore).toBe(10); // legacy 5 → capped at 10
    expect(result.delta).toBe(8);
  });

  it("falls back to the earliest available evaluation when none exists before periodStart", () => {
    const evaluations: DatedEvaluation[] = [
      legacyEval("2026-01-05T00:00:00.000Z", 1), // only evaluation is inside the period
      legacyEval("2026-01-20T00:00:00.000Z", 3),
    ];
    const result = computeEvolutionScore(evaluations, noConfig, "2026-01-01", "2026-01-31");
    expect(result.baselineScore).toBe(2); // fallback to earliest (value 1 → 2)
    expect(result.latestScore).toBe(6); // value 3 → 6
    expect(result.delta).toBe(4);
  });

  it("returns null delta when there is no evaluation at or before periodEnd", () => {
    const evaluations: DatedEvaluation[] = [legacyEval("2026-02-15T00:00:00.000Z", 5)];
    const result = computeEvolutionScore(evaluations, noConfig, "2026-01-01", "2026-01-31");
    expect(result.latestScore).toBeNull();
    expect(result.delta).toBeNull();
  });

  it("handles a negative delta (decline)", () => {
    const evaluations: DatedEvaluation[] = [
      legacyEval("2025-12-01T00:00:00.000Z", 5),
      legacyEval("2026-01-15T00:00:00.000Z", 1),
    ];
    const result = computeEvolutionScore(evaluations, noConfig, "2026-01-01", "2026-01-31");
    expect(result.delta).toBe(-8);
  });

  it("accepts evaluations in arbitrary order (sorts internally)", () => {
    const evaluations: DatedEvaluation[] = [
      legacyEval("2026-01-15T00:00:00.000Z", 5),
      legacyEval("2025-12-01T00:00:00.000Z", 1),
    ];
    const result = computeEvolutionScore(evaluations, noConfig, "2026-01-01", "2026-01-31");
    expect(result.delta).toBe(8);
  });
});
