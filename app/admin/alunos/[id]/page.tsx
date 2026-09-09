import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
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
import { SchoolAssistantCoachControls } from "@/components/SchoolAssistantCoachControls";
import { CompetitionAthleteControls } from "@/components/CompetitionAthleteControls";
import { StudentContactDataSection } from "@/components/students/StudentContactDataSection";
import Link from "next/link";

const GENERAL_LAST_N = 10;

type Props = { params: Promise<{ id: string }> };

export default async function AdminAlunoOverviewPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: studentId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, status, primaryModality, competitionAthlete")
    .eq("id", studentId)
    .single();

  if (!student) return null;

  const { data: user } = await supabase
    .from("User")
    .select("id, name, email, role, avatarUrl")
    .eq("id", student.userId)
    .single();
  const { data: studentProfile } = await supabase
    .from("StudentProfile")
    .select("weightKg, heightCm, medicalNotes, emergencyContact, phone")
    .eq("studentId", studentId)
    .maybeSingle();
  const { data: modalityRows } = await supabase
    .from("ModalityRef")
    .select("code, name")
    .order("sortOrder", { ascending: true });
  const modalityOptions = [
    { code: "", name: "Todas as modalidades" },
    ...(modalityRows ?? []).map((r) => ({ code: r.code, name: r.name ?? r.code })),
  ];

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

  const rawPrimary = (student as { primaryModality?: string | null }).primaryModality ?? null;

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
    <>
      <StudentContactDataSection studentId={studentId} />

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
          successRedirectHref={`/admin/alunos/${studentId}/performance`}
        />
        <Link
          href={`/admin/alunos/${studentId}/avaliacao-fisica`}
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

      <CompetitionAthleteControls
        studentId={studentId}
        active={Boolean((student as { competitionAthlete?: boolean }).competitionAthlete)}
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
              href={`/admin/alunos/${studentId}/performance`}
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
    </>
  );
}
