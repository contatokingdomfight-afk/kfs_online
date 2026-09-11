import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getEvaluationById } from "@/app/coach/alunos/[id]/actions";
import { StudentEvaluationsHistoryClient } from "@/components/evaluation/StudentEvaluationsHistoryClient";
import { fetchStudentEvaluationHistory } from "@/lib/student-evaluations-history";

type Props = { params: Promise<{ id: string }> };

export default async function AdminAlunoAvaliacoesPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: studentId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: student } = await supabase.from("Student").select("id").eq("id", studentId).single();
  if (!student) return null;

  const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).maybeSingle();

  const items = await fetchStudentEvaluationHistory(supabase, studentId, {
    athleteId: athlete?.id ?? null,
    physicalViewBaseHref: `/admin/alunos/${studentId}/avaliacoes/fisica`,
  });

  return (
    <div style={{ maxWidth: "min(640px, 100%)" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>
        Histórico de avaliações
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 24px" }}>
        Fichas de <strong>avaliação física</strong> entregues e sessões de <strong>performance</strong> nas modalidades.
      </p>
      <StudentEvaluationsHistoryClient
        items={items}
        getEvaluationById={getEvaluationById}
        backHref={`/admin/alunos/${studentId}/performance`}
        backLabel="Ver perfil de performance"
        newPhysicalHref={`/admin/alunos/${studentId}/avaliacao-fisica?next=${encodeURIComponent(`/admin/alunos/${studentId}/avaliacoes`)}`}
        newPerformanceHref={`/admin/alunos/${studentId}/performance`}
      />
      {items.length > 0 ? (
        <Link
          href={`/admin/alunos/${studentId}/performance`}
          style={{ display: "inline-block", marginTop: 24, fontSize: 14, fontWeight: 500, color: "var(--primary)", textDecoration: "none" }}
        >
          Ver perfil de performance →
        </Link>
      ) : null}
    </div>
  );
}
