import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { AdminAlunoQuickActions, EditarAlunoForm } from "./EditarAlunoForm";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import {
  type ModalityConfig,
  GENERAL_PERFORMANCE_AXES,
  computeGeneralPerformanceScores,
  getAttendanceByModality,
} from "@/lib/performance-utils";
import { RadarStats } from "@/components/fighter/RadarStatsDynamic";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";
import { AvaliarAlunoButton } from "@/app/coach/alunos/[id]/AvaliarAlunoButton";
import { getPlanAccess } from "@/lib/plan-access";
import { filterModalitiesForStudentEvaluation } from "@/lib/coach-student-evaluation-modalities";
import { DeleteStudentButton } from "./DeleteStudentButton";
import { planRequiresPrimaryModality } from "@/lib/plan-primary-modality";
import { SchoolAssistantCoachControls } from "@/components/SchoolAssistantCoachControls";
import { SchoolAssistantBadge } from "@/components/SchoolAssistantBadge";
import { StudentInsuranceSection } from "./StudentInsuranceSection";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { formatInTimeZone } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";
import { getFamilyContext } from "@/lib/family-group";

const GENERAL_LAST_N = 10;

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INADIMPLENTE: "Inadimplente",
  INATIVO: "Inativo",
  EXPERIMENTAL: "Experimental",
};

type Props = { params: Promise<{ id: string }> };

export default async function AdminAlunoEditarPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: studentId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: schools } = await supabase
    .from("School")
    .select("id, name")
    .eq("isActive", true)
    .order("name", { ascending: true });

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, status, planId, primaryModality, schoolId, adminGrantedFullAccess")
    .eq("id", studentId)
    .single();

  if (!student) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Aluno não encontrado.</p>
        <Link href="/admin/alunos" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar à lista
        </Link>
      </div>
    );
  }

  const { data: user } = await supabase
    .from("User")
    .select("id, name, email, role, avatarUrl")
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
        "formCompleted, formCompletedAt, taxId, idDocument, paymentMethod, debitIban, emergencyContactName, emergencyContactPhone"
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

  const todayYmd = formatInTimeZone(new Date(), LISBON_TZ, "yyyy-MM-dd");

  const familyCtx = await getFamilyContext(supabase, studentId);

  const { data: studentProfile } = await supabase
    .from("StudentProfile")
    .select("weightKg, heightCm, medicalNotes, emergencyContact, phone")
    .eq("studentId", studentId)
    .maybeSingle();

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

  const allConfigs = await loadAllEvaluationConfigs(supabase);
  const evaluationConfigByModality: Record<string, ModalityEvaluationConfigPayload | null> = {};
  for (const m of modalityRows ?? []) {
    evaluationConfigByModality[m.code] = allConfigs.get(m.code) ?? null;
  }
  const planAccess = await getPlanAccess(supabase, studentId);
  const modalitiesForEvaluate = filterModalitiesForStudentEvaluation(
    modalityRows ?? [],
    evaluationConfigByModality,
    planAccess.allowedModalities
  );

  // Performance: athlete + evaluations → radar e última avaliação (para pré-preencher modal)
  let generalPerformanceScores: Record<string, number> | null = null;
  let lastEvalScoresByModality: Record<string, Record<string, number>> = {};
  let lastEvalDate: string | null = null;
  let evaluationCount = 0;
  const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).single();
  if (athlete) {
    const { data: evalsRows } = await supabase
      .from("AthleteEvaluation")
      .select("gas, technique, strength, theory, scores, modality, created_at")
      .eq("athleteId", athlete.id)
      .order("created_at", { ascending: false })
      .limit(GENERAL_LAST_N);
    const evaluations = (evalsRows ?? []).map((e) => ({
      gas: e.gas,
      technique: e.technique,
      strength: e.strength,
      theory: e.theory,
      scores: e.scores as Record<string, number> | null,
      modality: e.modality,
      created_at: (e as { created_at?: string }).created_at,
    }));
    evaluationCount = evaluations.length;
    if (evaluations.length > 0) {
      lastEvalDate = evaluations[0].created_at ?? null;
      for (const e of evaluations) {
        const mod = e.modality ?? "";
        if (mod && e.scores && typeof e.scores === "object" && Object.keys(e.scores).length > 0 && !lastEvalScoresByModality[mod]) {
          lastEvalScoresByModality[mod] = e.scores;
        }
      }
    }
    const configByModality = new Map<string, ModalityConfig>();
    for (const row of modalityRows ?? []) {
      const config = allConfigs.get(row.code);
      if (config) {
        configByModality.set(row.code, {
          criterionToCategory: getCriterionToCategory(config),
          criterionToDimensionCode: getCriterionToDimensionCode(config),
        });
      }
    }
    if (evaluations.length > 0) {
      generalPerformanceScores = computeGeneralPerformanceScores(evaluations, configByModality, GENERAL_LAST_N, true);
    }
  }
  const attendanceByModality = await getAttendanceByModality(supabase, studentId);
  const hasPerformance = generalPerformanceScores && Object.keys(generalPerformanceScores).length > 0;

  const modalityNameFor = (code: string) => modalityOptions.find((m) => m.code === code)?.name ?? MODALITY_LABELS[code] ?? code;

  const profileForModal = {
    name: user?.name ?? "",
    email: user?.email ?? "",
    avatarUrl: (user as { avatarUrl?: string | null } | undefined)?.avatarUrl ?? null,
    phone: studentProfile?.phone ?? null,
    weightKg: studentProfile?.weightKg != null ? Number(studentProfile.weightKg) : null,
    heightCm: studentProfile?.heightCm != null ? Number(studentProfile.heightCm) : null,
    medicalNotes: studentProfile?.medicalNotes ?? null,
    emergencyContact: studentProfile?.emergencyContact ?? null,
  };

  const { data: assistRow } = await supabase
    .from("SchoolAssistantCoach")
    .select("id, revokedAt")
    .eq("studentId", studentId)
    .maybeSingle();
  const assistantActive = Boolean(assistRow?.id && assistRow.revokedAt == null);

  return (
    <div style={{ maxWidth: "min(420px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/alunos"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
      </div>
      <h1 style={{ margin: "0 0 4px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {user?.name || "Aluno"}
      </h1>
      <p style={{ margin: "0 0 8px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {user?.email}
      </p>
      {assistantActive ? (
        <div style={{ marginTop: 4, marginBottom: 4, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <SchoolAssistantBadge active />
        </div>
      ) : null}
      {familyCtx ? (
        <div style={{ marginTop: 8, marginBottom: 4 }}>
          <Link
            href={`/admin/familias/${familyCtx.group.id}`}
            className="card"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              textDecoration: "none",
              color: "inherit",
              fontSize: 14,
            }}
          >
            <span style={{ fontWeight: 600 }}>
              Plano família — {familyCtx.isTitular ? "titular" : "membro"}
            </span>
            <span style={{ color: "var(--text-secondary)" }}>
              {familyCtx.group.name || "Grupo familiar"} · {familyCtx.memberCount}{" "}
              {familyCtx.memberCount === 1 ? "membro" : "membros"}
            </span>
          </Link>
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 8,
          marginTop: 12,
          width: "100%",
          alignItems: "stretch",
        }}
      >
        <AvaliarAlunoButton
          stretchInRow
          studentId={studentId}
          profile={profileForModal}
          primaryModality={rawPrimary}
          modalities={modalitiesForEvaluate}
          evaluationConfigByModality={evaluationConfigByModality}
          lastEvalScoresByModality={Object.keys(lastEvalScoresByModality).length > 0 ? lastEvalScoresByModality : undefined}
          successRedirectHref={`/coach/alunos/${studentId}/performance`}
        />
        <Link
          href={`/coach/alunos/${studentId}/avaliacao-fisica?next=${encodeURIComponent(`/admin/alunos/${studentId}`)}`}
          className="btn btn-secondary"
          style={{
            flex: 1,
            minWidth: 0,
            marginTop: 0,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            minHeight: 44,
          }}
        >
          Avaliação Física
        </Link>
      </div>

      <SchoolAssistantCoachControls
        studentId={studentId}
        assistantActive={assistantActive}
        targetUserRole={user?.role}
        studentStatus={student.status}
      />

      <section
        className="card"
        style={{
          marginTop: "clamp(20px, 5vw, 24px)",
          padding: "clamp(20px, 5vw, 24px)",
        }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Estatísticas de performance
        </h2>
        {hasPerformance && generalPerformanceScores ? (
          <>
            <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-primary)" }}>
              Últimas avaliações: {evaluationCount}
              {lastEvalDate && (
                <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>
                  {" "}
                  · Última: {new Date(lastEvalDate).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
            )}
            </p>
            <p style={{ margin: "0 0 16px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
              Média das últimas {GENERAL_LAST_N} avaliações (escala 1–10).
            </p>
            <RadarStats
              scores={generalPerformanceScores}
              axes={[...GENERAL_PERFORMANCE_AXES]}
              maxScore={10}
              embedded
            />
            <Link
              href={`/coach/alunos/${studentId}/performance`}
              className="btn btn-secondary"
              style={{ marginTop: "clamp(12px, 3vw, 16px)", textDecoration: "none", alignSelf: "flex-start" }}
            >
              Ver mais detalhes
            </Link>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-primary)" }}>
              Últimas avaliações: {evaluationCount}
            </p>
            <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
              Ainda não há avaliações registadas para este aluno. As avaliações feitas pelo coach nas aulas aparecem aqui.
            </p>
          </>
        )}
        {Object.keys(attendanceByModality).length > 0 && (
          <div style={{ marginTop: "clamp(16px, 4vw, 20px)", paddingTop: "clamp(12px, 3vw, 16px)", borderTop: "1px solid var(--border)" }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-primary)" }}>
              Presenças confirmadas por modalidade
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.2em", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {Object.entries(attendanceByModality)
                .sort((a, b) => b[1] - a[1])
                .map(([mod, count]) => (
                  <li key={mod}>
                    {modalityNameFor(mod)}: {count}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

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
              }
            : null
        }
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
          <span style={{ opacity: 0.8 }} aria-hidden>▼</span>
          Editar dados do aluno
        </summary>
        <div style={{ padding: "0 clamp(14px, 3.5vw, 18px) clamp(14px, 3.5vw, 18px) clamp(14px, 3.5vw, 18px)", borderTop: "1px solid var(--border)" }}>
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

      {user?.role === "ALUNO" && (
        <DeleteStudentButton
          studentId={studentId}
          studentName={user?.name ?? ""}
          studentEmail={user?.email ?? ""}
        />
      )}
    </div>
  );
}
