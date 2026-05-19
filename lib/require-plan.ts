import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveDashboardStudentId } from "@/lib/auth/effective-dashboard-student-id";

/**
 * Redireciona para /escolher-plano se o aluno não tiver plano.
 * Usar no topo de páginas restritas (biblioteca, loja, etc.).
 */
export async function requirePlan(): Promise<void> {
  const studentId = await getEffectiveDashboardStudentId();
  if (!studentId) return;
  const supabase = await createClient();
  const { data: student } = await supabase
    .from("Student")
    .select("planId")
    .eq("id", studentId)
    .single();
  if (!student?.planId) {
    redirect("/escolher-plano");
  }
}
