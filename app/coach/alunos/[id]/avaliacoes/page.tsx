import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getEvaluationById } from "../actions";
import { EvaluationHistoryClient } from "./EvaluationHistoryClient";

type Props = { params: Promise<{ id: string }> };

export default async function CoachAlunoAvaliacoesPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const { id: studentId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id")
    .eq("id", studentId)
    .single();

  if (!student) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Aluno não encontrado.</p>
        <Link href="/coach/alunos" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).single();
  if (!athlete) {
    return (
      <div className="max-w-[min(640px,100%)] mx-auto">
        <div className="card p-6">
          <h1 className="text-xl font-bold text-text-primary mb-2">Histórico de avaliações</h1>
          <p className="text-text-secondary mb-4">Este aluno ainda não tem perfil de atleta. As avaliações aparecem aqui após a primeira avaliação.</p>
          <Link href={`/coach/alunos/${studentId}`} className="btn btn-primary inline-block no-underline">
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

  const coachIds = [...new Set((evals ?? []).map((e) => e.coachId).filter(Boolean))];
  const { data: coaches } = await supabase
    .from("Coach")
    .select("id, userId")
    .in("id", coachIds);
  const userIds = [...new Set((coaches ?? []).map((c) => c.userId))];
  const { data: users } = await supabase
    .from("User")
    .select("id, name")
    .in("id", userIds);
  const nameByCoachId = new Map<string, string>();
  (coaches ?? []).forEach((c) => {
    const u = (users ?? []).find((u) => u.id === c.userId);
    nameByCoachId.set(c.id, u?.name ?? "Treinador");
  });

  const list = (evals ?? []).map((e) => ({
    id: e.id,
    coachName: nameByCoachId.get(e.coachId ?? "") ?? "Treinador",
    date: e.created_at
      ? new Date(e.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "",
  }));

  return (
    <div className="max-w-[min(640px,100%)] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-text-primary">Histórico de avaliações</h1>
        <Link
          href={`/coach/alunos/${studentId}`}
          className="btn btn-secondary"
          style={{ textDecoration: "none" }}
        >
          ← Perfil do aluno
        </Link>
      </div>
      <EvaluationHistoryClient
        list={list}
        getEvaluationById={getEvaluationById}
        backHref={`/coach/alunos/${studentId}/performance`}
        backLabel="Ver perfil de performance"
      />
    </div>
  );
}
