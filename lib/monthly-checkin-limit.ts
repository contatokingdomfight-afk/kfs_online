import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Primeiro e último dia (YYYY-MM-DD) do mês de referência, calendário civil. */
function monthBounds(referenceMonth: string): { start: string; end: string } {
  const [y, m] = referenceMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${referenceMonth}-01`, end: `${referenceMonth}-${pad2(lastDay)}` };
}

export type MonthlyCheckInLimit = {
  /** null = sem limite mensal (plano ilimitado neste critério). */
  limit: number | null;
  used: number;
  /** null quando `limit` é null. */
  remaining: number | null;
};

/**
 * Aulas confirmadas (Attendance.status = CONFIRMED) do aluno no mês de referência, mais o
 * limite base do plano somado a eventuais aulas extra concedidas (StudentExtraSessions).
 * `excludeLessonId`: mesmo padrão do limite diário — não conta a própria aula a confirmar
 * quando já existe um registo PENDING/CONFIRMED para ela.
 */
export async function getMonthlyCheckInLimit(
  supabase: SupabaseClient,
  studentId: string,
  maxCheckInsPerMonth: number | null,
  referenceMonth: string,
  excludeLessonId?: string
): Promise<MonthlyCheckInLimit> {
  if (maxCheckInsPerMonth === null) return { limit: null, used: 0, remaining: null };

  const { start, end } = monthBounds(referenceMonth);

  let query = supabase
    .from("Attendance")
    .select("id", { count: "exact", head: true })
    .eq("studentId", studentId)
    .eq("status", "CONFIRMED")
    .gte("occurrenceDate", start)
    .lte("occurrenceDate", end);
  if (excludeLessonId) query = query.neq("lessonId", excludeLessonId);
  const { count: used } = await query;

  const { data: extraRows } = await supabase
    .from("StudentExtraSessions")
    .select("quantity")
    .eq("studentId", studentId)
    .eq("referenceMonth", referenceMonth);
  const extra = (extraRows ?? []).reduce(
    (sum: number, r: { quantity?: number | null }) => sum + (r.quantity ?? 0),
    0
  );

  const limit = maxCheckInsPerMonth + extra;
  const usedCount = used ?? 0;
  return { limit, used: usedCount, remaining: Math.max(0, limit - usedCount) };
}
