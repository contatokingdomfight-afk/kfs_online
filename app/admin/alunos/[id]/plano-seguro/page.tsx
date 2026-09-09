import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { AdminAlunoQuickActions } from "../EditarAlunoForm";
import { StudentInsuranceSection } from "../StudentInsuranceSection";
import { StudentExtraSessionsSection } from "../StudentExtraSessionsSection";
import { getPlanAccess } from "@/lib/plan-access";
import { getMonthlyCheckInLimit } from "@/lib/monthly-checkin-limit";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { formatInTimeZone } from "date-fns-tz";
import { LISBON_TZ, currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";

type Props = { params: Promise<{ id: string }> };

export default async function AdminAlunoPlanoSeguroPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: studentId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, planId, adminGrantedFullAccess")
    .eq("id", studentId)
    .single();

  if (!student) return null;

  const { data: user } = await supabase.from("User").select("role").eq("id", student.userId).maybeSingle();

  const [{ data: waiverRow }, { data: agreementRow }, { data: enrollmentRow }, { data: coverageRow }, insuranceSettings] =
    await Promise.all([
      supabase
        .from("StudentWaiver")
        .select("waiverSigned, waiverSignedAt, signatureName, signatureImageUrl")
        .eq("studentId", studentId)
        .maybeSingle(),
      supabase
        .from("StudentMembershipAgreement")
        .select("agreementSigned, agreementSignedAt, signatureName, signatureImageUrl")
        .eq("studentId", studentId)
        .maybeSingle(),
      supabase
        .from("StudentEnrollmentForm")
        .select(
          "formCompleted, formCompletedAt, taxId, idDocument, paymentMethod, debitIban, emergencyContactName, emergencyContactPhone, paymentProofPath, paymentProofFileName, paymentProofUploadedAt"
        )
        .eq("studentId", studentId)
        .maybeSingle(),
      supabase
        .from("StudentInsuranceCoverage")
        .select("covered, coverageStartDate, coverageEndDate, policyReference, notes")
        .eq("studentId", studentId)
        .maybeSingle(),
      getInsuranceSettings(supabase),
    ]);

  const paymentProofPath = (enrollmentRow as { paymentProofPath?: string | null } | null)?.paymentProofPath ?? null;
  const paymentProofSignedUrl = paymentProofPath
    ? (
        await supabase.storage.from("payment-proofs").createSignedUrl(paymentProofPath, 300)
      ).data?.signedUrl ?? null
    : null;

  const todayYmd = formatInTimeZone(new Date(), LISBON_TZ, "yyyy-MM-dd");

  const planAccess = await getPlanAccess(supabase, studentId);
  let extraSessionsData: {
    planName: string | null;
    currentReferenceMonth: string;
    used: number;
    limit: number;
    remaining: number;
    extraGrants: Array<{ id: string; referenceMonth: string; quantity: number; note: string | null }>;
  } | null = null;
  if (planAccess.maxCheckInsPerMonth !== null) {
    const currentReferenceMonth = currentReferenceMonthLisbon(new Date());
    const [{ data: subscribedPlan }, monthly, { data: extraRows }] = await Promise.all([
      supabase.from("Plan").select("name").eq("id", planAccess.currentPlanId ?? "").maybeSingle(),
      getMonthlyCheckInLimit(supabase, studentId, planAccess.maxCheckInsPerMonth, currentReferenceMonth),
      supabase
        .from("StudentExtraSessions")
        .select("id, referenceMonth, quantity, note")
        .eq("studentId", studentId)
        .eq("referenceMonth", currentReferenceMonth)
        .order("createdAt", { ascending: false }),
    ]);
    extraSessionsData = {
      planName: (subscribedPlan as { name?: string } | null)?.name ?? null,
      currentReferenceMonth,
      used: monthly.used,
      limit: monthly.limit ?? planAccess.maxCheckInsPerMonth,
      remaining: monthly.remaining ?? 0,
      extraGrants: (extraRows ?? []) as Array<{ id: string; referenceMonth: string; quantity: number; note: string | null }>,
    };
  }

  return (
    <>
      <AdminAlunoQuickActions
        studentId={studentId}
        initialPlanId={student.planId ?? ""}
        initialAdminGrantedFullAccess={Boolean((student as { adminGrantedFullAccess?: boolean }).adminGrantedFullAccess)}
        editedUserRole={user?.role}
      />

      <StudentInsuranceSection
        studentId={studentId}
        waiver={
          waiverRow
            ? {
                waiverSigned: Boolean(waiverRow.waiverSigned),
                waiverSignedAt: (waiverRow.waiverSignedAt as string | null) ?? null,
                signatureName: (waiverRow.signatureName as string | null) ?? null,
                signatureImageUrl: (waiverRow.signatureImageUrl as string | null) ?? null,
              }
            : null
        }
        membershipAgreement={
          agreementRow
            ? {
                agreementSigned: Boolean(agreementRow.agreementSigned),
                agreementSignedAt: (agreementRow.agreementSignedAt as string | null) ?? null,
                signatureName: (agreementRow.signatureName as string | null) ?? null,
                signatureImageUrl: (agreementRow.signatureImageUrl as string | null) ?? null,
              }
            : null
        }
        enrollmentForm={
          enrollmentRow
            ? {
                formCompleted: Boolean(enrollmentRow.formCompleted),
                formCompletedAt: (enrollmentRow.formCompletedAt as string | null) ?? null,
                taxId: (enrollmentRow.taxId as string | null) ?? null,
                idDocument: (enrollmentRow.idDocument as string | null) ?? null,
                paymentMethod: (enrollmentRow.paymentMethod as string | null) ?? null,
                debitIban: (enrollmentRow.debitIban as string | null) ?? null,
                emergencyContactName: (enrollmentRow.emergencyContactName as string | null) ?? null,
                emergencyContactPhone: (enrollmentRow.emergencyContactPhone as string | null) ?? null,
                paymentProofFileName: (enrollmentRow.paymentProofFileName as string | null) ?? null,
                paymentProofUploadedAt: (enrollmentRow.paymentProofUploadedAt as string | null) ?? null,
              }
            : null
        }
        paymentProofSignedUrl={paymentProofSignedUrl}
        coverage={
          coverageRow
            ? {
                covered: Boolean(coverageRow.covered),
                coverageStartDate: (coverageRow.coverageStartDate as string | null) ?? null,
                coverageEndDate: (coverageRow.coverageEndDate as string | null) ?? null,
                policyReference: (coverageRow.policyReference as string | null) ?? null,
                notes: (coverageRow.notes as string | null) ?? null,
              }
            : null
        }
        annualAmount={insuranceSettings.annualAmount}
        defaultPolicyReference={insuranceSettings.policyReference ?? ""}
        todayYmd={todayYmd}
      />

      {extraSessionsData && (
        <StudentExtraSessionsSection
          studentId={studentId}
          planName={extraSessionsData.planName}
          maxCheckInsPerMonth={planAccess.maxCheckInsPerMonth}
          currentReferenceMonth={extraSessionsData.currentReferenceMonth}
          used={extraSessionsData.used}
          limit={extraSessionsData.limit}
          remaining={extraSessionsData.remaining}
          extraGrants={extraSessionsData.extraGrants}
        />
      )}
    </>
  );
}
