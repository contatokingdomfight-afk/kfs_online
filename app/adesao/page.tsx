import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getInsuranceSettings, isMembershipAgreementCurrent } from "@/lib/insurance-settings";
import { isMinorFromDateOfBirth } from "@/lib/waiver-content";
import {
  isEnrollmentFormCurrent,
  loadEnrollmentFormPrefill,
  type EnrollmentFormRow,
} from "@/lib/enrollment-form";
import { MEMBERSHIP_AGREEMENT_BODY_PT } from "@/lib/membership-agreement-content";
import { AdesaoSigningForm } from "./AdesaoSigningForm";
import { ComprovativoForm } from "./ComprovativoForm";
import { EnrollmentFormSummary } from "./EnrollmentFormSummary";
import { AdesaoStepIndicator } from "./AdesaoStepIndicator";

type Props = {
  searchParams: Promise<{ passo?: string }>;
};

export default async function AdesaoPage({ searchParams }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "ALUNO") redirect("/dashboard");

  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const supabase = await createClient();
  const settings = await getInsuranceSettings(supabase);
  const params = await searchParams;
  const passoParam = params.passo === "2" ? 2 : 1;

  const [{ data: student }, { data: agreement }, { data: enrollmentForm }] = await Promise.all([
    supabase.from("Student").select("planId, primaryModality, userId").eq("id", studentId).maybeSingle(),
    supabase
      .from("StudentMembershipAgreement")
      .select("agreementSigned, agreementVersion, agreementSignedAt, signatureName")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase.from("StudentEnrollmentForm").select("*").eq("studentId", studentId).maybeSingle(),
  ]);

  const planId = (student as { planId?: string | null } | null)?.planId ?? null;
  const agreementCurrent = isMembershipAgreementCurrent(agreement, settings.membershipAgreementVersion);
  const formCurrent = isEnrollmentFormCurrent(enrollmentForm, settings.enrollmentFormVersion);
  const reviewMode = agreementCurrent;

  if (!planId && !reviewMode) redirect("/escolher-plano");

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

  const signedAt = (agreement as { agreementSignedAt?: string | null } | null)?.agreementSignedAt ?? null;
  const signatureName = (agreement as { signatureName?: string | null } | null)?.signatureName ?? null;

  let step: 1 | 2 = 1;
  if (!reviewMode) {
    if (formCurrent && passoParam === 2) step = 2;
    else if (formCurrent && passoParam === 1) step = 1;
    else if (formCurrent) step = 2;
    else step = 1;
  }

  if (!reviewMode && step === 2 && !formCurrent) redirect("/adesao?passo=1");

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-bg" style={{ color: "var(--text-primary)" }}>
      <div className="container-mobile" style={{ width: "100%" }}>
        <h1 style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, textAlign: "center", marginBottom: 8 }}>
          Adesão à Kingdom Fight School
        </h1>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: 16, fontSize: 14 }}>
          {reviewMode
            ? "Consulta do comprovativo e contrato assinados."
            : step === 1
              ? "Preenche o comprovativo de adesão com os teus dados."
              : "Lê as condições gerais e assina para concluir a adesão."}
        </p>

        {!reviewMode ? <AdesaoStepIndicator step={step} /> : null}

        {reviewMode && prefill && enrollmentForm ? (
          <div style={{ maxWidth: 640, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", fontSize: 14, lineHeight: 1.5 }}>
              <p style={{ margin: "0 0 6px", color: "var(--success, #16a34a)" }}>
                Assinado{signatureName ? ` por ${signatureName}` : ""}
                {signedAt ? ` em ${new Date(signedAt).toLocaleDateString("pt-PT")}` : ""}.
              </p>
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
            />
            <div
              className="card"
              style={{
                padding: "clamp(16px, 4vw, 24px)",
                maxHeight: "min(50vh, 400px)",
                overflowY: "auto",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--text-secondary)",
              }}
              dangerouslySetInnerHTML={{ __html: MEMBERSHIP_AGREEMENT_BODY_PT }}
            />
            <Link href="/dashboard/perfil" className="btn btn-secondary" style={{ textAlign: "center", textDecoration: "none" }}>
              Voltar ao perfil
            </Link>
          </div>
        ) : step === 1 && prefill ? (
          <ComprovativoForm prefill={prefill} />
        ) : prefill ? (
          <AdesaoSigningForm isMinor={isMinor} planName={prefill.planName} modalityLabel={prefill.modalityLabel} />
        ) : null}
      </div>
    </main>
  );
}
