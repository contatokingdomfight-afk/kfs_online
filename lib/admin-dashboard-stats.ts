/**
 * Dados para o dashboard do Admin: KPIs, presenças por mês, receita.
 * Suporta filtro por escola (schoolId opcional = todas as escolas).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedModalityRefs, getCachedSchools } from "@/lib/cached-reference-data";

export type SchoolOption = { id: string; name: string };

export type DashboardStats = {
  schools: SchoolOption[];
  totalStudents: number;
  studentsByModality: { modalityCode: string; modalityName: string; count: number }[];
  revenueCurrentMonth: number;
  revenueAccumulatedMonths: { month: string; revenue: number }[];
  attendanceByDay: { day: number; total: number; byModality: Record<string, number> }[];
  /** Alunos com planId e status ATIVO */
  activeStudents: number;
  /** Alunos criados no mês corrente */
  newStudentsThisMonth: number;
  /** Média de presenças confirmadas por aula nos últimos 7 dias */
  avgAttendanceLast7Days: number;
  /** Presenças por modalidade nos últimos 30 dias (para gráfico donut) */
  attendanceByModality30Days: { modality: string; count: number }[];
  /** Alunos ativos por mês (últimos 6 meses) para gráfico de crescimento */
  studentsGrowthByMonth: { month: string; active: number; new: number; churned: number }[];
};

function getCurrentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export async function getAdminDashboardStats(
  supabase: SupabaseClient,
  schoolId: string | null
): Promise<DashboardStats> {
  const [modalities, schools] = await Promise.all([
    getCachedModalityRefs(supabase),
    getCachedSchools(supabase),
  ]);
  const modalityNames = new Map(modalities.map((m) => [m.code, m.name]));

  let studentsQuery = supabase.from("Student").select("id, schoolId, primaryModality, planId, status, createdAt");
  if (schoolId) studentsQuery = studentsQuery.eq("schoolId", schoolId);
  const { data: students } = await studentsQuery;

  const totalStudents = students?.length ?? 0;
  const countByModality: Record<string, number> = {};
  for (const m of modalities) countByModality[m.code] = 0;
  countByModality[""] = 0; // Sem modalidade / Todas
  for (const s of students ?? []) {
    const code = (s as { primaryModality?: string | null }).primaryModality ?? "";
    if (!(code in countByModality)) countByModality[code] = 0;
    countByModality[code]++;
  }
  const studentsByModality = modalities.map((m) => ({
    modalityCode: m.code,
    modalityName: m.name,
    count: countByModality[m.code] ?? 0,
  }));
  if (countByModality[""] > 0) {
    studentsByModality.push({ modalityCode: "", modalityName: "Sem modalidade", count: countByModality[""] });
  }

  const studentIds = (students ?? []).map((s) => s.id);
  let revenueCurrentMonth = 0;
  const revenueByMonth: Record<string, number> = {};

  if (studentIds.length > 0) {
    let paymentsQuery = supabase
      .from("Payment")
      .select("studentId, amount, status, referenceMonth")
      .eq("status", "PAID")
      .in("studentId", studentIds);
    const { data: payments } = await paymentsQuery;
    const currentMonth = getCurrentMonthStr();
    for (const p of payments ?? []) {
      const amount = Number(p.amount);
      revenueByMonth[p.referenceMonth] = (revenueByMonth[p.referenceMonth] ?? 0) + amount;
      if (p.referenceMonth === currentMonth) revenueCurrentMonth += amount;
    }
  }

  const sortedMonths = Object.keys(revenueByMonth).sort();
  const revenueAccumulatedMonths = sortedMonths.slice(-12).map((month) => ({
    month: month.slice(0, 7),
    revenue: revenueByMonth[month] ?? 0,
  }));

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = getCurrentMonthStr();
  const startDate = `${monthStr}-01`;
  const endDate = `${monthStr}-${String(getDaysInMonth(year, month)).padStart(2, "0")}`;

  let lessonsQuery = supabase
    .from("Lesson")
    .select("id, modality, date, schoolId")
    .gte("date", startDate)
    .lte("date", endDate);
  if (schoolId) lessonsQuery = lessonsQuery.eq("schoolId", schoolId);
  const { data: lessons } = await lessonsQuery;
  const lessonIds = (lessons ?? []).map((l) => l.id);
  const lessonById = new Map((lessons ?? []).map((l) => [l.id, l]));

  const attendanceByDay: { day: number; total: number; byModality: Record<string, number> }[] = [];
  const daysInMonth = getDaysInMonth(year, month);
  for (let d = 1; d <= daysInMonth; d++) {
    attendanceByDay.push({ day: d, total: 0, byModality: {} });
  }
  const dayIndex = (d: number) => d - 1;

  if (lessonIds.length > 0) {
    const { data: attendances } = await supabase
      .from("Attendance")
      .select("lessonId")
      .eq("status", "CONFIRMED")
      .in("lessonId", lessonIds);
    for (const a of attendances ?? []) {
      const lesson = lessonById.get(a.lessonId);
      if (!lesson) continue;
      const dateStr = typeof lesson.date === "string" ? lesson.date : (lesson.date as Date).toISOString().slice(0, 10);
      const day = parseInt(dateStr.slice(8, 10), 10);
      if (day >= 1 && day <= daysInMonth) {
        const row = attendanceByDay[dayIndex(day)];
        row.total++;
        const mod = lesson.modality ?? "";
        row.byModality[mod] = (row.byModality[mod] ?? 0) + 1;
      }
    }
  }

  // activeStudents: com planId e status ATIVO
  let activeStudents = 0;
  let newStudentsThisMonth = 0;
  const currentMonth = getCurrentMonthStr();
  const monthStart = `${currentMonth}-01`;
  const monthEnd = `${currentMonth}-${String(getDaysInMonth(year, month)).padStart(2, "0")}`;
  for (const s of students ?? []) {
    const st = s as { planId?: string | null; status?: string; createdAt?: string };
    if (st.planId && st.status === "ATIVO") activeStudents++;
    const created = st.createdAt ? String(st.createdAt).slice(0, 10) : "";
    if (created >= monthStart && created <= monthEnd) newStudentsThisMonth++;
  }

  // avgAttendanceLast7Days: média de presenças confirmadas por aula nos últimos 7 dias
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const start7 = sevenDaysAgo.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  let lessons7Query = supabase
    .from("Lesson")
    .select("id")
    .gte("date", start7)
    .lte("date", todayStr);
  if (schoolId) lessons7Query = lessons7Query.eq("schoolId", schoolId);
  const { data: lessons7 } = await lessons7Query;
  const lessonIds7 = (lessons7 ?? []).map((l) => l.id);
  let avgAttendanceLast7Days = 0;
  if (lessonIds7.length > 0) {
    const { data: att7 } = await supabase
      .from("Attendance")
      .select("lessonId")
      .eq("status", "CONFIRMED")
      .in("lessonId", lessonIds7);
    const byLesson = new Map<string, number>();
    for (const lid of lessonIds7) byLesson.set(lid, 0);
    for (const a of att7 ?? []) byLesson.set(a.lessonId, (byLesson.get(a.lessonId) ?? 0) + 1);
    const totals = [...byLesson.values()];
    avgAttendanceLast7Days = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  }

  // attendanceByModality30Days: presenças por modalidade nos últimos 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const start30 = thirtyDaysAgo.toISOString().slice(0, 10);
  let lessons30Query = supabase
    .from("Lesson")
    .select("id, modality")
    .gte("date", start30)
    .lte("date", todayStr);
  if (schoolId) lessons30Query = lessons30Query.eq("schoolId", schoolId);
  const { data: lessons30 } = await lessons30Query;
  const lessonIds30 = (lessons30 ?? []).map((l) => l.id);
  const lessonModality = new Map((lessons30 ?? []).map((l) => [l.id, l.modality ?? ""]));
  const modalityCount30: Record<string, number> = {};
  if (lessonIds30.length > 0) {
    const { data: att30 } = await supabase
      .from("Attendance")
      .select("lessonId")
      .eq("status", "CONFIRMED")
      .in("lessonId", lessonIds30);
    for (const a of att30 ?? []) {
      const mod = lessonModality.get(a.lessonId) ?? "";
      modalityCount30[mod] = (modalityCount30[mod] ?? 0) + 1;
    }
  }
  const attendanceByModality30Days = Object.entries(modalityCount30).map(([modality, count]) => ({ modality, count }));

  // studentsGrowthByMonth: últimos 6 meses (new = criados no mês, active = total até fim do mês)
  const studentsGrowthByMonth: { month: string; active: number; new: number; churned: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const monthKey = `${y}-${String(m).padStart(2, "0")}`;
    const monthStart = `${monthKey}-01`;
    const monthEnd = `${monthKey}-${String(getDaysInMonth(y, m)).padStart(2, "0")}`;
    let newCount = 0;
    let activeCount = 0;
    for (const s of students ?? []) {
      const st = s as { createdAt?: string };
      const created = st.createdAt ? String(st.createdAt).slice(0, 10) : "";
      if (created >= monthStart && created <= monthEnd) newCount++;
      if (created <= monthEnd) activeCount++;
    }
    studentsGrowthByMonth.push({ month: monthKey, active: activeCount, new: newCount, churned: 0 });
  }

  return {
    schools: schools.map((s) => ({ id: s.id, name: s.name })),
    totalStudents,
    studentsByModality,
    revenueCurrentMonth,
    revenueAccumulatedMonths,
    attendanceByDay,
    activeStudents,
    newStudentsThisMonth,
    avgAttendanceLast7Days,
    attendanceByModality30Days,
    studentsGrowthByMonth,
  };
}
