import { describe, expect, it } from "vitest";
import { isStudentEligibleForCoachLesson } from "./coach-lesson-eligible-students";

type Student = {
  id: string;
  userId: string;
  planId: string | null;
  primaryModality: string | null;
  status: string;
};

type Plan = {
  id: string;
  name: string;
  modalityScope: string | null;
  includes_check_in: boolean | null;
  isActive: boolean | null;
};

const muayStudent: Student = {
  id: "s1",
  userId: "u1",
  planId: "plan-i",
  primaryModality: "MUAY_THAI",
  status: "ATIVO",
};

const presencialIPlan: Plan = {
  id: "plan-presencial-i",
  name: "Kingdom Presencial I",
  modalityScope: "SINGLE",
  includes_check_in: true,
  isActive: true,
};

const fullPlan: Plan = {
  id: "plan-full",
  name: "Kingdom FULL",
  modalityScope: "ALL",
  includes_check_in: true,
  isActive: true,
};

describe("isStudentEligibleForCoachLesson", () => {
  it("Presencial I Muay: elegível na aula Muay Thai", () => {
    expect(
      isStudentEligibleForCoachLesson(muayStudent, presencialIPlan, {
        modality: "MUAY_THAI",
        isOpenClass: false,
      })
    ).toBe(true);
  });

  it("Presencial I Muay: não elegível na aula Boxe", () => {
    expect(
      isStudentEligibleForCoachLesson(muayStudent, presencialIPlan, {
        modality: "BOXING",
        isOpenClass: false,
      })
    ).toBe(false);
  });

  it("Presencial I Muay: elegível em aula livre de outra modalidade", () => {
    expect(
      isStudentEligibleForCoachLesson(muayStudent, presencialIPlan, {
        modality: "BOXING",
        isOpenClass: true,
      })
    ).toBe(true);
  });

  it("Kingdom FULL: elegível em qualquer modalidade", () => {
    expect(
      isStudentEligibleForCoachLesson(
        { ...muayStudent, planId: "plan-full", primaryModality: null },
        fullPlan,
        { modality: "BOXING", isOpenClass: false }
      )
    ).toBe(true);
  });

  it("exclui aluno INADIMPLENTE", () => {
    expect(
      isStudentEligibleForCoachLesson(
        { ...muayStudent, status: "INADIMPLENTE" },
        presencialIPlan,
        { modality: "MUAY_THAI", isOpenClass: false }
      )
    ).toBe(false);
  });

  it("exclui aluno sem plano", () => {
    expect(
      isStudentEligibleForCoachLesson(
        { ...muayStudent, planId: null },
        undefined,
        { modality: "MUAY_THAI", isOpenClass: false }
      )
    ).toBe(false);
  });

  it("exclui plano sem check-in", () => {
    expect(
      isStudentEligibleForCoachLesson(muayStudent, { ...presencialIPlan, includes_check_in: false }, {
        modality: "MUAY_THAI",
        isOpenClass: false,
      })
    ).toBe(false);
  });
});
