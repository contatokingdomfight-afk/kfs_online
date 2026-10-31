import { describe, expect, it } from "vitest";
import { membershipAgreementHtml, parseContractParty, signatureHistoryWith, waiverHtml, type ContractParty } from "./contract-party";
import { isMembershipAgreementCurrent } from "./insurance-settings";
import { MEMBERSHIP_AGREEMENT_BODY_PT } from "./membership-agreement-content";
import { SEDE_SCHOOL_ID } from "./school-payment-rules";
import { withSchoolName } from "./school-name-text";
import { WAIVER_BODY_PT } from "./waiver-content";

const PARTY: ContractParty = {
  schoolId: "escola-2",
  name: "PM Team Algés",
  legalName: "Algés & Filhos, Lda",
  nif: "500000000",
  legalAddress: "Rua Exemplo 1, 1495-000 Algés",
  signatures: [],
};

describe("texto da Sede", () => {
  it("sem escola guardada, é exatamente o texto original", () => {
    expect(membershipAgreementHtml(null)).toBe(MEMBERSHIP_AGREEMENT_BODY_PT);
    expect(waiverHtml(null)).toBe(WAIVER_BODY_PT);
    expect(MEMBERSHIP_AGREEMENT_BODY_PT).toContain("EPICENTRO DE HONRA - LDA, pessoa coletiva n.º 519296850");
    expect(withSchoolName("sócio da Kingdom Fight School", "Kingdom Fight School")).toBe("sócio da Kingdom Fight School");
  });
});

describe("texto de outra escola", () => {
  const contract = membershipAgreementHtml(PARTY);
  const waiver = waiverHtml(PARTY);

  it("não deixa nenhuma referência à Sede", () => {
    for (const html of [contract, waiver]) {
      expect(html).not.toContain("Kingdom Fight School");
      expect(html).not.toMatch(/epicentro/i);
      expect(html).not.toContain("519296850");
      expect(html).not.toContain("Algueirão");
    }
  });

  it("identifica a entidade da escola na cláusula 1, com o HTML escapado", () => {
    expect(contract).toContain("Algés &amp; Filhos, Lda, pessoa coletiva n.º 500000000, com sede em Rua Exemplo 1, 1495-000 Algés, doravante designada por PM Team Algés");
    expect(membershipAgreementHtml({ ...PARTY, name: "<b>X</b>" })).toContain("&lt;b&gt;X&lt;/b&gt;");
  });

  it("não muda mais nenhuma palavra das cláusulas", () => {
    const back = contract
      .split("Algés &amp; Filhos, Lda, pessoa coletiva n.º 500000000, com sede em Rua Exemplo 1, 1495-000 Algés")
      .join("EPICENTRO DE HONRA - LDA, pessoa coletiva n.º 519296850, com sede em Praceta Laura Alves 8, 2725-206 Algueirão-Mem Martins")
      .split("PM Team Algés")
      .join("Kingdom Fight School");
    expect(back).toBe(MEMBERSHIP_AGREEMENT_BODY_PT);
  });

  it("sem nome conhecido usa o termo neutro, nunca a Sede", () => {
    expect(withSchoolName("sócio da Kingdom Fight School", null)).toBe("sócio da Academia");
  });
});

describe("parseContractParty", () => {
  it("rejeita dados incompletos", () => {
    expect(parseContractParty(null)).toBeNull();
    expect(parseContractParty({ schoolId: "x" })).toBeNull();
    expect(parseContractParty(PARTY)).toEqual(PARTY);
  });
});

describe("isMembershipAgreementCurrent por escola", () => {
  const signed = { agreementSigned: true, agreementVersion: "1" };

  it("a Sede continua igual, incluindo contratos antigos", () => {
    expect(isMembershipAgreementCurrent(signed, "1", SEDE_SCHOOL_ID)).toBe(true);
    expect(isMembershipAgreementCurrent({ agreementSigned: true, agreementVersion: "legacy" }, "9", SEDE_SCHOOL_ID)).toBe(true);
    expect(isMembershipAgreementCurrent(signed, "2", SEDE_SCHOOL_ID)).toBe(false);
    expect(isMembershipAgreementCurrent(null, "1", SEDE_SCHOOL_ID)).toBe(false);
  });

  it("pede nova assinatura a quem muda de escola", () => {
    expect(isMembershipAgreementCurrent(signed, "1", "escola-2")).toBe(false);
    expect(isMembershipAgreementCurrent({ ...signed, contractParty: PARTY }, "1", "escola-2")).toBe(true);
    expect(isMembershipAgreementCurrent({ ...signed, contractParty: PARTY }, "1", SEDE_SCHOOL_ID)).toBe(false);
  });
});

describe("signatureHistoryWith", () => {
  it("guarda a assinatura em vigor sem repetir o histórico", () => {
    const row = { id: "1", studentId: "s", agreementSigned: true, signatureName: "Ana", signatureHistory: [{ signatureName: "Antiga" }] };
    expect(signatureHistoryWith(row)).toEqual([{ signatureName: "Antiga" }, { agreementSigned: true, signatureName: "Ana" }]);
  });

  it("sem assinatura anterior não acrescenta nada", () => {
    expect(signatureHistoryWith(null)).toEqual([]);
    expect(signatureHistoryWith({ agreementSigned: false, signatureHistory: [] })).toEqual([]);
  });
});
