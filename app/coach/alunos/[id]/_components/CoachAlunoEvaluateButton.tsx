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

  const [{ data: user }, { data: studentProfile }, allConfigs, { data: modalityRefs }] = await Promise.all([
    supabase.from("User").select("id, name, email, avatarUrl").eq("id", student.userId).single(),
    supabase
      .from("StudentProfile")
      .select("weightKg, heightCm, medicalNotes, emergencyContact, phone")
      .eq("studentId", studentId)
      .maybeSingle(),
    loadAllEvaluationConfigs(supabase),
    supabase.from("ModalityRef").select("code, name").order("sortOrder", { ascending: true }),
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

  return (
    <div style={{ marginTop: 12, marginBottom: 12 }}>
      <AvaliarAlunoButton
        studentId={studentId}
        profile={profileForModal}
        primaryModality={primaryModality ?? null}
        modalities={modalitiesForEvaluate}
        evaluationConfigByModality={evaluationConfigByModality}
        stretchInRow={stretchInRow}
        successRedirectHref={successRedirectHref}
      />
    </div>
  );
}
