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
import { loadStudentPaymentInfo, loadStudentSchoolIdentity } from "@/lib/school-payment-methods";
import { loadStudentContractParty } from "@/lib/school-contract-party";
import { membershipAgreementHtml, waiverHtml } from "@/lib/contract-party";
import { withSchoolName } from "@/lib/school-name-text";
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

  const [{ data: student }, { data: agreement }, { data: enrollmentForm }, { data: waiver }] = await Promise.all([
    supabase.from("Student").select("schoolId, planId, primaryModality, userId, syntheticLoginEmail").eq("id", studentId).maybeSingle(),
    supabase
      .from("StudentMembershipAgreement")
      .select("agreementSigned, agreementVersion, contractParty")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase.from("StudentEnrollmentForm").select("formCompleted, formVersion").eq("studentId", studentId).maybeSingle(),
    supabase.from("StudentWaiver").select("waiverSigned").eq("studentId", studentId).maybeSingle(),
  ]);

  const agreementCurrent = isMembershipAgreementCurrent(agreement, settings.membershipAgreementVersion, (student as { schoolId?: string | null } | null)?.schoolId);
  const formCurrent = isEnrollmentFormCurrent(enrollmentForm, settings.enrollmentFormVersion);
  const waiverSigned = Boolean((waiver as { waiverSigned?: boolean } | null)?.waiverSigned);

  if (agreementCurrent && waiverSigned) {
    redirect("/dashboard/documentos-adesao");
  }

  // Sem plano e sem ser aula avulsa da secretaria: primeiro escolhe o plano, depois a adesão.
  const st = student as { planId?: string | null; syntheticLoginEmail?: boolean | null } | null;
  if (!st?.planId && !st?.syntheticLoginEmail) redirect("/escolher-plano");

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

  const [paymentInfo, schoolIdentity, contract] = await Promise.all([loadStudentPaymentInfo(studentId), loadStudentSchoolIdentity(studentId), loadStudentContractParty(studentId)]);

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-bg" style={{ color: "var(--text-primary)" }}>
      <div className="container-mobile" style={{ width: "100%" }}>
        <h1 style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, textAlign: "center", marginBottom: 8 }}>
          {withSchoolName("Adesão à Kingdom Fight School", contract.name)}
        </h1>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: 16, fontSize: 14 }}>
          {step === 1
            ? "Preenche o comprovativo de adesão com os teus dados."
            : "Lê as condições gerais e assina para concluir a adesão."}
        </p>

        <AdesaoStepIndicator step={step} />

        {step === 1 && prefill ? (
          <ComprovativoForm prefill={prefill} paymentInfo={paymentInfo} schoolIdentity={schoolIdentity} revolutAvailable />
        ) : contract.blocked ? (
          <p className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            O contrato ainda não está disponível: faltam os dados legais da escola. Fala com a tua escola.
          </p>
        ) : prefill ? (
          <AdesaoSigningForm
            isMinor={isMinor}
            planName={prefill.planName}
            modalityLabel={prefill.modalityLabel}
            schoolName={contract.name}
            waiverHtml={waiverHtml(contract.party)}
            agreementHtml={membershipAgreementHtml(contract.party)}
          />
        ) : null}
      </div>
    </main>
  );
}
