import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getInsuranceSettings, isMembershipAgreementCurrent } from "@/lib/insurance-settings";
import { isMinorFromDateOfBirth } from "@/lib/waiver-content";
import { isEnrollmentFormCurrent, loadEnrollmentFormPrefill } from "@/lib/enrollment-form";
import { AdesaoSigningForm } from "./AdesaoSigningForm";
import { ComprovativoForm } from "./ComprovativoForm";
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
      .select("agreementSigned, agreementVersion")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase.from("StudentEnrollmentForm").select("formCompleted, formVersion").eq("studentId", studentId).maybeSingle(),
  ]);

  const planId = (student as { planId?: string | null } | null)?.planId ?? null;
  const agreementCurrent = isMembershipAgreementCurrent(agreement, settings.membershipAgreementVersion);
  const formCurrent = isEnrollmentFormCurrent(enrollmentForm, settings.enrollmentFormVersion);

  if (agreementCurrent) {
    redirect("/dashboard/documentos-adesao");
  }

  if (!planId) redirect("/escolher-plano");

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

  if (step === 2 && !formCurrent) redirect("/adesao?passo=1");

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-bg" style={{ color: "var(--text-primary)" }}>
      <div className="container-mobile" style={{ width: "100%" }}>
        <h1 style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, textAlign: "center", marginBottom: 8 }}>
          Adesão à Kingdom Fight School
        </h1>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: 16, fontSize: 14 }}>
          {step === 1
            ? "Preenche o comprovativo de adesão com os teus dados."
            : "Lê as condições gerais e assina para concluir a adesão."}
        </p>

        <AdesaoStepIndicator step={step} />

        {step === 1 && prefill ? (
          <ComprovativoForm prefill={prefill} />
        ) : prefill ? (
          <AdesaoSigningForm isMinor={isMinor} planName={prefill.planName} modalityLabel={prefill.modalityLabel} />
        ) : null}
      </div>
    </main>
  );
}
