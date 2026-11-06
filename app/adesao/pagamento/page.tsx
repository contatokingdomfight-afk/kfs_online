import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getInsuranceSettings, isMembershipAgreementCurrent } from "@/lib/insurance-settings";
import { getFamilyContext } from "@/lib/family-context";
import { latePaymentLabel, listLatePayments } from "@/lib/tuition-checkout/service";
import { loadStudentPaymentInfo } from "@/lib/school-payment-methods";
import { studentPaymentReference } from "@/lib/revolut/match";
import { AdesaoStepIndicator } from "../AdesaoStepIndicator";
import { AdesaoPaymentForm } from "./AdesaoPaymentForm";

/** Último passo da adesão: só aqui o aluno vê os dados de pagamento da escola (com tudo assinado). */
export default async function AdesaoPagamentoPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "ALUNO") redirect("/dashboard");
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const admin = getAdminClientOrNull().client;
  if (!admin) redirect("/dashboard/financeiro");

  const settings = await getInsuranceSettings(admin);
  const [{ data: student }, { data: agreement }, { data: waiver }, { data: form }] = await Promise.all([
    admin.from("Student").select("schoolId, paymentCode").eq("id", studentId).maybeSingle(),
    admin.from("StudentMembershipAgreement").select("agreementSigned, agreementVersion, contractParty").eq("studentId", studentId).maybeSingle(),
    admin.from("StudentWaiver").select("waiverSigned").eq("studentId", studentId).maybeSingle(),
    admin.from("StudentEnrollmentForm").select("paymentMethod, paymentProofFileName").eq("studentId", studentId).maybeSingle(),
  ]);

  const signed =
    isMembershipAgreementCurrent(agreement, settings.membershipAgreementVersion, (student as { schoolId?: string | null } | null)?.schoolId) &&
    Boolean((waiver as { waiverSigned?: boolean } | null)?.waiverSigned);
  if (!signed) redirect("/adesao");

  const late = await listLatePayments(admin, studentId, { keepFamilyPending: true });
  // Financeiro (e não /dashboard): sem acesso, o middleware mandaria /dashboard de volta para aqui.
  if (late.length === 0) redirect("/dashboard/financeiro");

  const familyCtx = await getFamilyContext(admin, studentId);
  let familyPayerName: string | null = null;
  if (familyCtx && !familyCtx.isTitular) {
    const { data: titular } = await admin.from("Student").select("userId").eq("id", familyCtx.billingStudentId).maybeSingle();
    const titularUserId = (titular as { userId?: string | null } | null)?.userId;
    const { data: user } = titularUserId ? await admin.from("User").select("name").eq("id", titularUserId).maybeSingle() : { data: null };
    familyPayerName = (user as { name?: string | null } | null)?.name?.trim() || "o titular";
  }

  // Coluna nova (migração 20261106120000): sem ela, a caixa começa desmarcada.
  const { data: famRow, error: famErr } = await admin
    .from("StudentEnrollmentForm")
    .select("familyGroupRequested")
    .eq("studentId", studentId)
    .maybeSingle();
  const familyRequested = !famErr && Boolean((famRow as { familyGroupRequested?: boolean } | null)?.familyGroupRequested);

  const paymentInfo = await loadStudentPaymentInfo(studentId);
  const f = form as { paymentMethod?: string | null; paymentProofFileName?: string | null } | null;

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-bg" style={{ color: "var(--text-primary)" }}>
      <div className="container-mobile" style={{ width: "100%" }}>
        <h1 style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, textAlign: "center", marginBottom: 8 }}>Pagamento da inscrição</h1>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: 16, fontSize: 14 }}>
          Escolhe como queres pagar. A secretaria confirma e o teu acesso fica desbloqueado.
        </p>
        <AdesaoStepIndicator step={3} />
        <AdesaoPaymentForm
          lines={late.map((p) => ({ id: p.id, label: latePaymentLabel(p), amount: p.amount, isTuition: p.paymentType === "TUITION" }))}
          paymentInfo={paymentInfo}
          paymentReference={studentPaymentReference((student as { paymentCode?: number | null } | null)?.paymentCode ?? null)}
          initialMethod={f?.paymentMethod ?? null}
          existingProofFileName={f?.paymentProofFileName ?? null}
          familyPayerName={familyPayerName}
          canRequestFamily={!familyCtx}
          familyRequested={familyRequested}
        />
      </div>
    </main>
  );
}
