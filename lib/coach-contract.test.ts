import { describe, expect, it } from "vitest";
import {
  COACH_CONTRACT_VERSION,
  isValidPtNif,
  normalizeIban,
  renderCoachAdhesionTerm,
  renderCoachContract,
  scheduleLines,
  schoolsMissingSignature,
  sectionsToText,
  validateCoachPrivateData,
  type CoachContractFields,
} from "./coach-contract";

const FIELDS: CoachContractFields = {
  school: { name: "Escola Teste", legalName: "Teste Lda", nif: "509999999", legalAddress: "Rua A, 1, Sintra" },
  directorName: "Diretor Exemplo",
  coach: { legalName: "Rui Exemplo", nif: "123456789", idDocumentNumber: null, address: "Rua B, 2, Sintra", tptdNumber: "T-123" },
  modalities: ["Muay Thai", "Boxe", "Muay Thai KIDS"],
  date: "2026-11-25",
  schedule: [
    { weekday: 3, startTime: "19:00:00", endTime: "20:00:00", modality: "Boxe", location: "Sala 1" },
    { weekday: 1, startTime: "18:00:00", endTime: "19:00:00", modality: "Muay Thai", location: "" },
  ],
};

describe("isValidPtNif", () => {
  it("aceita NIF com dígito de controlo certo", () => {
    expect(isValidPtNif("123456789")).toBe(true);
    expect(isValidPtNif("123 456 789")).toBe(true);
  });
  it("recusa dígito de controlo errado ou formato errado", () => {
    expect(isValidPtNif("123456780")).toBe(false);
    expect(isValidPtNif("12345678")).toBe(false);
    expect(isValidPtNif("abcdefghi")).toBe(false);
  });
});

describe("normalizeIban", () => {
  it("aceita IBAN válido e normaliza espaços/minúsculas", () => {
    expect(normalizeIban("pt50 0002 0123 1234 5678 9015 4")).toBe("PT50000201231234567890154");
    expect(normalizeIban("GB82 WEST 1234 5698 7654 32")).toBe("GB82WEST12345698765432");
  });
  it("recusa controlo errado", () => {
    expect(normalizeIban("PT50000201231234567890155")).toBeNull();
    expect(normalizeIban("123")).toBeNull();
  });
});

describe("validateCoachPrivateData", () => {
  const base: Record<string, string> = {
    legalName: "Rui Miguel Exemplo",
    nif: "123456789",
    address: "Rua Exemplo 12, Sintra",
    iban: "PT50000201231234567890154",
    tptdNumber: "T-123",
    tptdValidUntil: "2028-12-31",
    selfEmployed: "on",
  };
  const run = (over: Record<string, string | undefined> = {}) =>
    validateCoachPrivateData((k) => ({ ...base, ...over })[k], "2026-11-25");

  it("aceita dados completos", () => {
    const r = run();
    expect(r.error).toBeUndefined();
    expect(r.data?.iban).toBe("PT50000201231234567890154");
    expect(r.data?.idDocumentNumber).toBeNull();
  });
  it("exige nome completo, NIF, morada, IBAN e TPTD", () => {
    expect(run({ legalName: "Rui" }).error).toBeTruthy();
    expect(run({ nif: "123456780" }).error).toBeTruthy();
    expect(run({ address: "Rua" }).error).toBeTruthy();
    expect(run({ iban: "PT00" }).error).toBeTruthy();
    expect(run({ tptdNumber: "" }).error).toBeTruthy();
  });
  it("recusa TPTD caducado e falta de atividade aberta", () => {
    expect(run({ tptdValidUntil: "2026-11-24" }).error).toBeTruthy();
    expect(run({ selfEmployed: undefined }).error).toBeTruthy();
  });
});

describe("texto do contrato", () => {
  it("preenche escola, professor, modalidades e data", () => {
    const text = sectionsToText(renderCoachContract(FIELDS));
    expect(text).toContain("Teste Lda, NIPC 509999999");
    expect(text).toContain("Rui Exemplo, NIF 123456789");
    expect(text).not.toContain("portador do CC");
    expect(text).toContain("Muay Thai, Boxe e Muay Thai KIDS");
    expect(text).toContain("25/11/2026");
    expect(text).toContain("total autonomia na forma de lecionar");
    expect(text).toContain("35% do valor-base por cada modalidade");
    expect(text).toContain("Lisboa Oeste");
    expect(text).not.toContain("{{");
  });
  it("termo de adesão com o nome da escola", () => {
    expect(sectionsToText(renderCoachAdhesionTerm(FIELDS))).toContain("Código de Conduta da Escola Teste");
  });
  it("Anexo I ordenado por dia e hora", () => {
    expect(scheduleLines(FIELDS.schedule)).toEqual(["Segunda · 18:00–19:00 · Muay Thai", "Quarta · 19:00–20:00 · Boxe · Sala 1"]);
    expect(scheduleLines([])[0]).toContain("Sem aulas atribuídas");
  });
});

describe("schoolsMissingSignature", () => {
  it("só conta a versão atual e exige os dois documentos", () => {
    const signed = [
      { schoolId: "a", documentType: "CONTRACT", documentVersion: COACH_CONTRACT_VERSION },
      { schoolId: "a", documentType: "ADHESION_TERM", documentVersion: COACH_CONTRACT_VERSION },
      { schoolId: "b", documentType: "CONTRACT", documentVersion: COACH_CONTRACT_VERSION },
      { schoolId: "c", documentType: "CONTRACT", documentVersion: "velha" },
      { schoolId: "c", documentType: "ADHESION_TERM", documentVersion: "velha" },
    ];
    expect(schoolsMissingSignature(["a", "b", "c", "d"], signed)).toEqual(["b", "c", "d"]);
  });
});
