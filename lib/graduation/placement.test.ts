import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildKingdomTemplateDraft } from "./kingdom-muay-thai-template";
import { computePlacementResult, placementMaxIndex, placementSheet } from "./placement";
import type { ExamScoreInput } from "./exam";

const grades = buildKingdomTemplateDraft("MUAY_THAI", "Graduação", randomUUID).grades;

function scoreGrade(index: number, score: number): ExamScoreInput[] {
  return grades[index].items.map((i) => ({ key: i.id, score, examinerUserId: "coach" }));
}

describe("computePlacementResult", () => {
  it("proposes the last grade passed in a row", () => {
    const scores = [...scoreGrade(0, 5), ...scoreGrade(1, 5), ...scoreGrade(2, 1)];
    const r = computePlacementResult(grades, 0, 2, scores);
    expect(r.levels.map((l) => l.result.passed)).toEqual([true, true, false]);
    expect(r.proposedIndex).toBe(1);
    expect(r.frontierPassed).toBe(false);
  });

  it("proposes no new grade when the first level fails", () => {
    const r = computePlacementResult(grades, 0, 0, scoreGrade(0, 1));
    expect(r.proposedIndex).toBe(-1);
  });

  it("allows advancing once the current level is complete and passed", () => {
    const r = computePlacementResult(grades, 0, 0, scoreGrade(0, 5));
    expect(r.frontierPassed).toBe(true);
    expect(r.proposedIndex).toBe(0);
  });
});

describe("placementSheet", () => {
  it("contains every item of the evaluated grades once", () => {
    const sheet = placementSheet(grades, 0, 1);
    expect(sheet.newEntries.length).toBe(grades[0].items.length + grades[1].items.length);
    expect(sheet.targetGrade.id).toBe(grades[1].id);
  });
});

describe("placementMaxIndex", () => {
  it("defaults to the top grade", () => {
    expect(placementMaxIndex(grades, null)).toBe(grades.length - 1);
    expect(placementMaxIndex(grades, grades[3].id)).toBe(3);
  });
});
