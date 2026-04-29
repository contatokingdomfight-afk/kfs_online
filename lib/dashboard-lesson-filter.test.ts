import { describe, expect, it } from "vitest";
import {
  filterDashboardLessonsByPlanModality,
  filterLessonsForDashboard,
} from "./dashboard-lesson-filter";

const MOD_LEN = 3;

const base = () => ({
  hasPlan: true,
  hasCheckIn: true,
  allowedModalities: ["MUAY_THAI"],
  studentPrimaryModality: "MUAY_THAI" as string | null,
  modalitiesListLength: MOD_LEN,
});

describe("filterLessonsForDashboard", () => {
  it("inclui sempre aulas livres (open class) mesmo sem plano", () => {
    const lessons = [
      { modality: "BOXING", isOpenClass: false },
      { modality: "MUAY_THAI", isOpenClass: true },
    ];
    const out = filterLessonsForDashboard(lessons, {
      ...base(),
      hasPlan: false,
      hasCheckIn: false,
      allowedModalities: [],
    });
    expect(out).toHaveLength(1);
    expect(out[0].isOpenClass).toBe(true);
  });

  it("sem plano: não inclui aulas normais", () => {
    const lessons = [{ modality: "MUAY_THAI", isOpenClass: false }];
    const out = filterLessonsForDashboard(lessons, {
      ...base(),
      hasPlan: false,
      hasCheckIn: false,
      allowedModalities: [],
    });
    expect(out).toHaveLength(0);
  });

  it("com plano e check-in: modalidade única filtra por primaryModality", () => {
    const lessons = [
      { modality: "BOXING", isOpenClass: false },
      { modality: "MUAY_THAI", isOpenClass: false },
    ];
    const out = filterLessonsForDashboard(lessons, {
      ...base(),
      allowedModalities: ["MUAY_THAI"],
      studentPrimaryModality: "MUAY_THAI",
    });
    expect(out.map((l) => l.modality)).toEqual(["MUAY_THAI"]);
  });

  it("plano full: vê todas as modalidades da lista", () => {
    const lessons = [
      { modality: "BOXING", isOpenClass: false },
      { modality: "MUAY_THAI", isOpenClass: false },
    ];
    const out = filterLessonsForDashboard(lessons, {
      ...base(),
      allowedModalities: ["MUAY_THAI", "BOXING", "KICKBOXING"],
    });
    expect(out).toHaveLength(2);
  });

  it("sem check-in no plano: só aulas livres entram", () => {
    const lessons = [
      { modality: "MUAY_THAI", isOpenClass: false },
      { modality: "BOXING", isOpenClass: true },
    ];
    const out = filterLessonsForDashboard(lessons, {
      ...base(),
      hasCheckIn: false,
    });
    expect(out.map((l) => l.modality)).toEqual(["BOXING"]);
  });
});

describe("filterDashboardLessonsByPlanModality (Presencial I: lista de cartões)", () => {
  const single = {
    hasPlan: true,
    allowedModalities: ["MUAY_THAI"],
    studentPrimaryModality: "MUAY_THAI" as string | null,
  };

  it("inclui aula livre de outra modalidade; exclui aula fechada de outra modalidade", () => {
    const lessons = [
      { modality: "BOXING", isOpenClass: false, id: "1" },
      { modality: "BOXING", isOpenClass: true, id: "2" },
      { modality: "MUAY_THAI", isOpenClass: false, id: "3" },
    ];
    const out = filterDashboardLessonsByPlanModality(lessons, single);
    expect(out.map((l) => l.id).sort()).toEqual(["2", "3"]);
  });

  it("plano com várias modalidades: não restringe à lista (pass-through)", () => {
    const lessons = [{ modality: "BOXING", isOpenClass: false, id: "1" }];
    const out = filterDashboardLessonsByPlanModality(lessons, {
      hasPlan: true,
      allowedModalities: ["MUAY_THAI", "BOXING"],
      studentPrimaryModality: "MUAY_THAI",
    });
    expect(out).toEqual(lessons);
  });
});
