import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getInsuranceSettings, isMembershipAgreementCurrent } from "@/lib/insurance-settings";
import { isEnrollmentFormCurrent, loadEnrollmentFormPrefill, type EnrollmentFormRow } from "@/lib/enrollment-form";
import { MembershipDocumentsReadView } from "@/components/membership/MembershipDocumentsReadView";
import { getActiveSchoolSignatures } from "@/lib/school-signatures";

type Props = {
  studentId: string;
  printComprovativoHref: string;
  printContratoHref: string;
  locale?: "pt" | "en";
  /** Mostra o botão "Preencher e assinar (presencial)" quando há algo pendente — só na ficha de admin. */
  showAdminSignShortcut?: boolean;
};

/** Vista colapsável de comprovativo, condições gerais e termo — para admin/coach na ficha do aluno. */
export async function StaffStudentMembershipDocumentsView({
  studentId,
  printComprovativoHref,
  printContratoHref,
  locale = "pt",
  showAdminSignShortcut = false,
}: Props) {
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const settings = await getInsuranceSettings(supabase);

  const [{ data: student }, { data: agreement }, { data: waiver }, { data: enrollmentForm }] = await Promise.all([
    supabase.from("Student").select("planId, userId").eq("id", studentId).maybeSingle(),
    supabase
      .from("StudentMembershipAgreement")
      .select("agreementSigned, agreementSignedAt, signatureName, signatureImageUrl, agreementVersion")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase
      .from("StudentWaiver")
      .select("waiverSigned, waiverSignedAt, signatureName, signatureImageUrl, waiverVersion")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase.from("StudentEnrollmentForm").select("*").eq("studentId", studentId).maybeSingle(),
  ]);

  const userId = (student as { userId?: string } | null)?.userId;
  const planId = (student as { planId?: string | null } | null)?.planId ?? null;
  const prefill = userId ? await loadEnrollmentFormPrefill(supabase, studentId, userId) : null;
  const schoolSignatures = await getActiveSchoolSignatures();

  const agreementCurrent = isMembershipAgreementCurrent(agreement, settings.membershipAgreementVersion);
  const formCurrent = isEnrollmentFormCurrent(enrollmentForm, settings.enrollmentFormVersion);
  const waiverSigned = Boolean((waiver as { waiverSigned?: boolean } | null)?.waiverSigned);
  const hasPendingDocuments = !agreementCurrent || !formCurrent || !waiverSigned;

  return (
    <div style={{ maxWidth: "min(720px, 100%)" }}>
      {showAdminSignShortcut && hasPendingDocuments ? (
        <div style={{ marginBottom: 16 }}>
          <Link
            href={`/admin/alunos/${studentId}/contrato/assinar`}
            className="btn btn-primary"
            style={{ textDecoration: "none", display: "inline-block" }}
          >
            ✍️ Preencher e assinar (presencial)
          </Link>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            Para alunos sem acesso próprio à plataforma (ex.: sócios Kids) — preenche com o sócio ou
            encarregado de educação presente.
          </p>
        </div>
      ) : null}
      <MembershipDocumentsReadView
      locale={locale}
      showIncompleteBanner={false}
      printComprovativoHref={printComprovativoHref}
      printContratoHref={printContratoHref}
      hasPlan={Boolean(planId)}
      agreement={{
        agreementSigned: Boolean(agreement?.agreementSigned),
        agreementSignedAt: (agreement as { agreementSignedAt?: string | null } | null)?.agreementSignedAt ?? null,
        signatureName: (agreement as { signatureName?: string | null } | null)?.signatureName ?? null,
        signatureImageUrl: (agreement as { signatureImageUrl?: string | null } | null)?.signatureImageUrl ?? null,
        agreementVersion:
          (agreement as { agreementVersion?: string | null } | null)?.agreementVersion ??
          settings.membershipAgreementVersion,
      }}
      waiver={{
        waiverSigned: Boolean(waiver?.waiverSigned),
        waiverSignedAt: (waiver as { waiverSignedAt?: string | null } | null)?.waiverSignedAt ?? null,
        signatureName: (waiver as { signatureName?: string | null } | null)?.signatureName ?? null,
        signatureImageUrl: (waiver as { signatureImageUrl?: string | null } | null)?.signatureImageUrl ?? null,
        waiverVersion:
          (waiver as { waiverVersion?: string | null } | null)?.waiverVersion ?? settings.waiverVersion,
      }}
      enrollment={{
        formCompleted: Boolean(enrollmentForm?.formCompleted),
        formCompletedAt: (enrollmentForm as { formCompletedAt?: string | null } | null)?.formCompletedAt ?? null,
        formVersion:
          (enrollmentForm as { formVersion?: string | null } | null)?.formVersion ?? settings.enrollmentFormVersion,
      }}
      enrollmentForm={enrollmentForm ? (enrollmentForm as EnrollmentFormRow) : null}
      prefill={prefill}
      schoolSignatures={schoolSignatures}
    />
    </div>
  );
}
