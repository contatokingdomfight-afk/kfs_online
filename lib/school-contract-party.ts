import "server-only";

import { cache } from "react";
import { membershipAgreementHtml, parseContractParty, waiverHtml, type ContractParty } from "@/lib/contract-party";
import { SEDE_SCHOOL_ID } from "@/lib/school-payment-rules";
import { SEDE_DISPLAY_NAME } from "@/lib/school-name-text";
import { getActiveSchoolSignatures, type SchoolSignature } from "@/lib/school-signatures";
import { hasLegalData } from "@/lib/school-status";
import { getAdminClientOrNull } from "@/lib/supabase/admin";

/** `blocked` = não se pode assinar: faltam os dados legais da escola ou não foi possível lê-los. Nunca se assina com a Sede em vez dela. */
export type StudentContractParty = { schoolId: string | null; name: string | null; party: ContractParty | null; blocked: boolean };

export const loadStudentContractParty = cache(async function loadStudentContractParty(studentId: string): Promise<StudentContractParty> {
  const blocked: StudentContractParty = { schoolId: null, name: null, party: null, blocked: true };
  const admin = getAdminClientOrNull().client;
  if (!admin) return blocked;

  const { data: student } = await admin.from("Student").select("schoolId").eq("id", studentId).maybeSingle();
  const schoolId = (student as { schoolId?: string | null } | null)?.schoolId ?? null;
  if (!schoolId) return blocked;
  if (schoolId === SEDE_SCHOOL_ID) return { schoolId, name: SEDE_DISPLAY_NAME, party: null, blocked: false };

  const [{ data: school }, { data: settings }, signatures] = await Promise.all([
    admin.from("School").select("name, legalName, legalAddress").eq("id", schoolId).maybeSingle(),
    admin.from("SchoolPaymentSettings").select("nif").eq("schoolId", schoolId).maybeSingle(),
    getActiveSchoolSignatures(schoolId),
  ]);
  if (!school) return { ...blocked, schoolId };

  const s = school as { name: string; legalName: string | null; legalAddress: string | null };
  const nif = (settings as { nif?: string | null } | null)?.nif ?? null;
  if (!hasLegalData({ legalName: s.legalName, legalAddress: s.legalAddress, nif })) return { ...blocked, schoolId, name: s.name };

  return {
    schoolId,
    name: s.name,
    party: { schoolId, name: s.name, legalName: s.legalName!.trim(), nif: nif!.trim(), legalAddress: s.legalAddress!.trim(), signatures },
    blocked: false,
  };
});

/** Assinaturas da escola atual do aluno (comprovativo). */
export async function loadStudentSchoolSignatures(studentId: string): Promise<SchoolSignature[]> {
  const { schoolId } = await loadStudentContractParty(studentId);
  return schoolId ? getActiveSchoolSignatures(schoolId) : [];
}

/** O que mostrar de um documento. `html` null = ainda não pode ser mostrado (faltam os dados legais da escola). */
export type MembershipDocumentView = { html: string | null; schoolName: string; signatures: SchoolSignature[] };

/**
 * Documento assinado: sai dos dados guardados na assinatura, mesmo que a escola ou o aluno tenham mudado.
 * Por assinar: sai dos dados atuais da escola do aluno.
 */
export async function loadMembershipDocumentView(
  kind: "agreement" | "waiver",
  studentId: string,
  row: { signed: boolean; contractParty?: unknown }
): Promise<MembershipDocumentView> {
  const render = kind === "agreement" ? membershipAgreementHtml : waiverHtml;

  if (row.signed) {
    const party = parseContractParty(row.contractParty);
    return {
      html: render(party),
      schoolName: party?.name ?? SEDE_DISPLAY_NAME,
      signatures: party ? party.signatures : await getActiveSchoolSignatures(SEDE_SCHOOL_ID),
    };
  }

  const current = await loadStudentContractParty(studentId);
  const schoolName = current.name ?? "Academia";
  if (current.blocked) return { html: null, schoolName, signatures: [] };
  return { html: render(current.party), schoolName, signatures: current.party ? current.party.signatures : await getActiveSchoolSignatures(SEDE_SCHOOL_ID) };
}
