import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadEvaluationConfigForModality } from "@/lib/load-evaluation-config";
import {
  GENERAL_PERFORMANCE_AXES,
  computeGeneralPerformanceScores,
  getAttendanceByModality,
} from "@/lib/performance-utils";
import { RadarStats } from "@/components/fighter/RadarStats";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

const GENERAL_LAST_N = 10;

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  EXPERIMENTAL: "Experimental",
};

type Props = { params: Promise<{ id: string }> };

export default async function CoachAlunoPerfilPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const { id: studentId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, status, planId, primaryModality")
    .eq("id", studentId)
    .single();

  if (!student) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Aluno não encontrado.</p>
        <Link href="/coach/alunos" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar à lista
        </Link>
      </div>
    );
  }

  const { data: user } = await supabase.from("User").select("id, name, email").eq("id", student.userId).single();

  let planName: string | null = null;
  if (student.planId) {
    const { data: plan } = await supabase.from("Plan").select("name").eq("id", student.planId).single();
    planName = plan?.name ?? null;
  }

  // Performance
  let generalPerformanceScores: Record<string, number> | null = null;
  const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).single();
  if (athlete) {
    const { data: evalsRows } = await supabase
      .from("AthleteEvaluation")
      .select("gas, technique, strength, theory, scores, modality")
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
    }));
    const configByModality = new Map<string, { criterionToCategory: Map<string, string> }>();
    for (const mod of ["MUAY_THAI", "BOXING", "KICKBOXING"]) {
      const config = await loadEvaluationConfigForModality(supabase, mod);
      if (config) configByModality.set(mod, { criterionToCategory: getCriterionToCategory(config), criterionToDimensionCode: getCriterionToDimensionCode(config) });
    }
    if (evaluations.length > 0) {
      generalPerformanceScores = computeGeneralPerformanceScores(evaluations, configByModality, GENERAL_LAST_N, true);
    }
  }
  const attendanceByModality = await getAttendanceByModality(supabase, studentId);
  const hasPerformance = generalPerformanceScores && Object.keys(generalPerformanceScores).length > 0;

  const { data: lastAssessment } = await supabase
    .from("StudentPhysicalAssessment")
    .select("assessedAt, nextDueAt, clearance")
    .eq("studentId", studentId)
    .order("assessedAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  const primaryModality = (student as { primaryModality?: string | null }).primaryModality;
  const today = new Date().toISOString().slice(0, 10);
  const assessmentDue = !lastAssessment || (lastAssessment.nextDueAt != null && lastAssessment.nextDueAt <= today);

  return (
    <div style={{ maxWidth: "min(420px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/coach/alunos"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar à lista
        </Link>
      </div>
      <h1 style={{ margin: "0 0 4px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Perfil do aluno
      </h1>
      <p style={{ margin: "0 0 4px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {user?.email}
      </p>
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <span
          style={{
            fontSize: "clamp(12px, 3vw, 14px)",
            padding: "4px 10px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-primary)",
          }}
        >
          {STATUS_LABEL[student.status] ?? student.status}
        </span>
        {planName && (
          <span
            style={{
              fontSize: "clamp(12px, 3vw, 14px)",
              padding: "4px 10px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--surface)",
              color: "var(--text-primary)",
            }}
          >
            {planName}
          </span>
        )}
        {primaryModality && (
          <span
            style={{
              fontSize: "clamp(12px, 3vw, 14px)",
              padding: "4px 10px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--surface)",
              color: "var(--text-primary)",
            }}
          >
            {MODALITY_LABELS[primaryModality] ?? primaryModality}
          </span>
        )}
      </div>

      <section
        className="card"
        style={{
          marginTop: "clamp(24px, 6vw, 32px)",
          padding: "clamp(20px, 5vw, 24px)",
        }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Estatísticas de performance
        </h2>
        {hasPerformance ? (
          <>
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
          <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
            Ainda não há avaliações registadas para este aluno. As avaliações feitas pelo coach nas aulas aparecem aqui.
          </p>
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
                    {MODALITY_LABELS[mod] ?? mod}: {count}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

      <section
        className="card"
        style={{
          marginTop: "clamp(16px, 4vw, 20px)",
          padding: "clamp(20px, 5vw, 24px)",
        }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Avaliação física
        </h2>
        <p style={{ margin: "0 0 12px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
          Ficha de anamnese e avaliação inicial. Obrigatória a cada 6 meses.
        </p>
        {lastAssessment ? (
          <>
            <p style={{ margin: "0 0 4px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-primary)" }}>
              Última: {String(lastAssessment.assessedAt).slice(0, 10)}
              {lastAssessment.clearance && ` · ${lastAssessment.clearance === "APTO" ? "Apto" : lastAssessment.clearance === "APTO_RESTRICOES" ? "Apto c/ restrições" : "Aval. médica"}`}
            </p>
            <p style={{ margin: "0 0 12px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
              Próxima renovação: {String(lastAssessment.nextDueAt).slice(0, 10)}
              {assessmentDue && " (em atraso)"}
            </p>
          </>
        ) : (
          <p style={{ margin: "0 0 12px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
            Nenhuma avaliação física registada.
          </p>
        )}
        <Link
          href={`/coach/alunos/${studentId}/avaliacao-fisica`}
          className="btn btn-primary"
          style={{ textDecoration: "none", alignSelf: "flex-start" }}
        >
          {lastAssessment ? "Nova avaliação física" : "Realizar avaliação física"}
        </Link>
      </section>
    </div>
  );
}
