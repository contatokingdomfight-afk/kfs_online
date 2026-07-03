import { Suspense } from "react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { PerformanceStatsSection } from "./_components/PerformanceStatsSection";
import { PhysicalAssessmentSummary } from "./_components/PhysicalAssessmentSummary";
import { CoachNotes } from "./_components/CoachNotes";
import { PerformanceStatsSkeleton } from "./_components/PerformanceStatsSkeleton";
import { PhysicalAssessmentSkeleton } from "./_components/PhysicalAssessmentSkeleton";
import { CoachNotesSkeleton } from "./_components/CoachNotesSkeleton";
import { CoachStudentWellbeingSection } from "./_components/CoachStudentWellbeingSection";
import { CoachAlunoOverviewActions } from "./_components/CoachAlunoOverviewActions";
import { CoachAlunoAdminEnrollmentSection } from "./_components/CoachAlunoAdminEnrollmentSection";

type Props = { params: Promise<{ id: string }> };

export default async function CoachAlunoPerfilPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const { id: studentId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  return (
    <div style={{ maxWidth: "min(720px, 100%)" }}>
      <CoachAlunoOverviewActions studentId={studentId} />

      <CoachAlunoAdminEnrollmentSection studentId={studentId} />

      <Suspense fallback={null}>
        <CoachStudentWellbeingSection studentId={studentId} />
      </Suspense>

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
