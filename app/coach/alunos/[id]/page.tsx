import Link from "next/link";
import { Suspense } from "react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";
import { AvaliarAlunoButton } from "./AvaliarAlunoButton";
import { PerformanceStatsSection } from "./_components/PerformanceStatsSection";
import { PhysicalAssessmentSummary } from "./_components/PhysicalAssessmentSummary";
import { CoachNotes } from "./_components/CoachNotes";
import { PerformanceStatsSkeleton } from "./_components/PerformanceStatsSkeleton";
import { PhysicalAssessmentSkeleton } from "./_components/PhysicalAssessmentSkeleton";
import { CoachNotesSkeleton } from "./_components/CoachNotesSkeleton";

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

  const [{ data: user }, { data: studentProfile }, planRes, allConfigs] = await Promise.all([
    supabase.from("User").select("id, name, email, avatarUrl").eq("id", student.userId).single(),
    supabase.from("StudentProfile").select("weightKg, heightCm, medicalNotes, emergencyContact, phone").eq("studentId", studentId).maybeSingle(),
    student.planId ? supabase.from("Plan").select("name").eq("id", student.planId).single() : Promise.resolve({ data: null }),
    loadAllEvaluationConfigs(supabase),
  ]);

  const planName = planRes.data?.name ?? null;
  const evaluationConfigByModality: Record<string, ModalityEvaluationConfigPayload | null> = {
    MUAY_THAI: allConfigs.get("MUAY_THAI") ?? null,
    BOXING: allConfigs.get("BOXING") ?? null,
    KICKBOXING: allConfigs.get("KICKBOXING") ?? null,
  };

  const primaryModality = (student as { primaryModality?: string | null }).primaryModality;

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
      <AvaliarAlunoButton
        studentId={studentId}
        profile={profileForModal}
        primaryModality={primaryModality ?? null}
        evaluationConfigByModality={evaluationConfigByModality}
      />

      <Suspense fallback={<PerformanceStatsSkeleton />}>
        <PerformanceStatsSection studentId={studentId} />
      </Suspense>

      <Suspense fallback={<PhysicalAssessmentSkeleton />}>
        <PhysicalAssessmentSummary studentId={studentId} />
      </Suspense>

      <Suspense fallback={<CoachNotesSkeleton />}>
        <CoachNotes studentId={studentId} />
      </Suspense>
    </div>
  );
}
