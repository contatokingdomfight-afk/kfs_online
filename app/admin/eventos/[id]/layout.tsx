import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getSchoolScope, canAccessSchool } from "@/lib/school-scope";

/** Multi-escola: evento de outra escola — volta à lista. Eventos da rede (schoolId null) ficam visíveis. */
export default async function AdminEventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await getSchoolScope();
  if (scope.kind !== "network") {
    const admin = getAdminClientOrNull().client;
    const { data: event } = admin ? await admin.from("Event").select("schoolId").eq("id", id).maybeSingle() : { data: null };
    if (event && event.schoolId != null && !canAccessSchool(scope, event.schoolId as string)) redirect("/admin/eventos");
  }
  return children;
}
