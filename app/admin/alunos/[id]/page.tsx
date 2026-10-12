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
import { CheckCircle2, ChevronRight, Dumbbell, FileText, Settings2, Shield, Wallet } from "lucide-react";
import { loadStudentAdminSummary } from "@/lib/admin-student-ficha";
import { buildMissYouMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

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
    .select("id, userId, status, primaryModality, competitionAthlete, planId")
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

  const summary = await loadStudentAdminSummary(supabase, studentId, (student as { planId?: string | null }).planId ?? null);
  const base = `/admin/alunos/${studentId}`;
  const firstName = (user?.name ?? "").split(" ")[0] ?? "";
  const eur = (n: number) => `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;
  type Attention = { icon: React.ReactNode; text: string; action: string; href: string; external?: boolean };
  const attention: Attention[] = [];
  if (summary.tuition.lateTotal > 0)
    attention.push({ icon: <Wallet size={18} color="#f87171" aria-hidden />, text: `Mensalidade: ${summary.tuition.detail}`, action: "Registar pagamento", href: `/admin/financeiro/novo?studentId=${studentId}` });
  if (summary.fees.lateTotal > 0)
    attention.push({ icon: <Shield size={18} color="#eab308" aria-hidden />, text: `${summary.fees.title}: ${summary.fees.detail}`, action: "Ver", href: `${base}/plano-seguro` });
  if (summary.documents.missing.length)
    attention.push({ icon: <FileText size={18} color="#eab308" aria-hidden />, text: `Documentos: ${summary.documents.detail}`, action: "Ver", href: `${base}/contrato` });
  if (student.status === "ATIVO" && summary.training.tone === "red") {
    const wa = studentProfile?.phone ? buildWhatsAppUrl(studentProfile.phone, buildMissYouMessage(firstName)) : null;
    attention.push({ icon: <Dumbbell size={18} color="#f87171" aria-hidden />, text: `Sem treinar: último treino ${summary.training.detail}`, action: wa ? "WhatsApp" : "Ver", href: wa ?? `${base}/performance`, external: Boolean(wa) });
  }
  const sectionTitle: React.CSSProperties = { margin: "0 0 10px", fontSize: 13, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" };
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg)", fontSize: 14 };
  const linkStyle: React.CSSProperties = { color: "var(--primary)", fontWeight: 700, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" };

  return (
    <>
      <section style={{ marginTop: 16 }}>
        <h2 style={sectionTitle}>Precisa de atenção</h2>
        {attention.length === 0 ? (
          <div style={{ ...row, color: "var(--text-secondary)" }}>
            <CheckCircle2 size={18} color="#22c55e" aria-hidden /> Tudo em dia.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {attention.map((a) => (
              <div key={a.text} style={row}>
                {a.icon}
                <span style={{ flex: 1, minWidth: 0 }}>{a.text}</span>
                {a.external ? (
                  <a href={a.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                    {a.action}
                  </a>
                ) : (
                  <Link href={a.href} style={linkStyle}>
                    {a.action}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 style={sectionTitle}>Últimos pagamentos</h2>
          <Link href={`${base}/plano-seguro`} style={linkStyle}>
            Ver todos
          </Link>
        </div>
        {summary.recentPayments.length === 0 ? (
          <div style={{ ...row, color: "var(--text-secondary)" }}>Sem pagamentos registados.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {summary.recentPayments.map((p) => (
              <div key={p.id} style={row}>
                <span style={{ flex: 1, minWidth: 0 }}>{p.label}</span>
                <strong style={{ color: p.status === "PAID" ? "#22c55e" : p.status === "LATE" ? "#f87171" : "var(--text-secondary)", fontSize: 13 }}>
                  {eur(p.amount)} {p.status === "PAID" ? "pago" : p.status === "LATE" ? "por pagar" : p.status.toLowerCase()}
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 18 }}>
        <h2 style={sectionTitle}>Contacto</h2>
        <div style={{ ...row, flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: 0 }}>{studentProfile?.phone ?? "Sem telefone"}</span>
          {studentProfile?.emergencyContact ? <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Emergência: {studentProfile.emergencyContact}</span> : null}
        </div>
      </section>

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

      <details className="card" style={{ marginTop: 16, padding: "14px 16px" }}>
        <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <ChevronRight size={16} aria-hidden style={{ color: "var(--text-secondary)" }} /> Dados pessoais
        </summary>
        <StudentContactDataSection studentId={studentId} />
      </details>

      <details className="card" style={{ marginTop: 12, padding: "14px 16px" }}>
        <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Settings2 size={16} aria-hidden style={{ color: "var(--text-secondary)" }} /> Mais opções (assistente, atleta de competição)
        </summary>
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
      </details>
    </>
  );
}
