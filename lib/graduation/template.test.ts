import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  accumulatedMonths,
  normalizeTemplateDraft,
  parsePastedItemLabels,
  templatePublishWarnings,
} from "./template";
import { buildKingdomTemplateDraft, KINGDOM_MUAY_THAI_GRADES } from "./kingdom-muay-thai-template";

const gid = "grade-00000001";

function baseDraft(overrides: Record<string, unknown> = {}) {
  return {
    modalityCode: "MUAY_THAI",
    name: "Graduação Muay Thai",
    isPublished: false,
    monthlyMinAttendances: 4,
    grades: [
      {
        id: gid,
        name: "Branco",
        colors: ["#f5f5f5"],
        minMonths: 3,
        passMinAxisAvg: 3,
        items: [{ id: "item-00000001", axis: "TECNICO", label: " Jab ", description: "", isCritical: true }],
        courses: [],
        requirements: [],
      },
    ],
    ...overrides,
  };
}

describe("accumulatedMonths", () => {
  it("sums minimum months up to each grade", () => {
    expect(accumulatedMonths([{ minMonths: 3 }, { minMonths: 3 }, { minMonths: 4 }])).toEqual([3, 6, 10]);
  });

  it("matches the Kingdom document accumulated times", () => {
    expect(accumulatedMonths(KINGDOM_MUAY_THAI_GRADES)).toEqual([3, 6, 10, 15, 21, 27, 35, 43, 55, 79]);
  });
});

describe("parsePastedItemLabels", () => {
  it("strips bullets, numbering, trailing punctuation and blank lines", () => {
    expect(parsePastedItemLabels("- Jab.\n\n• Direto\n3) Frontal / Teep;\n  ")).toEqual(["Jab", "Direto", "Frontal / Teep"]);
  });
});

describe("normalizeTemplateDraft", () => {
  it("trims text, uppercases colors and nulls empty descriptions", () => {
    const res = normalizeTemplateDraft(baseDraft());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const grade = res.draft.grades[0];
    expect(grade.colors).toEqual(["#F5F5F5"]);
    expect(grade.items[0]).toEqual({ id: "item-00000001", axis: "TECNICO", label: "Jab", description: null, isCritical: true });
  });

  it("drops items without label and invalid colors", () => {
    const draft = baseDraft();
    draft.grades[0].items.push({ id: "item-00000002", axis: "TATICO", label: "  ", description: "", isCritical: false });
    draft.grades[0].colors.push("red");
    const res = normalizeTemplateDraft(draft);
    expect(res.ok && res.draft.grades[0].items).toHaveLength(1);
    expect(res.ok && res.draft.grades[0].colors).toEqual(["#F5F5F5"]);
  });

  it("clamps numeric fields into range", () => {
    const draft = baseDraft();
    Object.assign(draft.grades[0], { minMonths: -2, minPerformanceAvg: 12, passMinAxisAvg: 0, minAttendances: "" });
    const res = normalizeTemplateDraft(draft);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.draft.grades[0]).toMatchObject({ minMonths: 0, minPerformanceAvg: 10, passMinAxisAvg: 1, minAttendances: null });
  });

  it("rejects a grade without name", () => {
    const draft = baseDraft();
    draft.grades[0].name = "";
    expect(normalizeTemplateDraft(draft)).toEqual({ ok: false, error: "Grau 1: o nome é obrigatório." });
  });

  it("rejects duplicated ids", () => {
    const draft = baseDraft();
    draft.grades[0].items[0].id = gid;
    expect(normalizeTemplateDraft(draft).ok).toBe(false);
  });

  it("rejects an unknown axis", () => {
    const draft = baseDraft();
    draft.grades[0].items[0].axis = "MENTAL";
    expect(normalizeTemplateDraft(draft).ok).toBe(false);
  });

  it("dedupes courses and defaults isRequired to true", () => {
    const draft = baseDraft();
    (draft.grades[0].courses as unknown[]).push({ courseId: "c1" }, { courseId: "c1", isRequired: false });
    const res = normalizeTemplateDraft(draft);
    expect(res.ok && res.draft.grades[0].courses).toEqual([{ courseId: "c1", isRequired: true }]);
  });
});

describe("Kingdom Muay Thai template", () => {
  const draft = buildKingdomTemplateDraft("MUAY_THAI", "Graduação Kingdom", randomUUID);

  it("has the 10 grades with items in all 4 axes", () => {
    expect(draft.grades).toHaveLength(10);
    expect(templatePublishWarnings(draft)).toEqual([]);
  });

  it("passes normalization unchanged", () => {
    const res = normalizeTemplateDraft(draft);
    expect(res.ok && res.draft).toEqual(draft);
  });
});
