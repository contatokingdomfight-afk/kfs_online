import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvaluationHistoryModalDetail } from "@/lib/evaluation-history-modal-types";
import { getAdminClientOrNull } from "@/lib/supabase/admin";

const FALLBACK_COACH_LABEL = "Treinador";

function formatCoachUserDisplay(user: { name?: string | null; email?: string | null } | undefined): string {
  const nm = user?.name?.trim();
  if (nm) return nm;
  const em = user?.email?.trim();
  if (em) return em.split("@")[0] ?? FALLBACK_COACH_LABEL;
  return FALLBACK_COACH_LABEL;
}

/**
 * Nomes de treinadores para histórico de avaliações (aluno/coach).
 * Usa service role no servidor: RLS em `User` só permite SELECT da própria linha.
 */
export async function resolveCoachDisplayNamesByCoachIds(coachIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(coachIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const admin = getAdminClientOrNull().client;
  if (!admin) {
    unique.forEach((id) => map.set(id, FALLBACK_COACH_LABEL));
    return map;
  }

  const { data: coaches } = await admin.from("Coach").select("id, userId").in("id", unique);
  const userIds = [...new Set((coaches ?? []).map((c) => c.userId).filter(Boolean))];
  if (userIds.length === 0) {
    unique.forEach((id) => map.set(id, FALLBACK_COACH_LABEL));
    return map;
  }

  const { data: users } = await admin.from("User").select("id, name, email").in("id", userIds);
  const byUserId = new Map((users ?? []).map((u) => [u.id, u]));

  (coaches ?? []).forEach((c) => {
    map.set(c.id, formatCoachUserDisplay(byUserId.get(c.userId)));
  });
  unique.forEach((id) => {
    if (!map.has(id)) map.set(id, FALLBACK_COACH_LABEL);
  });
  return map;
}

export async function evaluationHistoryCoachDisplayName(coachId: string | null): Promise<string> {
  if (!coachId) return FALLBACK_COACH_LABEL;
  const map = await resolveCoachDisplayNamesByCoachIds([coachId]);
  return map.get(coachId) ?? FALLBACK_COACH_LABEL;
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
