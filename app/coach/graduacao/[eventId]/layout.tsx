import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getSchoolScope, canAccessSchool } from "@/lib/school-scope";

/** Multi-escola: exame (e avaliações/resultados) de outra escola — volta à lista antes de renderizar. */
export default async function ExamEventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const scope = await getSchoolScope();
  if (scope.kind !== "network") {
    const admin = getAdminClientOrNull().client;
    const { data: event } = admin
      ? await admin.from("GraduationExamEvent").select("schoolId").eq("id", eventId).maybeSingle()
      : { data: null };
    if (!event || !canAccessSchool(scope, event.schoolId as string | null)) redirect("/coach/graduacao");
  }
  return children;
}
