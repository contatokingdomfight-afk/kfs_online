import { describe, expect, it } from "vitest";
import {
  isStudentEligibleForCoachLesson,
  isStudentEligibleForCrossModalityCheckIn,
} from "./coach-lesson-eligible-students";

type Student = {
  id: string;
  userId: string;
  planId: string | null;
  primaryModality: string | null;
  status: string;
  competitionAthlete?: boolean;
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

describe("isStudentEligibleForCrossModalityCheckIn (check-in avulso)", () => {
  it("aluno Muay Thai (plano single) é elegível para check-in avulso numa aula de Boxe", () => {
    expect(isStudentEligibleForCrossModalityCheckIn(muayStudent, presencialIPlan, {})).toBe(true);
  });

  it("exclui aluno INADIMPLENTE", () => {
    expect(
      isStudentEligibleForCrossModalityCheckIn({ ...muayStudent, status: "INADIMPLENTE" }, presencialIPlan, {})
    ).toBe(false);
  });

  it("exclui aluno sem plano", () => {
    expect(isStudentEligibleForCrossModalityCheckIn({ ...muayStudent, planId: null }, undefined, {})).toBe(false);
  });

  it("exclui plano sem check-in", () => {
    expect(
      isStudentEligibleForCrossModalityCheckIn(muayStudent, { ...presencialIPlan, includes_check_in: false }, {})
    ).toBe(false);
  });

  it("aula 'só atletas' exclui aluno que não é atleta de competição", () => {
    expect(
      isStudentEligibleForCrossModalityCheckIn(muayStudent, presencialIPlan, { athletesOnly: true })
    ).toBe(false);
  });

  it("aula 'só atletas' inclui aluno marcado como atleta de competição", () => {
    expect(
      isStudentEligibleForCrossModalityCheckIn(
        { ...muayStudent, competitionAthlete: true },
        presencialIPlan,
        { athletesOnly: true }
      )
    ).toBe(true);
  });
});
