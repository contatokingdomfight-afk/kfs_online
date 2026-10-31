import { MEMBERSHIP_AGREEMENT_BODY_PT } from "@/lib/membership-agreement-content";
import { SEDE_DISPLAY_NAME } from "@/lib/school-name-text";
import type { SchoolSignature } from "@/lib/school-signatures";
import { WAIVER_BODY_PT } from "@/lib/waiver-content";

/**
 * Escola com quem o aluno assina, guardada na assinatura para o documento nunca mudar depois.
 * `null` = texto original da Sede: é o que têm os contratos anteriores às escolas e os da Sede.
 */
export type ContractParty = {
  schoolId: string;
  name: string;
  legalName: string;
  nif: string;
  legalAddress: string;
  signatures: SchoolSignature[];
};

const SEDE_LEGAL_IDENTIFICATION =
  "EPICENTRO DE HONRA - LDA, pessoa coletiva n.º 519296850, com sede em Praceta Laura Alves 8, 2725-206 Algueirão-Mem Martins";

export function parseContractParty(value: unknown): ContractParty | null {
  const v = value as Partial<ContractParty> | null | undefined;
  if (!v?.schoolId || !v.name || !v.legalName || !v.nif || !v.legalAddress) return null;
  return {
    schoolId: v.schoolId,
    name: v.name,
    legalName: v.legalName,
    nif: v.nif,
    legalAddress: v.legalAddress,
    signatures: Array.isArray(v.signatures) ? v.signatures : [],
  };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function withPartyName(html: string, party: ContractParty): string {
  return html.split(SEDE_DISPLAY_NAME).join(escapeHtml(party.name));
}

export function membershipAgreementHtml(party: ContractParty | null): string {
  if (!party) return MEMBERSHIP_AGREEMENT_BODY_PT;
  const identification = `${escapeHtml(party.legalName)}, pessoa coletiva n.º ${escapeHtml(party.nif)}, com sede em ${escapeHtml(party.legalAddress)}`;
  return withPartyName(MEMBERSHIP_AGREEMENT_BODY_PT, party).split(SEDE_LEGAL_IDENTIFICATION).join(identification);
}

export function waiverHtml(party: ContractParty | null): string {
  return party ? withPartyName(WAIVER_BODY_PT, party) : WAIVER_BODY_PT;
}

/** Histórico a gravar ao assinar de novo: a assinatura em vigor passa para lá, para não se perder. */
export function signatureHistoryWith(existing: Record<string, unknown> | null | undefined): unknown[] {
  const history = Array.isArray(existing?.signatureHistory) ? (existing.signatureHistory as unknown[]) : [];
  if (!existing?.agreementSigned && !existing?.waiverSigned) return history;
  const signed = { ...existing };
  delete signed.id;
  delete signed.studentId;
  delete signed.signatureHistory;
  return [...history, signed];
}
