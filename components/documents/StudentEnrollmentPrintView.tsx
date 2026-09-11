import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { loadEnrollmentFormPrefill, type EnrollmentFormRow } from "@/lib/enrollment-form";
import { EnrollmentFormSummary } from "@/app/adesao/EnrollmentFormSummary";
import { PrintDocumentButton } from "@/components/documents/PrintDocumentButton";
import { getActiveSchoolSignatures } from "@/lib/school-signatures";

type Props = {
  studentId: string;
  /** Para onde volta o "← Voltar" e o aviso de "nada para imprimir ainda". */
  backHref: string;
};

/**
 * Vista de impressão do comprovativo de adesão (só o formulário/ficha, sem o texto do contrato) —
 * partilhada entre a página do aluno e a do admin.
 */
export async function StudentEnrollmentPrintView({ studentId, backHref }: Props) {
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [{ data: student }, { data: enrollmentForm }, { data: agreement }] = await Promise.all([
    supabase.from("Student").select("planId, userId").eq("id", studentId).maybeSingle(),
    supabase.from("StudentEnrollmentForm").select("*").eq("studentId", studentId).maybeSingle(),
    supabase
      .from("StudentMembershipAgreement")
      .select("agreementSigned, signatureName, signatureImageUrl")
      .eq("studentId", studentId)
      .maybeSingle(),
  ]);

  if (!enrollmentForm?.formCompleted) {
    return (
      <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
        <p style={{ margin: "0 0 16px", color: "var(--text-secondary)" }}>
          O aluno ainda não preencheu o comprovativo de adesão — não há nada para imprimir ainda.
        </p>
        <Link href={backHref} className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  const schoolSignatures = await getActiveSchoolSignatures();

  const userId = (student as { userId?: string } | null)?.userId;
  const prefill = userId ? await loadEnrollmentFormPrefill(supabase, studentId, userId) : null;
  if (!prefill) {
    return (
      <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
        <p style={{ margin: "0 0 16px", color: "var(--text-secondary)" }}>
          Falta o aluno ter um plano atribuído para gerar o comprovativo completo.
        </p>
        <Link href={backHref} className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <Link href={backHref} className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
        <PrintDocumentButton />
      </div>
      <EnrollmentFormSummary
        form={enrollmentForm as EnrollmentFormRow}
        fullName={prefill.fullName}
        email={prefill.email}
        dateOfBirth={prefill.dateOfBirth}
        phone={prefill.phone}
        planName={prefill.planName}
        modalityLabel={prefill.modalityLabel}
        monthlyAmount={prefill.monthlyAmount}
        enrollmentAmount={prefill.enrollmentAmount}
        insuranceAmount={prefill.insuranceAmount}
        showEnrollment={prefill.showEnrollment}
        showInsurance={prefill.showInsurance}
        agreementSigned={agreement?.agreementSigned}
        signatureName={agreement?.signatureName}
        signatureImageUrl={agreement?.signatureImageUrl}
        schoolSignatures={schoolSignatures}
      />
    </>
  );
}
