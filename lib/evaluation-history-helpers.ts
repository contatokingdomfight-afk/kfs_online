import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvaluationHistoryModalDetail } from "@/lib/evaluation-history-modal-types";

export async function evaluationHistoryCoachDisplayName(supabase: SupabaseClient, coachId: string | null): Promise<string> {
  if (!coachId) return "Treinador";
  const { data: coach } = await supabase.from("Coach").select("userId").eq("id", coachId).maybeSingle();
  if (!coach?.userId) return "Treinador";
  const { data: user } = await supabase.from("User").select("name, email").eq("id", coach.userId).maybeSingle();
  const name = user?.name?.trim();
  if (name) return name;
  const email = user?.email?.trim();
  if (email) return email.split("@")[0] ?? "Treinador";
  return "Treinador";
}

export async function evaluationHistoryFetchPreviousSnapshot(
  supabase: SupabaseClient,
  athleteId: string,
  beforeIso: string
): Promise<EvaluationHistoryModalDetail["previous"]> {
  const { data: prevRow } = await supabase
    .from("AthleteEvaluation")
    .select("gas, technique, strength, theory, scores")
    .eq("athleteId", athleteId)
    .lt("created_at", beforeIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!prevRow) return null;
  return {
    gas: (prevRow.gas as number | null) ?? null,
    technique: (prevRow.technique as number | null) ?? null,
    strength: (prevRow.strength as number | null) ?? null,
    theory: (prevRow.theory as number | null) ?? null,
    scores: (prevRow.scores as Record<string, number> | null) ?? null,
  };
}
