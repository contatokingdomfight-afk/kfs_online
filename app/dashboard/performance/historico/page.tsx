import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { redirect } from "next/navigation";
import { requirePlan } from "@/lib/require-plan";
import { EvaluationHistoryClient } from "./EvaluationHistoryClient";
import { getMyEvaluationById } from "../actions";

export default async function HistoricoAvaliacoesPage() {
  await requirePlan();
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const supabase = await createClient();
  const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).single();

  if (!athlete) {
    return (
      <div className="max-w-[min(640px,100%)] mx-auto">
        <div className="card p-6">
          <h1 className="text-xl font-bold text-text-primary mb-2">Histórico de avaliações</h1>
          <p className="text-text-secondary mb-4">Ainda não tens avaliações. Quando o teu treinador te avaliar nas aulas, aparecerão aqui.</p>
          <Link href="/dashboard/performance" className="btn btn-primary inline-block no-underline">
            ← Perfil do atleta
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
  const { data: coaches } = await supabase.from("Coach").select("id, userId").in("id", coachIds);
  const userIds = [...new Set((coaches ?? []).map((c) => c.userId))];
  const { data: users } = await supabase.from("User").select("id, name").in("id", userIds);
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
        <Link href="/dashboard/performance" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Perfil do atleta
        </Link>
      </div>
      <EvaluationHistoryClient
        list={list}
        getEvaluationById={getMyEvaluationById}
        backHref="/dashboard/performance"
        backLabel="Ver perfil de performance"
      />
    </div>
  );
}
