import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getViewAsFromCookies } from "@/lib/view-as-server";

/**
 * Student a usar no dashboard quando o papel na BD não é só «ALUNO»:
 * - aluno: `Student` por `userId`;
 * - admin em «Ver como aluno»: o mesmo, ou `Coach.studentId` se o admin também for coach com perfil de aluno ligado.
 */
export async function getEffectiveDashboardStudentId(): Promise<string | null> {
  const fromUser = await getCurrentStudentId();
  if (fromUser) return fromUser;

  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return null;
  if ((await getViewAsFromCookies()) !== "aluno") return null;

  const admin = getAdminClientOrNull();
  if (!admin.client) return null;
  const { data: coach } = await admin.client.from("Coach").select("studentId").eq("userId", dbUser.id).maybeSingle();
  return typeof coach?.studentId === "string" ? coach.studentId : null;
}
