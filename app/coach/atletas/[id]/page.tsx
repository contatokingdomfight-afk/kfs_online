import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { redirect } from "next/navigation";
import { getAttendanceByModality } from "@/lib/performance-utils";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { EditarAtletaForm } from "./EditarAtletaForm";
import { ComentariosAtleta } from "./ComentariosAtleta";
import { PerformanceRadar } from "@/components/PerformanceRadar";
import { AvaliacaoAtleta } from "./AvaliacaoAtleta";
import { computeMovingAverage, getRadarAxes } from "@/lib/evaluation-config";
import { loadEvaluationConfigForModality } from "@/lib/load-evaluation-config";

const LEVEL_LABEL: Record<string, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};

type Props = { params: Promise<{ id: string }> };

export default async function CoachAtletaPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: athleteId } = await params;
  const supabase = await createClient();

  const { data: athlete } = await supabase.from("Athlete").select("id, studentId, level, mainCoachId").eq("id", athleteId).single();

  if (!athlete) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Atleta não encontrado.</p>
        <Link href="/coach/atletas" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  const coachId = await getCurrentCoachId();
  if (dbUser.role === "COACH" && coachId && athlete.mainCoachId !== coachId) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Não tens acesso a este atleta.</p>
        <Link href="/coach/atletas" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  const { data: student } = await supabase.from("Student").select("id, userId").eq("id", athlete.studentId).single();
  const { data: user } = student
    ? await supabase.from("User").select("id, name, email").eq("id", student.userId).single()
    : { data: null };

  const { data: comments } = await supabase
    .from("Comment")
    .select("id, content, createdAt, authorCoachId")
    .eq("targetType", "ATHLETE")
    .eq("targetId", athleteId)
    .order("createdAt", { ascending: false });

  const commentList = comments ?? [];
  const coachIds = [...new Set(commentList.map((c) => c.authorCoachId))];
  const { data: coaches } = await supabase.from("Coach").select("id, userId").in("id", coachIds);
  const userIds = [...new Set((coaches ?? []).map((c) => c.userId))];
  const { data: coachUsers } = await supabase.from("User").select("id, name").in("id", userIds);
  const coachNameById = new Map((coachUsers ?? []).map((u) => [u.id, u.name]));
  const coachIdByCoach = new Map((coaches ?? []).map((c) => [c.id, c.userId]));
  const authorNames = new Map(
    commentList.map((c) => {
      const uid = coachIdByCoach.get(c.authorCoachId);
      return [c.id, uid ? coachNameById.get(uid) ?? "Coach" : "Coach"];
    })
  );

  let coachOptions: { id: string; name: string }[] = [];
  if (dbUser.role === "ADMIN") {
    const { data: allCoaches } = await supabase.from("Coach").select("id, userId");
    const allUserIds = [...new Set((allCoaches ?? []).map((c) => c.userId))];
    const { data: allCoachUsers } = await supabase.from("User").select("id, name").in("id", allUserIds);
    const nameByUserId = new Map((allCoachUsers ?? []).map((u) => [u.id, u.name]));
    coachOptions = (allCoaches ?? []).map((c) => ({
      id: c.id,
      name: nameByUserId.get(c.userId) ?? c.userId,
    }));
  }

  const { data: lastPhysicalAssessment } = await supabase
    .from("StudentPhysicalAssessment")
    .select("assessedAt, nextDueAt, clearance")
    .eq("studentId", athlete.studentId)
    .order("assessedAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: evaluations } = await supabase
    .from("AthleteEvaluation")
    .select("id, gas, technique, strength, theory, note, created_at, modality, scores")
    .eq("athleteId", athleteId)
    .order("created_at", { ascending: false })
    .limit(20);
  const evaluationList = evaluations ?? [];
  const latestEval = evaluationList[0] ?? null;
  const attendanceByModality = await getAttendanceByModality(supabase, athlete.studentId);

  const MOVING_AVERAGE_N = 10;
  let radarModality: string | null = null;
  let radarConfig: Awaited<ReturnType<typeof loadEvaluationConfigForModality>> = null;
  const evalsWithScores = evaluationList.filter((e) => e.scores && typeof e.scores === "object");
  if (evalsWithScores.length > 0) {
    radarModality = (evalsWithScores[0] as { modality?: string | null }).modality ?? null;
    if (radarModality) radarConfig = await loadEvaluationConfigForModality(supabase, radarModality);
  }
  const criterionIds = radarConfig ? getRadarAxes(radarConfig).map((a) => a.id) : [];
  const movingAverageScores =
    radarConfig && criterionIds.length > 0
      ? computeMovingAverage(
          evaluationList.map((e) => ({ scores: (e as { scores?: Record<string, number> | null }).scores ?? null })),
          criterionIds,
          MOVING_AVERAGE_N
        )
      : null;
  const radarAxes = radarConfig ? getRadarAxes(radarConfig) : [];
  const showDynamicRadar = radarAxes.length > 0 && movingAverageScores && Object.keys(movingAverageScores).length > 0;
  const showLegacyRadar =
    latestEval &&
    (latestEval.gas != null || latestEval.technique != null || latestEval.strength != null || latestEval.theory != null) &&
    !showDynamicRadar;

  return (
    <div style={{ maxWidth: "min(560px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/coach/atletas"
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
        {user?.name || user?.email || "Atleta"}
      </h1>
      {user?.email && (
        <p style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {user.email}
        </p>
      )}

      <section style={{ marginBottom: "clamp(24px, 6vw, 32px)" }}>
        <h2 style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {dbUser.role === "ADMIN" ? "Nível e coach responsável" : "Nível"}
        </h2>
        <EditarAtletaForm
          athleteId={athleteId}
          initialLevel={athlete.level}
          levelLabels={LEVEL_LABEL}
          coaches={coachOptions.length > 0 ? coachOptions : undefined}
          initialMainCoachId={athlete.mainCoachId}
        />
      </section>

      <section style={{ marginBottom: "clamp(24px, 6vw, 32px)" }}>
        <h2 style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Avaliação física
        </h2>
        <p style={{ margin: "0 0 12px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          Ficha de anamnese e avaliação inicial. Obrigatória a cada 6 meses.
        </p>
        {lastPhysicalAssessment && (
          <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-primary)" }}>
            Última: {String(lastPhysicalAssessment.assessedAt).slice(0, 10)} · Próxima: {String(lastPhysicalAssessment.nextDueAt).slice(0, 10)}
          </p>
        )}
        <Link
          href={`/coach/alunos/${athlete.studentId}/avaliacao-fisica`}
          className="btn btn-secondary"
          style={{ textDecoration: "none" }}
        >
          {lastPhysicalAssessment ? "Nova avaliação física" : "Realizar avaliação física"}
        </Link>
      </section>

      <section style={{ marginBottom: "clamp(24px, 6vw, 32px)" }}>
        <h2 style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Performance
        </h2>
        <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {showDynamicRadar
            ? `Média móvel (últimas ${MOVING_AVERAGE_N} avaliações)${radarModality ? ` · ${MODALITY_LABELS[radarModality] ?? radarModality}` : ""}.`
            : "Avaliação e assiduidade por modalidade."}
        </p>
        {showDynamicRadar && movingAverageScores ? (
          <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)", marginBottom: "clamp(16px, 4vw, 20px)" }}>
            <p style={{ margin: "0 0 12px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
              Média móvel (1–10)
            </p>
            <PerformanceRadar scores={movingAverageScores} axes={radarAxes} maxScore={10} />
          </div>
        ) : showLegacyRadar && latestEval ? (
          <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)", marginBottom: "clamp(16px, 4vw, 20px)" }}>
            <p style={{ margin: "0 0 12px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
              Última avaliação
            </p>
            <PerformanceRadar
              scores={{
                gas: latestEval.gas ?? 1,
                technique: latestEval.technique ?? 1,
                strength: latestEval.strength ?? 1,
                theory: latestEval.theory ?? 1,
              }}
            />
            {latestEval.note && (
              <p style={{ margin: "12px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                {latestEval.note}
              </p>
            )}
          </div>
        ) : (
          <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
            Ainda sem avaliação. Regista a primeira na aula ou abaixo.
          </p>
        )}
        {Object.keys(attendanceByModality).length > 0 && (
          <div className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", marginBottom: "clamp(16px, 4vw, 20px)" }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
              Presenças confirmadas por modalidade
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              {Object.entries(attendanceByModality).map(([mod, count]) => (
                <li key={mod} style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
                  <span style={{ color: "var(--text-primary)" }}>{MODALITY_LABELS[mod] ?? mod}</span>
                  <span style={{ color: "var(--primary)", fontWeight: 600 }}>{count} aulas</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(coachId || dbUser.role === "ADMIN") && <AvaliacaoAtleta athleteId={athleteId} />}
        {evaluationList.length > 1 && (
          <div style={{ marginTop: "clamp(16px, 4vw, 20px)" }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
              Avaliações anteriores
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {evaluationList.slice(1, 5).map((e) => {
                const ev = e as { scores?: Record<string, number> | null; modality?: string | null; gas?: number | null; technique?: number | null; strength?: number | null; theory?: number | null; note?: string | null; created_at: string };
                const hasScores = ev.scores && typeof ev.scores === "object" && Object.keys(ev.scores).length > 0;
                const hasLegacy = ev.gas != null || ev.technique != null || ev.strength != null || ev.theory != null;
                return (
                  <li key={e.id} className="card" style={{ padding: "clamp(12px, 3vw, 16px)" }}>
                    <p style={{ margin: 0, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-primary)" }}>
                      {hasScores
                        ? `Critérios (${Object.keys(ev.scores!).length} eixos)${ev.modality ? ` · ${MODALITY_LABELS[ev.modality] ?? ev.modality}` : ""}`
                        : hasLegacy
                          ? `Gás ${ev.gas ?? "-"} · Técnica ${ev.technique ?? "-"} · Força ${ev.strength ?? "-"} · Teoria ${ev.theory ?? "-"}`
                          : "—"}
                      {ev.note && ` — ${ev.note.slice(0, 60)}${ev.note.length > 60 ? "…" : ""}`}
                    </p>
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                      {new Date(ev.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2 style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Comentários
        </h2>
        <ComentariosAtleta
          athleteId={athleteId}
          comments={commentList.map((c) => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt,
            authorName: authorNames.get(c.id) ?? "Coach",
          }))}
          canAdd={!!coachId}
        />
      </section>
    </div>
  );
}
