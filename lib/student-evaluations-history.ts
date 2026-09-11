import type { SupabaseClient } from "@supabase/supabase-js";
import { CLEARANCE_OPTIONS } from "@/lib/physical-assessment-types";
import { resolveCoachDisplayNamesByCoachIds } from "@/lib/evaluation-history-helpers";

export type StudentEvaluationHistoryItem =
  | {
      kind: "performance";
      id: string;
      sortAt: string;
      dateLabel: string;
      coachName: string;
    }
  | {
      kind: "physical";
      id: string;
      sortAt: string;
      dateLabel: string;
      coachName: string;
      clearanceLabel: string;
      viewHref: string;
    };

function formatPtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
}

export function physicalAssessmentClearanceLabel(clearance: string | null | undefined): string {
  if (!clearance) return "—";
  const o = CLEARANCE_OPTIONS.find((c) => c.value === clearance);
  return o?.label ?? clearance;
}

export async function fetchStudentEvaluationHistory(
  supabase: SupabaseClient,
  studentId: string,
  options: { athleteId?: string | null; physicalViewBaseHref: string }
): Promise<StudentEvaluationHistoryItem[]> {
  const items: StudentEvaluationHistoryItem[] = [];

  const { data: physRows } = await supabase
    .from("StudentPhysicalAssessment")
    .select("id, coachId, assessedAt, clearance, createdAt")
    .eq("studentId", studentId)
    .eq("status", "SUBMITTED")
    .order("assessedAt", { ascending: false })
    .limit(100);

  const perfPromise = options.athleteId
    ? supabase
        .from("AthleteEvaluation")
        .select("id, coachId, created_at")
        .eq("athleteId", options.athleteId)
        .order("created_at", { ascending: false })
        .limit(100)
    : Promise.resolve({ data: [] as { id: string; coachId: string | null; created_at: string | null }[] });

  const { data: evals } = await perfPromise;

  const coachIds = [
    ...new Set([
      ...(physRows ?? []).map((r) => r.coachId).filter(Boolean),
      ...(evals ?? []).map((e) => e.coachId).filter(Boolean),
    ]),
  ] as string[];

  const nameByCoachId = await resolveCoachDisplayNamesByCoachIds(coachIds);

  for (const row of physRows ?? []) {
    const assessedAt = row.assessedAt ? String(row.assessedAt) : String(row.createdAt ?? "");
    items.push({
      kind: "physical",
      id: row.id,
      sortAt: assessedAt.slice(0, 10) + "T12:00:00",
      dateLabel: formatPtDate(assessedAt),
      coachName: nameByCoachId.get(row.coachId ?? "") ?? "Treinador",
      clearanceLabel: physicalAssessmentClearanceLabel(row.clearance as string | null),
      viewHref: `${options.physicalViewBaseHref}/${row.id}`,
    });
  }

  for (const e of evals ?? []) {
    const created = e.created_at ? String(e.created_at) : "";
    items.push({
      kind: "performance",
      id: e.id,
      sortAt: created,
      dateLabel: created ? formatPtDateTime(created) : "",
      coachName: nameByCoachId.get(e.coachId ?? "") ?? "Treinador",
    });
  }

  items.sort((a, b) => b.sortAt.localeCompare(a.sortAt));
  return items;
}
