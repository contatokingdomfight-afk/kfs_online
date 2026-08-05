import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { AdminAlunoQuickActions, EditarAlunoForm } from "@/app/admin/alunos/[id]/EditarAlunoForm";
import { StudentInsuranceSection } from "@/app/admin/alunos/[id]/StudentInsuranceSection";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { formatInTimeZone } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";
import { planRequiresPrimaryModality } from "@/lib/plan-primary-modality";

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INADIMPLENTE: "Inadimplente",
  INATIVO: "Inativo",
  EXPERIMENTAL: "Experimental",
};

type Props = { studentId: string };

/** Plano, seguro e edição de perfil — só para ADMIN na ficha do coach. */
export async function CoachAlunoAdminEnrollmentSection({ studentId }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return null;

  const result = getAdminClientOrNull();
  if (!result.client) return null;
  const supabase = result.client;

  const [{ data: schools }, { data: student }] = await Promise.all([
    supabase.from("School").select("id, name").eq("isActive", true).order("name", { ascending: true }),
    supabase
      .from("Student")
      .select("id, userId, status, planId, primaryModality, schoolId, adminGrantedFullAccess")
      .eq("id", studentId)
      .single(),
  ]);

  if (!student) return null;

  const { data: user } = await supabase
    .from("User")
    .select("id, name, email, role")
    .eq("id", student.userId)
    .single();

  const [{ data: waiverRow }, { data: agreementRow }, { data: enrollmentRow }, { data: coverageRow }, insuranceSettings] =
    await Promise.all([
    supabase
      .from("StudentWaiver")
      .select("waiverSigned, waiverSignedAt, signatureName")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase
      .from("StudentMembershipAgreement")
      .select("agreementSigned, agreementSignedAt, signatureName")
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

  const { data: plans } = await supabase
    .from("Plan")
    .select("id, name, priceMonthly, schoolId, isActive, modalityScope")
    .eq("isActive", true)
    .order("priceMonthly", { ascending: true });

  let planRows = [...(plans ?? [])];
  const currentPlanId = student.planId;
  if (currentPlanId && !planRows.some((p) => p.id === currentPlanId)) {
    const { data: currentPlan } = await supabase
      .from("Plan")
      .select("id, name, priceMonthly, schoolId, isActive, modalityScope")
      .eq("id", currentPlanId)
      .maybeSingle();
    if (currentPlan) planRows = [currentPlan, ...planRows];
  }

  const schoolIds = [...new Set(planRows.map((p) => p.schoolId).filter(Boolean))] as string[];
  const { data: plansSchools } =
    schoolIds.length > 0
      ? await supabase.from("School").select("id, name").in("id", schoolIds)
      : { data: [] as { id: string; name: string | null }[] };
  const schoolNameById = new Map((plansSchools ?? []).map((s) => [s.id, s.name ?? s.id]));

  const studentSchoolId = (student as { schoolId?: string }).schoolId ?? "";
  planRows.sort((a, b) => {
    const aHere = a.schoolId === studentSchoolId ? 0 : 1;
    const bHere = b.schoolId === studentSchoolId ? 0 : 1;
    if (aHere !== bHere) return aHere - bHere;
    return Number(a.priceMonthly) - Number(b.priceMonthly);
  });

  const planOptions = planRows.map((p) => ({
    id: p.id,
    label: `${p.name} (€${Number(p.priceMonthly).toFixed(0)}/mês) — ${schoolNameById.get(p.schoolId ?? "") ?? "Escola?"}`,
  }));

  const { data: modalityRows } = await supabase
    .from("ModalityRef")
    .select("code, name")
    .order("sortOrder", { ascending: true });
  const modalityOptions = [
    { code: "", name: "Todas as modalidades" },
    ...(modalityRows ?? []).map((r) => ({ code: r.code, name: r.name ?? r.code })),
  ];

  const studentPlan = planRows.find((p) => p.id === student.planId);
  const scope = (studentPlan as { modalityScope?: string } | undefined)?.modalityScope;
  const isPlanWithoutModality = !planRequiresPrimaryModality(scope);
  const rawPrimary = (student as { primaryModality?: string | null }).primaryModality ?? null;
  const initialPrimaryModality = isPlanWithoutModality || rawPrimary == null || rawPrimary === "" ? "" : rawPrimary;

  return (
    <>
      <AdminAlunoQuickActions
        studentId={studentId}
        initialPlanId={student.planId ?? ""}
        initialAdminGrantedFullAccess={Boolean(
          (student as { adminGrantedFullAccess?: boolean }).adminGrantedFullAccess
        )}
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
              }
            : null
        }
        membershipAgreement={
          agreementRow
            ? {
                agreementSigned: Boolean(agreementRow.agreementSigned),
                agreementSignedAt: (agreementRow.agreementSignedAt as string | null) ?? null,
                signatureName: (agreementRow.signatureName as string | null) ?? null,
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

      <details
        open
        className="aluno-edit-details"
        style={{
          marginTop: "clamp(24px, 6vw, 32px)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--bg-secondary)",
          overflow: "hidden",
        }}
      >
        <summary
          style={{
            padding: "clamp(14px, 3.5vw, 18px)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            fontWeight: 600,
            color: "var(--text-primary)",
            cursor: "pointer",
            listStyle: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ opacity: 0.8 }} aria-hidden>
            ▼
          </span>
          Editar dados do aluno
        </summary>
        <div
          style={{
            padding: "0 clamp(14px, 3.5vw, 18px) clamp(14px, 3.5vw, 18px) clamp(14px, 3.5vw, 18px)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <EditarAlunoForm
            studentId={studentId}
            initialName={user?.name ?? ""}
            initialStatus={student.status}
            initialSchoolId={(student as { schoolId?: string }).schoolId ?? ""}
            schoolOptions={(schools ?? []).map((s) => ({ id: s.id, name: s.name ?? s.id }))}
            initialPlanId={student.planId ?? ""}
            initialPrimaryModality={initialPrimaryModality}
            planOptions={planOptions}
            modalityOptions={modalityOptions}
            statusLabels={STATUS_LABEL}
          />
        </div>
      </details>

      <p style={{ margin: "16px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
        <Link href={`/admin/alunos/${studentId}`} style={{ color: "var(--primary)", fontWeight: 600 }}>
          Abrir ficha completa na administração
        </Link>
        {" — "}estatísticas de performance e mais opções.
      </p>
    </>
  );
}
