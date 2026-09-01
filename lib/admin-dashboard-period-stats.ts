/**
 * Métricas de tendência do dashboard admin — todas dependentes de um único filtro de
 * período (7/15/30 dias ou N meses) + modalidade opcional. Independentes do "instantâneo"
 * em `lib/admin-dashboard-stats.ts` (alunos ativos, coaches, composição atual).
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatInTimeZone } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { getWeekStartMondayForDateInLisbon } from "@/lib/lisbon-week";
import { fetchAdminUserIdSet } from "@/lib/admin-dashboard-exclude-admins";
import { fetchExpandedLessonsInRange } from "@/lib/admin-dashboard-stats";
import { isFamilyPlan } from "@/lib/kingdom-plans-constants";
import { loadFamilyReferencePlanIdByStudent } from "@/lib/family-effective-plan";

export type PeriodStats = {
  bucketUnit: "day" | "month";
  revenue: { total: number; byBucket: { bucket: string; revenue: number }[] };
  growthByBucket: { bucket: string; active: number; new: number; churned: number }[];
  avgAttendance: number;
  modalityPopularity: { modalityCode: string; modalityName: string; count: number }[];
  checkinsByWeekday: { weekday: number; count: number }[];
  newStudentsByModality: { modalityCode: string; modalityName: string; count: number }[];
  newStudentsByPlan: { planId: string | null; planName: string; count: number }[];
  evaluationsPerWeek: { weekStart: string; count: number }[];
  courseEngagement: {
    unitsCompleted: number;
    coursesCompleted: number;
    studentsWithPaidPurchase: number;
    topCourses: { courseId: string; courseName: string; completions: number }[];
  };
  occupancyRate: { averagePercent: number; lessonsWithoutCapacity: number };
};

function parsePeriod(period: string): { unit: "day" | "month"; count: number } {
  const m = /^(\d+)([dm])$/.exec(period);
  if (!m) return { unit: "day", count: 30 };
  return { unit: m[2] === "d" ? "day" : "month", count: parseInt(m[1], 10) };
}

function todayLisbon(): string {
  return formatInTimeZone(new Date(), LISBON_TZ, "yyyy-MM-dd");
}

function addDaysStr(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function lastNDayKeys(n: number, endYmd: string): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDaysStr(endYmd, -i));
  return out;
}

function lastNMonthKeys(n: number, endYearMonth: string): string[] {
  const [ey, em] = endYearMonth.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ey, em - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function lastDayOfMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const day = new Date(y, m, 0).getDate();
  return `${yearMonth}-${String(day).padStart(2, "0")}`;
}

/** Segundas-feiras (week_start) cuja semana (Seg-Dom) toca o intervalo [start, end]. */
function getWeekStartsInRange(start: string, end: string): string[] {
  const firstWeekStart = getWeekStartMondayForDateInLisbon(start);
  const weekStarts: string[] = [];
  let cursor = firstWeekStart;
  let guard = 0;
  while (cursor <= end && guard < 200) {
    weekStarts.push(cursor);
    cursor = addDaysStr(cursor, 7);
    guard++;
  }
  return weekStarts;
}

export async function getAdminDashboardPeriodStats(
  supabase: SupabaseClient,
  schoolId: string | null,
  period: string,
  modalityCode: string | null
): Promise<PeriodStats> {
  const { unit, count } = parsePeriod(period);
  const today = todayLisbon();

  let periodStart: string;
  let periodEnd: string;
  let bucketKeys: string[];
  if (unit === "day") {
    bucketKeys = lastNDayKeys(count, today);
    periodStart = bucketKeys[0];
    periodEnd = today;
  } else {
    bucketKeys = lastNMonthKeys(count, today.slice(0, 7));
    periodStart = `${bucketKeys[0]}-01`;
    periodEnd = lastDayOfMonth(bucketKeys[bucketKeys.length - 1]);
  }
  const periodStartTs = `${periodStart}T00:00:00`;
  const periodEndExclusiveTs = `${addDaysStr(periodEnd, 1)}T00:00:00`;

  const [modalities, adminUserIds] = await Promise.all([
    getCachedModalityRefs(supabase),
    fetchAdminUserIdSet(supabase),
  ]);

  let studentsQuery = supabase
    .from("Student")
    .select("id, userId, schoolId, primaryModality, planId, createdAt, status, statusChangedAt");
  if (schoolId) studentsQuery = studentsQuery.eq("schoolId", schoolId);
  const { data: rawStudents } = await studentsQuery;
  const students = (rawStudents ?? []).filter(
    (s) => !adminUserIds.has((s as { userId: string }).userId)
  ) as {
    id: string;
    primaryModality: string | null;
    planId: string | null;
    createdAt: string;
    status: string;
    statusChangedAt: string | null;
  }[];
  const studentIds = students.map((s) => s.id);

  const studentsInPeriod = students.filter((s) => {
    const created = s.createdAt ? String(s.createdAt).slice(0, 10) : "";
    return created >= periodStart && created <= periodEnd;
  });

  // --- receita ---
  let tuitionPayments: { studentId: string; amount: number; referenceMonth: string | null; createdAt: string }[] = [];
  let onboardingPayments: { studentId: string; amount: number; createdAt: string }[] = [];
  if (studentIds.length > 0) {
    const [{ data: tp }, { data: op }] = await Promise.all([
      supabase
        .from("Payment")
        .select("studentId, amount, referenceMonth, createdAt")
        .eq("status", "PAID")
        .eq("paymentType", "TUITION")
        .in("studentId", studentIds),
      supabase
        .from("Payment")
        .select("studentId, amount, createdAt")
        .eq("status", "PAID")
        .in("paymentType", ["ENROLLMENT", "INSURANCE"])
        .in("studentId", studentIds),
    ]);
    tuitionPayments = tp ?? [];
    onboardingPayments = op ?? [];
  }
  const revenueByBucket = new Map<string, number>(bucketKeys.map((b) => [b, 0]));
  let revenueTotal = 0;
  if (unit === "month") {
    for (const p of tuitionPayments) {
      const ref = p.referenceMonth ? String(p.referenceMonth).slice(0, 7) : "";
      const amount = Number(p.amount);
      if (revenueByBucket.has(ref)) {
        revenueByBucket.set(ref, (revenueByBucket.get(ref) ?? 0) + amount);
        revenueTotal += amount;
      }
    }
    for (const p of onboardingPayments) {
      const created = p.createdAt ? String(p.createdAt).slice(0, 7) : "";
      const amount = Number(p.amount);
      if (revenueByBucket.has(created)) {
        revenueByBucket.set(created, (revenueByBucket.get(created) ?? 0) + amount);
        revenueTotal += amount;
      }
    }
  } else {
    for (const p of [...tuitionPayments, ...onboardingPayments]) {
      const created = p.createdAt ? String(p.createdAt).slice(0, 10) : "";
      const amount = Number(p.amount);
      if (revenueByBucket.has(created)) {
        revenueByBucket.set(created, (revenueByBucket.get(created) ?? 0) + amount);
        revenueTotal += amount;
      }
    }
  }
  const revenue = {
    total: revenueTotal,
    byBucket: bucketKeys.map((b) => ({ bucket: b, revenue: revenueByBucket.get(b) ?? 0 })),
  };

  // --- crescimento de alunos (com churn real via statusChangedAt) ---
  const growthByBucket = bucketKeys.map((bucketKey) => {
    const bucketStart = unit === "day" ? bucketKey : `${bucketKey}-01`;
    const bucketEnd = unit === "day" ? bucketKey : lastDayOfMonth(bucketKey);
    let activeCount = 0;
    let newCount = 0;
    let churnedCount = 0;
    for (const s of students) {
      const created = s.createdAt ? String(s.createdAt).slice(0, 10) : "";
      if (created <= bucketEnd) activeCount++;
      if (created >= bucketStart && created <= bucketEnd) newCount++;
      const changedAt = s.statusChangedAt ? String(s.statusChangedAt).slice(0, 10) : "";
      if (s.status === "INATIVO" && changedAt >= bucketStart && changedAt <= bucketEnd) churnedCount++;
    }
    return { bucket: bucketKey, active: activeCount, new: newCount, churned: churnedCount };
  });

  // --- aulas no período (base para presenças/popularidade/check-ins/ocupação) ---
  const expandedPeriod = await fetchExpandedLessonsInRange(supabase, periodStart, periodEnd, schoolId);
  const lessonIdsAll = [...new Set(expandedPeriod.map((l) => l.id))];
  const occMetaAll = new Map(
    expandedPeriod.map((l) => [
      `${l.id}_${l.occurrenceDate}`,
      { modality: l.modality ?? "", capacity: l.capacity ?? null },
    ])
  );

  let attendances: { lessonId: string; occurrenceDate: string }[] = [];
  if (lessonIdsAll.length > 0) {
    const { data } = await supabase
      .from("Attendance")
      .select("lessonId, occurrenceDate")
      .eq("status", "CONFIRMED")
      .in("lessonId", lessonIdsAll);
    attendances = data ?? [];
  }
  const countByOccurrence = new Map<string, number>();
  for (const a of attendances) {
    const occ = typeof a.occurrenceDate === "string" ? a.occurrenceDate.slice(0, 10) : "";
    const key = `${a.lessonId}_${occ}`;
    if (!occMetaAll.has(key)) continue;
    countByOccurrence.set(key, (countByOccurrence.get(key) ?? 0) + 1);
  }

  /** Popularidade por modalidade NUNCA é filtrada pela modalidade escolhida — é a própria quebra. */
  const modalityCountMap: Record<string, number> = {};
  for (const [key, meta] of occMetaAll) {
    const c = countByOccurrence.get(key) ?? 0;
    if (c > 0) modalityCountMap[meta.modality] = (modalityCountMap[meta.modality] ?? 0) + c;
  }
  const modalityNameByCode = new Map(modalities.map((m) => [m.code, m.name]));
  const modalityPopularity = Object.entries(modalityCountMap).map(([code, cnt]) => ({
    modalityCode: code,
    modalityName: modalityNameByCode.get(code) ?? code,
    count: cnt,
  }));

  /** Os restantes (presença média, check-ins por dia, ocupação) respeitam o filtro de modalidade. */
  const occMetaFiltered = modalityCode
    ? new Map([...occMetaAll].filter(([, meta]) => meta.modality === modalityCode))
    : occMetaAll;

  const occKeysFiltered = [...occMetaFiltered.keys()];
  const totalAttFiltered = occKeysFiltered.reduce((sum, k) => sum + (countByOccurrence.get(k) ?? 0), 0);
  const avgAttendance = occKeysFiltered.length > 0 ? totalAttFiltered / occKeysFiltered.length : 0;

  const weekdayCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const key of occKeysFiltered) {
    const c = countByOccurrence.get(key) ?? 0;
    if (c === 0) continue;
    const occDate = key.slice(key.indexOf("_") + 1);
    const [y, m, d] = occDate.split("-").map(Number);
    const jsDay = new Date(y, m - 1, d).getDay();
    const weekday = jsDay === 0 ? 7 : jsDay;
    weekdayCounts[weekday] += c;
  }
  const checkinsByWeekday = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, count: weekdayCounts[weekday] }));

  let occupancySum = 0;
  let occupancyCount = 0;
  let lessonsWithoutCapacity = 0;
  for (const [key, meta] of occMetaFiltered) {
    if (meta.capacity == null || meta.capacity <= 0) {
      lessonsWithoutCapacity++;
      continue;
    }
    const c = countByOccurrence.get(key) ?? 0;
    occupancySum += c / meta.capacity;
    occupancyCount++;
  }
  const occupancyRate = {
    averagePercent: occupancyCount > 0 ? (occupancySum / occupancyCount) * 100 : 0,
    lessonsWithoutCapacity,
  };

  // --- novos alunos por modalidade (sem filtro de modalidade) ---
  const countByModality: Record<string, number> = {};
  for (const m of modalities) countByModality[m.code] = 0;
  countByModality[""] = 0;
  for (const s of studentsInPeriod) {
    const code = s.primaryModality ?? "";
    if (!(code in countByModality)) countByModality[code] = 0;
    countByModality[code]++;
  }
  const newStudentsByModality = modalities.map((m) => ({
    modalityCode: m.code,
    modalityName: m.name,
    count: countByModality[m.code] ?? 0,
  }));
  if (countByModality[""] > 0) {
    newStudentsByModality.push({ modalityCode: "", modalityName: "Sem modalidade", count: countByModality[""] });
  }

  // --- novos alunos por plano (filtro de modalidade aplica-se aqui) ---
  const studentsForPlan = modalityCode
    ? studentsInPeriod.filter((s) => s.primaryModality === modalityCode)
    : studentsInPeriod;

  let plansQuery = supabase.from("Plan").select("id, name");
  if (schoolId) plansQuery = plansQuery.eq("schoolId", schoolId);
  const [{ data: plans }] = await Promise.all([plansQuery]);

  /** Ver `lib/admin-dashboard-stats.ts` — plano família conta no plano de referência de cada membro. */
  const familyStudentIds = studentsForPlan.filter((s) => isFamilyPlan(s.planId)).map((s) => s.id);
  const referencePlanByStudent = await loadFamilyReferencePlanIdByStudent(supabase, familyStudentIds);

  const countByPlan: Record<string, number> = {};
  let noPlanCount = 0;
  for (const s of studentsForPlan) {
    const effectivePlanId = s.planId && isFamilyPlan(s.planId) ? referencePlanByStudent.get(s.id) ?? s.planId : s.planId;
    if (!effectivePlanId) {
      noPlanCount++;
      continue;
    }
    countByPlan[effectivePlanId] = (countByPlan[effectivePlanId] ?? 0) + 1;
  }
  const newStudentsByPlan = (plans ?? [])
    .map((p) => ({
      planId: p.id,
      planName: p.name,
      count: countByPlan[p.id] ?? 0,
    }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);
  if (noPlanCount > 0) {
    newStudentsByPlan.push({ planId: null, planName: "Sem plano", count: noPlanCount });
  }

  // --- avaliações de performance por semana ---
  const weekStarts = getWeekStartsInRange(periodStart, periodEnd);
  const weekCounts = new Map<string, number>(weekStarts.map((w) => [w, 0]));
  let athleteIds: string[] = [];
  if (studentIds.length > 0) {
    const { data: athletes } = await supabase.from("Athlete").select("id").in("studentId", studentIds);
    athleteIds = (athletes ?? []).map((a) => (a as { id: string }).id);
  }
  if (athleteIds.length > 0) {
    let evalQuery = supabase
      .from("AthleteEvaluation")
      .select("id, created_at")
      .gte("created_at", periodStartTs)
      .lt("created_at", periodEndExclusiveTs)
      .in("athleteId", athleteIds);
    if (modalityCode) evalQuery = evalQuery.eq("modality", modalityCode);
    const { data: evaluations } = await evalQuery;
    for (const ev of evaluations ?? []) {
      const createdAt = (ev as { created_at: string }).created_at;
      const lisbonDate = formatInTimeZone(new Date(createdAt), LISBON_TZ, "yyyy-MM-dd");
      const weekStart = getWeekStartMondayForDateInLisbon(lisbonDate);
      if (weekCounts.has(weekStart)) weekCounts.set(weekStart, (weekCounts.get(weekStart) ?? 0) + 1);
    }
  }
  const evaluationsPerWeek = weekStarts.map((weekStart) => ({
    weekStart,
    count: weekCounts.get(weekStart) ?? 0,
  }));

  // --- engajamento em cursos ---
  let courseIds: string[] | null = null;
  if (modalityCode) {
    const { data: courses } = await supabase.from("Course").select("id").eq("modality", modalityCode);
    courseIds = (courses ?? []).map((c) => (c as { id: string }).id);
  }

  let unitsCompleted = 0;
  let coursesCompleted = 0;
  let studentsWithPaidPurchase = 0;
  let topCourses: { courseId: string; courseName: string; completions: number }[] = [];

  if (!modalityCode || (courseIds && courseIds.length > 0)) {
    if (modalityCode && courseIds) {
      const { data: modulesData } = await supabase.from("CourseModule").select("id").in("course_id", courseIds);
      const moduleIds = (modulesData ?? []).map((m) => (m as { id: string }).id);
      if (moduleIds.length > 0) {
        const { data: units } = await supabase.from("CourseUnit").select("id").in("module_id", moduleIds);
        const unitIds = (units ?? []).map((u) => (u as { id: string }).id);
        if (unitIds.length > 0) {
          const { count: c } = await supabase
            .from("CourseUnitProgress")
            .select("id", { count: "exact", head: true })
            .gte("completed_at", periodStartTs)
            .lt("completed_at", periodEndExclusiveTs)
            .in("unit_id", unitIds);
          unitsCompleted = c ?? 0;
        }
      }
    } else {
      const { count: c } = await supabase
        .from("CourseUnitProgress")
        .select("id", { count: "exact", head: true })
        .gte("completed_at", periodStartTs)
        .lt("completed_at", periodEndExclusiveTs);
      unitsCompleted = c ?? 0;
    }

    let completionsQuery = supabase
      .from("CourseCompletion")
      .select("course_id")
      .gte("completed_at", periodStartTs)
      .lt("completed_at", periodEndExclusiveTs);
    if (modalityCode && courseIds) completionsQuery = completionsQuery.in("course_id", courseIds);
    const { data: completions } = await completionsQuery;
    coursesCompleted = completions?.length ?? 0;

    const completionCountByCourse = new Map<string, number>();
    for (const c of completions ?? []) {
      const courseId = (c as { course_id: string }).course_id;
      completionCountByCourse.set(courseId, (completionCountByCourse.get(courseId) ?? 0) + 1);
    }
    const topEntries = [...completionCountByCourse.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (topEntries.length > 0) {
      const { data: courseRows } = await supabase
        .from("Course")
        .select("id, name")
        .in("id", topEntries.map(([id]) => id));
      const nameById = new Map((courseRows ?? []).map((c) => [(c as { id: string }).id, (c as { name: string }).name]));
      topCourses = topEntries.map(([courseId, completionsCount]) => ({
        courseId,
        courseName: nameById.get(courseId) ?? courseId,
        completions: completionsCount,
      }));
    }

    let purchaseQuery = supabase
      .from("CoursePurchase")
      .select("studentId")
      .eq("status", "PAID")
      .gte("createdAt", periodStartTs)
      .lt("createdAt", periodEndExclusiveTs);
    if (modalityCode && courseIds) purchaseQuery = purchaseQuery.in("courseId", courseIds);
    const { data: purchases } = await purchaseQuery;
    studentsWithPaidPurchase = new Set((purchases ?? []).map((p) => (p as { studentId: string }).studentId)).size;
  }

  return {
    bucketUnit: unit,
    revenue,
    growthByBucket,
    avgAttendance,
    modalityPopularity,
    checkinsByWeekday,
    newStudentsByModality,
    newStudentsByPlan,
    evaluationsPerWeek,
    courseEngagement: { unitsCompleted, coursesCompleted, studentsWithPaidPurchase, topCourses },
    occupancyRate,
  };
}
