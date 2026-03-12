import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";

/**
 * Redireciona para /escolher-plano se o aluno não tiver plano.
 * Usar no topo de páginas restritas (biblioteca, loja, etc.).
 */
export async function requirePlan(): Promise<void> {
  const studentId = await getCurrentStudentId();
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
