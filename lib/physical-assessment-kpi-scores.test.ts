import { describe, expect, it } from "vitest";
import { extractPhysicalKpiScores, PHYSICAL_KPI_DEFS } from "./physical-assessment-kpi-scores";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";

describe("extractPhysicalKpiScores", () => {
  it("returns null for null/undefined input", () => {
    expect(extractPhysicalKpiScores(null)).toBeNull();
    expect(extractPhysicalKpiScores(undefined)).toBeNull();
  });

  it("returns null when no score field is filled in", () => {
    expect(extractPhysicalKpiScores({} as Partial<PhysicalAssessmentFormData>)).toBeNull();
  });

  it("returns all six keys, defaulting unfilled ones to null, when at least one score is present", () => {
    const result = extractPhysicalKpiScores({ scoreStrength: 8 } as Partial<PhysicalAssessmentFormData>);
    expect(result).toEqual({
      scoreStrength: 8,
      scoreEndurance: null,
      scoreSpeed: null,
      scoreCondition: null,
      scoreMobility: null,
      scoreCoordination: null,
    });
  });

  it("passes through every score when all are filled in", () => {
    const fd = {
      scoreStrength: 7,
      scoreEndurance: 6,
      scoreSpeed: 5,
      scoreCondition: 9,
      scoreMobility: 4,
      scoreCoordination: 8,
    } as Partial<PhysicalAssessmentFormData>;
    expect(extractPhysicalKpiScores(fd)).toEqual(fd);
  });

  it("treats a score of 0 as present, not as missing", () => {
    const result = extractPhysicalKpiScores({ scoreStrength: 0 } as Partial<PhysicalAssessmentFormData>);
    expect(result).not.toBeNull();
    expect(result!.scoreStrength).toBe(0);
  });
});

describe("PHYSICAL_KPI_DEFS", () => {
  it("has one definition per PhysicalKpiKey, in the documented display order", () => {
    expect(PHYSICAL_KPI_DEFS.map((d) => d.key)).toEqual([
      "scoreStrength",
      "scoreEndurance",
      "scoreSpeed",
      "scoreCondition",
      "scoreMobility",
      "scoreCoordination",
    ]);
  });

  it("every definition has non-empty pt/en labels and tooltips", () => {
    for (const def of PHYSICAL_KPI_DEFS) {
      expect(def.labelPt.length).toBeGreaterThan(0);
      expect(def.labelEn.length).toBeGreaterThan(0);
      expect(def.tooltipPt.length).toBeGreaterThan(0);
      expect(def.tooltipEn.length).toBeGreaterThan(0);
    }
  });
});
