import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";

/**
 * Rota antiga (assinatura do termo era um passo à parte antes de escolher plano).
 * O termo agora é assinado junto com as Condições Gerais em /adesao — este stub só
 * existe para não dar 404 em links/favoritos antigos.
 */
export default async function WaiverSigningPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "ALUNO") redirect("/dashboard");

  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const supabase = await createClient();
  const { data: student } = await supabase.from("Student").select("planId").eq("id", studentId).maybeSingle();
  redirect(student?.planId ? "/dashboard" : "/escolher-plano");
}
