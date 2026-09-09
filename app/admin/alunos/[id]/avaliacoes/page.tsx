import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getEvaluationById } from "@/app/coach/alunos/[id]/actions";
import { EvaluationHistoryClient } from "@/components/evaluation/EvaluationHistoryClient";
import { resolveCoachDisplayNamesByCoachIds } from "@/lib/evaluation-history-helpers";

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

  const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).single();
  if (!athlete) {
    return (
      <div style={{ maxWidth: "min(640px, 100%)" }}>
        <div className="card" style={{ padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>
            Histórico de avaliações
          </h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
            Este aluno ainda não tem perfil de atleta. As avaliações aparecem aqui após a primeira avaliação.
          </p>
          <Link href={`/admin/alunos/${studentId}`} className="btn btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>
            ← Voltar ao perfil
          </Link>
        </div>
      </div>
    );
  }

  const { data: evals } = await supabase
    .from("AthleteEvaluation")
    .select("id, coachId, created_at")
    .eq("athleteId", athlete.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const coachIds = [...new Set((evals ?? []).map((e) => e.coachId).filter(Boolean))] as string[];
  const nameByCoachId = await resolveCoachDisplayNamesByCoachIds(coachIds);

  const list = (evals ?? []).map((e) => ({
    id: e.id,
    coachName: nameByCoachId.get(e.coachId ?? "") ?? "Treinador",
    date: e.created_at
      ? new Date(e.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "",
  }));

  return (
    <div style={{ maxWidth: "min(640px, 100%)" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 24px" }}>
        Histórico de avaliações
      </h1>
      <EvaluationHistoryClient
        list={list}
        getEvaluationById={getEvaluationById}
        backHref={`/admin/alunos/${studentId}/performance`}
        backLabel="Ver perfil de performance"
      />
    </div>
  );
}
