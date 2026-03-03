/**
 * Dados para o dashboard do Admin: KPIs, presenças por mês, receita.
 * Suporta filtro por escola (schoolId opcional = todas as escolas).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";

export type SchoolOption = { id: string; name: string };

export type DashboardStats = {
  schools: SchoolOption[];
  totalStudents: number;
  studentsByModality: { modalityCode: string; modalityName: string; count: number }[];
  revenueCurrentMonth: number;
  revenueAccumulatedMonths: { month: string; revenue: number }[];
  attendanceByDay: { day: number; total: number; byModality: Record<string, number> }[];
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
  const modalities = await getCachedModalityRefs(supabase);
  const modalityNames = new Map(modalities.map((m) => [m.code, m.name]));

  const { data: schools } = await supabase
    .from("School")
    .select("id, name")
    .eq("isActive", true)
    .order("name", { ascending: true });

  let studentsQuery = supabase.from("Student").select("id, schoolId, primaryModality");
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

  return {
    schools: (schools ?? []).map((s) => ({ id: s.id, name: s.name })),
    totalStudents,
    studentsByModality,
    revenueCurrentMonth,
    revenueAccumulatedMonths,
    attendanceByDay,
  };
}
