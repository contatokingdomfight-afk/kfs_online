/**
 * Dados para o dashboard do Admin: KPIs, presenças por mês, receita.
 * Suporta filtro por escola (schoolId opcional = todas as escolas).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedModalityRefs, getCachedSchools } from "@/lib/cached-reference-data";
import { getFinanceiroOverview } from "@/lib/admin-finance-overview";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import {
  expandLessonsForDateRange,
  fetchLessonCancellations,
  rowsToLessonDefinitions,
  type ExpandedLessonRow,
} from "@/lib/lesson-occurrences";

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

function monthKeysLastN(n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function occurrenceKey(lessonId: string, occurrenceDate: string): string {
  return `${lessonId}_${occurrenceDate}`;
}

function readOccurrenceDate(a: { occurrenceDate?: string | null }): string {
  return typeof a.occurrenceDate === "string" ? a.occurrenceDate.slice(0, 10) : "";
}

async function fetchExpandedLessonsInRange(
  supabase: SupabaseClient,
  rangeStart: string,
  rangeEnd: string,
  schoolId: string | null
): Promise<ExpandedLessonRow[]> {
  let lessonsQuery = supabase
    .from("Lesson")
    .select(
      "id, modality, date, weekday, startTime, endTime, schoolId, isOneOff, coachId, isOpenClass, locationId, capacity, planningNotes"
    );
  if (schoolId) lessonsQuery = lessonsQuery.eq("schoolId", schoolId);
  const { data: lessonsRaw } = await lessonsQuery;
  const defs = rowsToLessonDefinitions(lessonsRaw ?? []);
  const cancellations = await fetchLessonCancellations(
    supabase,
    defs.map((d) => d.id)
  );
  return expandLessonsForDateRange(defs, cancellations, rangeStart, rangeEnd);
}

export async function getAdminDashboardStats(
  supabase: SupabaseClient,
  schoolId: string | null
): Promise<DashboardStats> {
  const [modalities, schools] = await Promise.all([
    getCachedModalityRefs(supabase),
    getCachedSchools(supabase),
  ]);

  let studentsQuery = supabase.from("Student").select("id, schoolId, primaryModality, planId, status, createdAt");
  if (schoolId) studentsQuery = studentsQuery.eq("schoolId", schoolId);
  const { data: students } = await studentsQuery;

  const totalStudents = students?.length ?? 0;
  const countByModality: Record<string, number> = {};
  for (const m of modalities) countByModality[m.code] = 0;
  countByModality[""] = 0;
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
  let revenueAccumulatedMonths: { month: string; revenue: number }[] = [];

  if (!schoolId) {
    const currentMonth = currentReferenceMonthLisbon(new Date());
    const [overview, ...monthOverviews] = await Promise.all([
      getFinanceiroOverview(supabase, currentMonth),
      ...monthKeysLastN(12).map((m) => getFinanceiroOverview(supabase, m)),
    ]);
    revenueCurrentMonth = overview.revenueCurrentMonth;
    const monthKeys = monthKeysLastN(12);
    revenueAccumulatedMonths = monthKeys.map((month, i) => ({
      month,
      revenue: monthOverviews[i].revenueCurrentMonth,
    }));
  } else if (studentIds.length > 0) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const currentMonth = getCurrentMonthStr();
    const monthStart = `${currentMonth}-01`;
    const endExclusiveIso = new Date(year, month, 1).toISOString();

    const [{ data: payments }, { data: onboardingPayments }] = await Promise.all([
      supabase
        .from("Payment")
        .select("studentId, amount, status, referenceMonth")
        .eq("status", "PAID")
        .in("studentId", studentIds),
      supabase
        .from("Payment")
        .select("amount")
        .eq("status", "PAID")
        .in("paymentType", ["ENROLLMENT", "INSURANCE"])
        .in("studentId", studentIds)
        .gte("createdAt", `${monthStart}T00:00:00.000Z`)
        .lt("createdAt", endExclusiveIso),
    ]);

    const revenueByMonth: Record<string, number> = {};
    for (const p of payments ?? []) {
      const ref = p.referenceMonth;
      if (!ref || !/^\d{4}-\d{2}/.test(String(ref))) continue;
      const monthKey = String(ref).slice(0, 7);
      const amount = Number(p.amount);
      revenueByMonth[monthKey] = (revenueByMonth[monthKey] ?? 0) + amount;
      if (monthKey === currentMonth) revenueCurrentMonth += amount;
    }
    let onboardingTotal = 0;
    for (const p of onboardingPayments ?? []) {
      onboardingTotal += Number(p.amount);
    }
    revenueCurrentMonth += onboardingTotal;
    if (onboardingTotal > 0) {
      revenueByMonth[currentMonth] = (revenueByMonth[currentMonth] ?? 0) + onboardingTotal;
    }

    const sortedMonths = Object.keys(revenueByMonth).sort();
    revenueAccumulatedMonths = sortedMonths.slice(-12).map((month) => ({
      month,
      revenue: revenueByMonth[month] ?? 0,
    }));
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = getCurrentMonthStr();
  const startDate = `${monthStr}-01`;
  const endDate = `${monthStr}-${String(getDaysInMonth(year, month)).padStart(2, "0")}`;

  const expandedMonth = await fetchExpandedLessonsInRange(supabase, startDate, endDate, schoolId);
  const occMetaMonth = new Map(
    expandedMonth.map((l) => [
      occurrenceKey(l.id, l.occurrenceDate),
      { day: parseInt(l.occurrenceDate.slice(8, 10), 10), modality: l.modality ?? "" },
    ])
  );
  const lessonIdsMonth = [...new Set(expandedMonth.map((l) => l.id))];

  const attendanceByDay: { day: number; total: number; byModality: Record<string, number> }[] = [];
  const daysInMonth = getDaysInMonth(year, month);
  for (let d = 1; d <= daysInMonth; d++) {
    attendanceByDay.push({ day: d, total: 0, byModality: {} });
  }
  const dayIndex = (d: number) => d - 1;

  if (lessonIdsMonth.length > 0) {
    const { data: attendances } = await supabase
      .from("Attendance")
      .select("lessonId, occurrenceDate")
      .eq("status", "CONFIRMED")
      .in("lessonId", lessonIdsMonth);
    for (const a of attendances ?? []) {
      const occ = readOccurrenceDate(a);
      const meta = occMetaMonth.get(occurrenceKey(a.lessonId, occ));
      if (!meta) continue;
      const day = meta.day;
      if (day >= 1 && day <= daysInMonth) {
        const row = attendanceByDay[dayIndex(day)];
        row.total++;
        row.byModality[meta.modality] = (row.byModality[meta.modality] ?? 0) + 1;
      }
    }
  }

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

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const start7 = sevenDaysAgo.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  const expanded7 = await fetchExpandedLessonsInRange(supabase, start7, todayStr, schoolId);
  const occKeys7 = expanded7.map((l) => occurrenceKey(l.id, l.occurrenceDate));
  const lessonIds7 = [...new Set(expanded7.map((l) => l.id))];

  let avgAttendanceLast7Days = 0;
  if (occKeys7.length > 0 && lessonIds7.length > 0) {
    const counts = new Map<string, number>();
    for (const k of occKeys7) counts.set(k, 0);
    const { data: att7 } = await supabase
      .from("Attendance")
      .select("lessonId, occurrenceDate")
      .eq("status", "CONFIRMED")
      .in("lessonId", lessonIds7);
    for (const a of att7 ?? []) {
      const key = occurrenceKey(a.lessonId, readOccurrenceDate(a));
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const totals = [...counts.values()];
    avgAttendanceLast7Days = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const start30 = thirtyDaysAgo.toISOString().slice(0, 10);
  const expanded30 = await fetchExpandedLessonsInRange(supabase, start30, todayStr, schoolId);
  const occModality30 = new Map(
    expanded30.map((l) => [occurrenceKey(l.id, l.occurrenceDate), l.modality ?? ""])
  );
  const lessonIds30 = [...new Set(expanded30.map((l) => l.id))];
  const modalityCount30: Record<string, number> = {};
  if (lessonIds30.length > 0) {
    const { data: att30 } = await supabase
      .from("Attendance")
      .select("lessonId, occurrenceDate")
      .eq("status", "CONFIRMED")
      .in("lessonId", lessonIds30);
    for (const a of att30 ?? []) {
      const mod = occModality30.get(occurrenceKey(a.lessonId, readOccurrenceDate(a)));
      if (mod === undefined) continue;
      modalityCount30[mod] = (modalityCount30[mod] ?? 0) + 1;
    }
  }
  const attendanceByModality30Days = Object.entries(modalityCount30).map(([modality, count]) => ({ modality, count }));

  const studentsGrowthByMonth: { month: string; active: number; new: number; churned: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const monthKey = `${y}-${String(m).padStart(2, "0")}`;
    const growthStart = `${monthKey}-01`;
    const growthEnd = `${monthKey}-${String(getDaysInMonth(y, m)).padStart(2, "0")}`;
    let newCount = 0;
    let activeCount = 0;
    for (const s of students ?? []) {
      const st = s as { createdAt?: string };
      const created = st.createdAt ? String(st.createdAt).slice(0, 10) : "";
      if (created >= growthStart && created <= growthEnd) newCount++;
      if (created <= growthEnd) activeCount++;
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
