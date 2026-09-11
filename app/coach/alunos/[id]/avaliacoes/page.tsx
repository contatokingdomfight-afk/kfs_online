import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getEvaluationById } from "../actions";
import { StudentEvaluationsHistoryClient } from "@/components/evaluation/StudentEvaluationsHistoryClient";
import { fetchStudentEvaluationHistory } from "@/lib/student-evaluations-history";

type Props = { params: Promise<{ id: string }> };

export default async function CoachAlunoAvaliacoesPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const { id: studentId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: student } = await supabase.from("Student").select("id").eq("id", studentId).single();
  if (!student) return null;

  const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).maybeSingle();

  const items = await fetchStudentEvaluationHistory(supabase, studentId, {
    athleteId: athlete?.id ?? null,
    physicalViewBaseHref: `/coach/alunos/${studentId}/avaliacoes/fisica`,
  });

  return (
    <div className="max-w-[min(640px,100%)] mx-auto">
      <h1 className="text-xl font-bold text-text-primary mb-2">Histórico de avaliações</h1>
      <p className="text-sm text-text-secondary mb-6">
        Fichas de <strong>avaliação física</strong> entregues e sessões de <strong>performance</strong> nas modalidades.
      </p>
      <StudentEvaluationsHistoryClient
        items={items}
        getEvaluationById={getEvaluationById}
        backHref={`/coach/alunos/${studentId}/performance`}
        backLabel="Ver perfil de performance"
        newPhysicalHref={`/coach/alunos/${studentId}/avaliacao-fisica?next=${encodeURIComponent(`/coach/alunos/${studentId}/avaliacoes`)}`}
        newPerformanceHref={`/coach/alunos/${studentId}/performance`}
      />
      {items.length > 0 ? (
        <Link
          href={`/coach/alunos/${studentId}/performance`}
          className="inline-block mt-6 text-sm font-medium text-primary no-underline hover:underline"
        >
          Ver perfil de performance →
        </Link>
      ) : null}
    </div>
  );
}
