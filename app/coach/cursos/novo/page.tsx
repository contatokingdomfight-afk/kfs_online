import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { CoachCursoForm } from "../CoachCursoForm";

export default async function CoachNovoCursoPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id, can_create_courses")
    .eq("userId", dbUser.id)
    .single();

  if (!student?.can_create_courses) redirect("/coach/cursos");

  return (
    <div style={{ maxWidth: "min(520px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link href="/coach/cursos" style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500 }}>
          ← Voltar
        </Link>
      </div>
      <h1 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Criar novo curso
      </h1>
      <CoachCursoForm />
    </div>
  );
}
