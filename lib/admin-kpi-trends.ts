import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAdminUserIdSet } from "@/lib/admin-dashboard-exclude-admins";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { computeStudentGrowth } from "@/lib/student-growth";
import { addDaysYmd } from "@/lib/admin-todo-rules";

export type KpiTrends = {
  /** Variação de alunos ativos face ao fim do mês anterior. */
  activeDelta: number;
  /** Saídas (churn) este mês e no mês anterior. */
  churnThisMonth: number;
  churnLastMonth: number;
  /** % de saídas este mês sobre os ativos no fim do mês anterior. */
  churnRatePct: number;
  /** Treinos (presenças confirmadas) por aluno ativo por semana: últimas 4 semanas e as 4 antes. */
  trainingsPerStudentWeek: number;
  trainingsPerStudentWeekPrev: number;
  /** Nome curto do mês anterior (ex.: «set.»). */
  prevMonthLabel: string;
};

const MONTHS_PT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export async function getKpiTrends(supabase: SupabaseClient, schoolId: string | null): Promise<KpiTrends> {
  const today = calendarDateLisbon(new Date());
  const thisMonth = today.slice(0, 7);
  const [y, m] = thisMonth.split("-").map(Number);
  const prevMonth = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);

  let q = supabase.from("Student").select("id, userId, status, statusChangedAt, createdAt, planId");
  if (schoolId) q = q.eq("schoolId", schoolId);
  const [{ data }, adminIds] = await Promise.all([q, fetchAdminUserIdSet(supabase)]);
  const students = ((data ?? []) as { id: string; userId: string; status: string; statusChangedAt: string | null; createdAt: string; planId: string | null }[]).filter(
    (s) => !adminIds.has(s.userId)
  );

  const [prev, cur] = computeStudentGrowth(students, [
    { key: prevMonth, start: `${prevMonth}-01`, end: lastDayOfMonth(prevMonth) },
    { key: thisMonth, start: `${thisMonth}-01`, end: today },
  ]);

  // Treinos por aluno ativo por semana (4 semanas vs. as 4 anteriores).
  const ids = students.map((s) => s.id);
  let last4 = 0;
  let prev4 = 0;
  const from = addDaysYmd(today, -55);
  const cut = addDaysYmd(today, -27);
  for (let i = 0; i < ids.length; i += 150) {
    const part = ids.slice(i, i + 150);
    for (let offset = 0; ; offset += 1000) {
      const { data: rows } = await supabase
        .from("Attendance")
        .select("occurrenceDate")
        .in("studentId", part)
        .eq("status", "CONFIRMED")
        .eq("isExperimental", false)
        .gte("occurrenceDate", from)
        .lte("occurrenceDate", today)
        .range(offset, offset + 999);
      const batch = (rows ?? []) as { occurrenceDate: string }[];
      for (const r of batch) {
        if (String(r.occurrenceDate).slice(0, 10) >= cut) last4++;
        else prev4++;
      }
      if (batch.length < 1000) break;
    }
  }
  const perWeek = (n: number, base: number) => (base > 0 ? Math.round((n / base / 4) * 10) / 10 : 0);

  return {
    activeDelta: cur.active - prev.active,
    churnThisMonth: cur.churned,
    churnLastMonth: prev.churned,
    churnRatePct: prev.active > 0 ? Math.round((cur.churned / prev.active) * 1000) / 10 : 0,
    trainingsPerStudentWeek: perWeek(last4, cur.active),
    trainingsPerStudentWeekPrev: perWeek(prev4, prev.active),
    prevMonthLabel: MONTHS_PT[Number(prevMonth.slice(5, 7)) - 1] ?? prevMonth,
  };
}
