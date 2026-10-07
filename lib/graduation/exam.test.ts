import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildKingdomTemplateDraft } from "./kingdom-muay-thai-template";
import { buildExamSheet, computeExamResult, retakeAvailableFrom, reviewKey, sheetEntries, type ExamScoreInput } from "./exam";

const template = buildKingdomTemplateDraft("MUAY_THAI", "Graduação", randomUUID);

function allScores(keys: string[], score: number, examinerUserId = "u1"): ExamScoreInput[] {
  return keys.map((key) => ({ key, score, examinerUserId }));
}

describe("buildExamSheet", () => {
  it("first grade has only new items and no review", () => {
    const sheet = buildExamSheet(template.grades, 0);
    expect(sheet.newEntries).toHaveLength(template.grades[0].items.length);
    expect(sheet.previousEntries).toEqual([]);
    expect(sheet.reviewAxes).toEqual([]);
    expect(sheet.reviewCriticalEntries).toEqual([]);
  });

  it("second grade scores every item of the first grade individually, without axis review", () => {
    const sheet = buildExamSheet(template.grades, 1);
    expect(sheet.previousGradeName).toBe("Branco");
    expect(sheet.previousEntries).toHaveLength(template.grades[0].items.length);
    expect(sheet.previousEntries.every((e) => e.section === "REVIEW_ITEM" && e.gradeName === "Branco")).toBe(true);
    expect(sheet.reviewAxes).toEqual([]);
  });

  it("later grades: previous grade item by item, older grades one review score per axis", () => {
    const sheet = buildExamSheet(template.grades, 3);
    expect(sheet.previousGradeName).toBe("Laranja");
    expect(sheet.previousEntries).toHaveLength(template.grades[2].items.length);
    expect(sheet.reviewAxes.map((r) => r.entry.key)).toEqual(["review:TECNICO", "review:TATICO", "review:TEORICO", "review:FISICO"]);
    expect(sheet.reviewAxes[0].reference.map((r) => r.gradeName)).toEqual(["Branco", "Branco/Laranja"]);
  });

  it("critical items of older grades are scored individually", () => {
    const grades = template.grades.map((g, i) => (i === 0 ? { ...g, items: g.items.map((it, j) => ({ ...it, isCritical: j === 0 })) } : g));
    const sheet = buildExamSheet(grades, 2);
    expect(sheet.reviewCriticalEntries).toHaveLength(1);
    expect(sheet.reviewCriticalEntries[0]).toMatchObject({ label: "Guarda básica", gradeName: "Branco", section: "REVIEW_ITEM" });
  });
});

describe("computeExamResult", () => {
  const sheet = buildExamSheet(template.grades, 2);
  const keys = sheetEntries(sheet).map((e) => e.key);

  it("is incomplete until every entry has a score", () => {
    const r = computeExamResult(sheet, allScores(keys.slice(1), 4));
    expect(r.isComplete).toBe(false);
    expect(r.missingKeys).toEqual([keys[0]]);
    expect(r.passed).toBe(false);
  });

  it("passes when every axis reaches the minimum in new items and review", () => {
    const r = computeExamResult(sheet, allScores(keys, 3));
    expect(r.passed).toBe(true);
    expect(r.axes.every((a) => a.newPassed && a.prevPassed && a.reviewPassed)).toBe(true);
  });

  it("fails when the previous grade items of one axis average below the minimum", () => {
    const prevTatico = new Set(sheet.previousEntries.filter((e) => e.axis === "TATICO").map((e) => e.key));
    const r = computeExamResult(sheet, allScores(keys, 4).map((s) => (prevTatico.has(s.key) ? { ...s, score: 2 } : s)));
    expect(r.passed).toBe(false);
    expect(r.axes.find((a) => a.axis === "TATICO")).toMatchObject({ newPassed: true, prevPassed: false, prevAvg: 2, reviewPassed: true });
  });

  it("fails when the review of one axis is below the minimum", () => {
    const scores = allScores(keys, 4).map((s) => (s.key === reviewKey("FISICO") ? { ...s, score: 2 } : s));
    const r = computeExamResult(sheet, scores);
    expect(r.passed).toBe(false);
    expect(r.axes.find((a) => a.axis === "FISICO")).toMatchObject({ newPassed: true, reviewPassed: false, reviewScore: 2 });
  });

  it("fails on a critical item below the minimum even with a good average", () => {
    const grades = template.grades.map((g, i) => (i === 1 ? { ...g, items: g.items.map((it, j) => ({ ...it, isCritical: j === 0 })) } : g));
    const s = buildExamSheet(grades, 1);
    const k = sheetEntries(s).map((e) => e.key);
    const r = computeExamResult(s, allScores(k, 5).map((x) => (x.key === k[0] ? { ...x, score: 2 } : x)));
    expect(r.axes.find((a) => a.axis === "TECNICO")?.newPassed).toBe(true);
    expect(r.criticalFailures).toEqual([{ key: k[0], label: "Hook", score: 2 }]);
    expect(r.passed).toBe(false);
  });

  it("averages scores across examiners", () => {
    const scores = [...allScores(keys, 2, "u1"), ...allScores(keys, 4, "u2")];
    const r = computeExamResult(sheet, scores);
    expect(r.examinerCount).toBe(2);
    expect(r.axes[0].newAvg).toBe(3);
    expect(r.passed).toBe(true);
  });
});

describe("retakeAvailableFrom", () => {
  it("is two months after the failed exam", () => {
    expect(retakeAvailableFrom(new Date("2026-10-07T10:00:00Z")).toISOString()).toBe("2026-12-07T10:00:00.000Z");
  });
});
