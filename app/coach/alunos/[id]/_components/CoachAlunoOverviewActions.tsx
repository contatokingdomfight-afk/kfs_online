import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { coachTeachesAtSchool } from "@/lib/coach-schools";
import { SchoolAssistantCoachControls } from "@/components/SchoolAssistantCoachControls";
import { CompetitionAthleteControls } from "@/components/CompetitionAthleteControls";
import { CoachAlunoEvaluateButton } from "./CoachAlunoEvaluateButton";

type Props = { studentId: string };

export async function CoachAlunoOverviewActions({ studentId }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return null;

  const result = getAdminClientOrNull();
  if (!result.client) return null;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, status, schoolId, competitionAthlete")
    .eq("id", studentId)
    .single();

  if (!student) return null;

  const { data: user } = await supabase
    .from("User")
    .select("id, role")
    .eq("id", student.userId)
    .single();

  const { data: assistRow } = await supabase
    .from("SchoolAssistantCoach")
    .select("id, revokedAt")
    .eq("studentId", studentId)
    .maybeSingle();
  const assistantActive = Boolean(assistRow?.id && assistRow.revokedAt == null);

  let canManageAssistant = dbUser.role === "ADMIN";
  if (dbUser.role === "COACH") {
    const coachId = await getCurrentCoachId();
    canManageAssistant = coachId ? await coachTeachesAtSchool(supabase, coachId, student.schoolId) : false;
  }

  return (
    <>
      <CoachAlunoEvaluateButton studentId={studentId} />

      {canManageAssistant ? (
        <SchoolAssistantCoachControls
          studentId={studentId}
          assistantActive={assistantActive}
          targetUserRole={user?.role}
          studentStatus={student.status}
        />
      ) : null}

      {canManageAssistant ? (
        <CompetitionAthleteControls
          studentId={studentId}
          active={Boolean((student as { competitionAthlete?: boolean }).competitionAthlete)}
        />
      ) : null}

    </>
  );
}
