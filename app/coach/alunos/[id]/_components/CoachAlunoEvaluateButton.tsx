import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import { getPlanAccess } from "@/lib/plan-access";
import { filterModalitiesForStudentEvaluation } from "@/lib/coach-student-evaluation-modalities";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";
import { AvaliarAlunoButton } from "../AvaliarAlunoButton";

type Props = {
  studentId: string;
  stretchInRow?: boolean;
  successRedirectHref?: string;
};

export async function CoachAlunoEvaluateButton({
  studentId,
  stretchInRow = false,
  successRedirectHref,
}: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) return null;

  const result = getAdminClientOrNull();
  if (!result.client) return null;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, primaryModality")
    .eq("id", studentId)
    .single();

  if (!student) return null;

  const [{ data: user }, { data: studentProfile }, allConfigs, { data: modalityRefs }, { data: athlete }] = await Promise.all([
    supabase.from("User").select("id, name, email, avatarUrl").eq("id", student.userId).single(),
    supabase
      .from("StudentProfile")
      .select("weightKg, heightCm, medicalNotes, emergencyContact, phone")
      .eq("studentId", studentId)
      .maybeSingle(),
    loadAllEvaluationConfigs(supabase),
    supabase.from("ModalityRef").select("code, name").order("sortOrder", { ascending: true }),
    supabase.from("Athlete").select("id").eq("studentId", studentId).maybeSingle(),
  ]);

  const evaluationConfigByModality: Record<string, ModalityEvaluationConfigPayload | null> = {};
  for (const m of modalityRefs ?? []) {
    evaluationConfigByModality[m.code] = allConfigs.get(m.code) ?? null;
  }

  const planAccess = await getPlanAccess(supabase, studentId);
  const modalitiesForEvaluate = filterModalitiesForStudentEvaluation(
    modalityRefs ?? [],
    evaluationConfigByModality,
    planAccess.allowedModalities
  );

  const primaryModality = planAccess.primaryModality ?? (student as { primaryModality?: string | null }).primaryModality;

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

  // Última avaliação (scores) por modalidade para pré-preencher o modal em reavaliações.
  // Sem isto, o formulário abria sempre no baseline em vez de trazer a avaliação anterior.
  const lastEvalScoresByModality: Record<string, Record<string, number>> = {};
  if (athlete) {
    const { data: lastEvals } = await supabase
      .from("AthleteEvaluation")
      .select("scores, modality, created_at")
      .eq("athleteId", athlete.id)
      .not("scores", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);
    for (const e of lastEvals ?? []) {
      const mod = (e as { modality: string | null }).modality ?? "";
      const scores = (e as { scores: Record<string, number> | null }).scores;
      if (mod && scores && typeof scores === "object" && Object.keys(scores).length > 0 && !lastEvalScoresByModality[mod]) {
        lastEvalScoresByModality[mod] = scores;
      }
    }
  }

  return (
    <div style={{ marginTop: 12, marginBottom: 12 }}>
      <AvaliarAlunoButton
        studentId={studentId}
        profile={profileForModal}
        primaryModality={primaryModality ?? null}
        modalities={modalitiesForEvaluate}
        evaluationConfigByModality={evaluationConfigByModality}
        lastEvalScoresByModality={Object.keys(lastEvalScoresByModality).length > 0 ? lastEvalScoresByModality : undefined}
        stretchInRow={stretchInRow}
        successRedirectHref={successRedirectHref}
      />
    </div>
  );
}
