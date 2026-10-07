import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildKingdomTemplateDraft } from "./kingdom-muay-thai-template";
import { averageEvaluationScores, computeStudentProgress, countQualifyingMonths, type StudentProgressInput } from "./progress";

const template = buildKingdomTemplateDraft("MUAY_THAI", "Graduação", randomUUID);
const NOW = new Date("2026-10-07T12:00:00Z");

/** `perMonth` presenças em cada um dos `months` meses anteriores a `end`. */
function attendances(months: number, perMonth: number, end = NOW): Date[] {
  const out: Date[] = [];
  for (let m = 0; m < months; m++) {
    for (let i = 0; i < perMonth; i++) {
      out.push(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - m, 1 + i)));
    }
  }
  return out;
}

function input(overrides: Partial<StudentProgressInput> = {}): StudentProgressInput {
  return {
    grades: template.grades,
    monthlyMinAttendances: 4,
    currentGradeIndex: -1,
    lastAwardedAt: null,
    attendanceDates: [],
    performanceAvg: null,
    performanceEvaluationCount: 0,
    lastPhysicalAssessmentAt: null,
    completedCourseIds: new Set(),
    courseNames: new Map(),
    fulfilledRequirementIds: new Set(),
    now: NOW,
    ...overrides,
  };
}

describe("countQualifyingMonths", () => {
  it("counts only months with the minimum number of attendances", () => {
    const dates = [...attendances(2, 4), ...attendances(1, 3, new Date("2026-05-15T00:00:00Z"))];
    expect(countQualifyingMonths(dates, 4)).toBe(2);
    expect(countQualifyingMonths(dates, 3)).toBe(3);
  });

  it("ignores attendances before `since`", () => {
    expect(countQualifyingMonths(attendances(3, 4), 4, new Date("2026-09-01T00:00:00Z"))).toBe(2);
  });
});

describe("computeStudentProgress", () => {
  it("a student without grade aims for the first grade", () => {
    const p = computeStudentProgress(input());
    expect(p.current).toBeNull();
    expect(p.next?.name).toBe("Branco");
    expect(p.reviewGrades).toEqual([]);
    expect(p.checks.map((c) => c.key)).toEqual(["time", "physical"]);
    expect(p.isReadyForExam).toBe(false);
  });

  it("is ready for the first exam with 3 qualifying months and a recent physical assessment", () => {
    const p = computeStudentProgress(
      input({ attendanceDates: attendances(3, 4), lastPhysicalAssessmentAt: new Date("2026-08-01T00:00:00Z") })
    );
    expect(p.isReadyForExam).toBe(true);
    expect(p.doneCount).toBe(2);
  });

  it("flags an outdated physical assessment", () => {
    const p = computeStudentProgress(
      input({ attendanceDates: attendances(3, 4), lastPhysicalAssessmentAt: new Date("2025-12-01T00:00:00Z") })
    );
    const physical = p.checks.find((c) => c.key === "physical");
    expect(physical?.status).toBe("pending");
    expect(physical?.href).toBe("/dashboard/ficha-fisica");
  });

  it("exam is cumulative: review includes every previous grade, newest first", () => {
    const p = computeStudentProgress(input({ currentGradeIndex: 2, lastAwardedAt: new Date("2026-01-01T00:00:00Z") }));
    expect(p.next?.name).toBe("Laranja/Azul Celeste");
    expect(p.reviewGrades.map((g) => g.gradeName)).toEqual(["Laranja", "Branco/Laranja", "Branco"]);
  });

  it("requires both time since last grade and accumulated time", () => {
    // Laranja (índice 2) → Laranja/Azul Celeste: 5 meses desde o grau, 15 acumulados.
    const p = computeStudentProgress(
      input({
        currentGradeIndex: 2,
        lastAwardedAt: new Date("2026-05-01T00:00:00Z"),
        attendanceDates: attendances(6, 4),
      })
    );
    const time = p.checks.find((c) => c.key === "time");
    const acc = p.checks.find((c) => c.key === "accumulated");
    expect(time).toMatchObject({ status: "done", detail: "5 de 5 meses" });
    expect(acc).toMatchObject({ status: "pending", detail: "6 de 15 meses" });
  });

  it("checks attendances, performance, courses and manual requirements of the next grade", () => {
    const grades = template.grades.map((g, i) =>
      i === 0
        ? {
            ...g,
            minAttendances: 10,
            minPerformanceAvg: 6,
            courses: [
              { courseId: "c-req", isRequired: true },
              { courseId: "c-rec", isRequired: false },
            ],
            requirements: [{ id: "r1", label: "Estágio" }],
          }
        : g
    );
    const p = computeStudentProgress(
      input({
        grades,
        attendanceDates: attendances(3, 4),
        performanceAvg: 6.5,
        performanceEvaluationCount: 4,
        lastPhysicalAssessmentAt: NOW,
        completedCourseIds: new Set(["c-req"]),
        courseNames: new Map([["c-req", "Fundamentos"], ["c-rec", "Extra"]]),
      })
    );
    expect(p.checks.map((c) => [c.key, c.status])).toEqual([
      ["time", "done"],
      ["attendances", "done"],
      ["performance", "done"],
      ["physical", "done"],
      ["course:c-req", "done"],
      ["requirement:r1", "pending"],
    ]);
    expect(p.recommendedCourses).toEqual([{ courseId: "c-rec", name: "Extra", completed: false }]);
    expect(p.isReadyForExam).toBe(false);
  });

  it("credits accumulated time up to a migrated grade", () => {
    // Roxo (índice 6) atribuído por migração hoje: o acumulado até Roxo (35 meses) conta como cumprido.
    const base = { currentGradeIndex: 6, lastAwardedAt: new Date("2026-01-01T00:00:00Z"), attendanceDates: attendances(8, 4) };
    const migrated = computeStudentProgress(input({ ...base, currentGradeSource: "MIGRATION" }));
    expect(migrated.checks.find((c) => c.key === "accumulated")).toMatchObject({ status: "done", detail: "43 de 43 meses" });
    const byExam = computeStudentProgress(input({ ...base, currentGradeSource: "EXAM" }));
    expect(byExam.checks.find((c) => c.key === "accumulated")).toMatchObject({ status: "pending", detail: "8 de 43 meses" });
  });

  it("blocks a retake until two months after a failed exam", () => {
    const base = { attendanceDates: attendances(3, 4), lastPhysicalAssessmentAt: NOW };
    const blocked = computeStudentProgress(input({ ...base, lastFailedExamAt: new Date("2026-09-01T00:00:00Z") }));
    expect(blocked.checks[0]).toMatchObject({ key: "retake", status: "pending" });
    expect(blocked.isReadyForExam).toBe(false);
    const allowed = computeStudentProgress(input({ ...base, lastFailedExamAt: new Date("2026-07-01T00:00:00Z") }));
    expect(allowed.checks[0]).toMatchObject({ key: "retake", status: "done" });
    expect(allowed.isReadyForExam).toBe(true);
  });

  it("has no next grade at the top of the template", () => {
    const p = computeStudentProgress(input({ currentGradeIndex: 9, lastAwardedAt: NOW }));
    expect(p.current?.name).toBe("Preto/Prata/Branco/Vermelho");
    expect(p.next).toBeNull();
    expect(p.isReadyForExam).toBe(false);
  });
});

describe("averageEvaluationScores", () => {
  it("averages numeric criterion scores and ignores invalid values", () => {
    expect(averageEvaluationScores([{ scores: { a: 4, b: 6 } }, { scores: { c: 8, d: "x", e: 0 } }])).toBe(6);
    expect(averageEvaluationScores([{ scores: null }])).toBeNull();
  });
});
