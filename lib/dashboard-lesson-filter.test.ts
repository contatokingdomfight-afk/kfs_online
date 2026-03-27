import { describe, expect, it } from "vitest";
import { filterLessonsForDashboard } from "./dashboard-lesson-filter";

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
