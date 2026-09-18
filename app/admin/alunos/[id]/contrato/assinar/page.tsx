import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getInsuranceSettings, isMembershipAgreementCurrent } from "@/lib/insurance-settings";
import { isMinorFromDateOfBirth } from "@/lib/waiver-content";
import { isEnrollmentFormCurrent, loadEnrollmentFormPrefill } from "@/lib/enrollment-form";
import { ComprovativoForm } from "@/app/adesao/ComprovativoForm";
import { AdesaoSigningForm } from "@/app/adesao/AdesaoSigningForm";
import { AdesaoStepIndicator } from "@/app/adesao/AdesaoStepIndicator";
import { adminSaveEnrollmentForm, adminSignAdesaoDocuments } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ passo?: string }>;
};

/**
 * Wizard de adesão preenchido pelo admin/coach em nome de um aluno sem acesso próprio à
 * plataforma (ex.: sócio Kids com email interno — DOCS/CADASTRO_PRESENCIAL.md). Mesma UI e
 * validação de /adesao, mas sem depender da sessão do aluno.
 */
export default async function AdminAssinarAdesaoPage({ params, searchParams }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: studentId } = await params;
  const sp = await searchParams;
  const passoParam = sp.passo === "2" ? 2 : 1;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const settings = await getInsuranceSettings(supabase);

  const [{ data: student }, { data: agreement }, { data: enrollmentForm }, { data: waiver }] = await Promise.all([
    supabase.from("Student").select("userId").eq("id", studentId).maybeSingle(),
    supabase
      .from("StudentMembershipAgreement")
      .select("agreementSigned, agreementVersion")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase.from("StudentEnrollmentForm").select("formCompleted, formVersion").eq("studentId", studentId).maybeSingle(),
    supabase.from("StudentWaiver").select("waiverSigned").eq("studentId", studentId).maybeSingle(),
  ]);

  if (!student) redirect("/admin/documentos-adesao");

  const agreementCurrent = isMembershipAgreementCurrent(agreement, settings.membershipAgreementVersion);
  const formCurrent = isEnrollmentFormCurrent(enrollmentForm, settings.enrollmentFormVersion);
  const waiverSigned = Boolean((waiver as { waiverSigned?: boolean } | null)?.waiverSigned);

  if (agreementCurrent && waiverSigned) {
    redirect(`/admin/alunos/${studentId}/contrato`);
  }

  const userId = (student as { userId?: string } | null)?.userId;
  const prefill = userId ? await loadEnrollmentFormPrefill(supabase, studentId, userId) : null;

  const { data: profile } = await supabase
    .from("StudentProfile")
    .select("dateOfBirth")
    .eq("studentId", studentId)
    .maybeSingle();

  const todayYmd = new Date().toISOString().slice(0, 10);
  const isMinor = isMinorFromDateOfBirth(
    (profile as { dateOfBirth?: string | null } | null)?.dateOfBirth ?? null,
    todayYmd
  );

  let step: 1 | 2 = 1;
  if (formCurrent && passoParam === 2) step = 2;
  else if (formCurrent && passoParam === 1) step = 1;
  else if (formCurrent) step = 2;
  else step = 1;

  if (step === 2 && !formCurrent) redirect(`/admin/alunos/${studentId}/contrato/assinar?passo=1`);

  return (
    <div style={{ maxWidth: "min(720px, 100%)", marginInline: "auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link
          href={`/admin/alunos/${studentId}/contrato`}
          style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500 }}
        >
          ← Voltar à ficha
        </Link>
      </div>

      <h1 style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, textAlign: "center", marginBottom: 8 }}>
        Assinatura presencial — Adesão
      </h1>
      <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: 16, fontSize: 14 }}>
        Preenche com o sócio (ou encarregado de educação, se for menor) presente.
      </p>

      <AdesaoStepIndicator step={step} />

      {step === 1 && prefill ? (
        <ComprovativoForm prefill={prefill} action={adminSaveEnrollmentForm.bind(null, studentId)} />
      ) : prefill ? (
        <AdesaoSigningForm
          isMinor={isMinor}
          planName={prefill.planName}
          modalityLabel={prefill.modalityLabel}
          action={adminSignAdesaoDocuments.bind(null, studentId)}
          signatureUploadUrl="/api/admin/adesao/signature"
          studentId={studentId}
          backHref={`/admin/alunos/${studentId}/contrato/assinar?passo=1`}
        />
      ) : null}
    </div>
  );
}
