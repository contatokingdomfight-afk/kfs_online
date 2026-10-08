import type { SupabaseClient } from "@supabase/supabase-js";
import { getInsuranceSettings, isMembershipAgreementCurrent } from "@/lib/insurance-settings";
import { isEnrollmentFormCurrent } from "@/lib/enrollment-form";

/**
 * Estado dos documentos de adesão do aluno — mesmos 3 documentos que o gate do middleware
 * (comprovativo na versão actual, contrato na versão actual e termo de responsabilidade).
 * Os dois últimos são assinados juntos no passo 2 de /adesao.
 */
export type MembershipDocumentsStatus = {
  /** Passo 1 de /adesao. */
  enrollmentFormDone: boolean;
  /** Passo 2 de /adesao (contrato + termo, assinatura única). */
  agreementAndWaiverDone: boolean;
  allDone: boolean;
};

export async function getMembershipDocumentsStatus(
  supabase: SupabaseClient,
  studentId: string
): Promise<MembershipDocumentsStatus> {
  const [settings, { data: agreement }, { data: waiver }, { data: enrollmentForm }] = await Promise.all([
    getInsuranceSettings(supabase),
    supabase
      .from("StudentMembershipAgreement")
      .select("agreementSigned, agreementVersion")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase.from("StudentWaiver").select("waiverSigned").eq("studentId", studentId).maybeSingle(),
    supabase.from("StudentEnrollmentForm").select("formCompleted, formVersion").eq("studentId", studentId).maybeSingle(),
  ]);

  const enrollmentFormDone = isEnrollmentFormCurrent(
    enrollmentForm as { formCompleted?: boolean; formVersion?: string | null } | null,
    settings.enrollmentFormVersion
  );
  const agreementCurrent = isMembershipAgreementCurrent(
    agreement as { agreementSigned?: boolean; agreementVersion?: string | null } | null,
    settings.membershipAgreementVersion
  );
  const waiverSigned = Boolean((waiver as { waiverSigned?: boolean } | null)?.waiverSigned);
  const agreementAndWaiverDone = agreementCurrent && waiverSigned;

  return { enrollmentFormDone, agreementAndWaiverDone, allDone: enrollmentFormDone && agreementAndWaiverDone };
}
