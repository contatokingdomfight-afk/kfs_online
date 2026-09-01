/**
 * Dados "instantâneo" do dashboard do Admin: composição atual de alunos/coaches,
 * sem depender de período (ver `lib/admin-dashboard-period-stats.ts` para tendências).
 * Suporta filtro por escola (schoolId opcional = todas as escolas).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedModalityRefs, getCachedSchools } from "@/lib/cached-reference-data";
import { fetchAdminUserIdSet } from "@/lib/admin-dashboard-exclude-admins";
import { isFamilyPlan } from "@/lib/kingdom-plans-constants";
import { loadFamilyReferencePlanIdByStudent } from "@/lib/family-effective-plan";
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
  studentsByPlan: { planId: string | null; planName: string; count: number }[];
  /** Coaches com is_active = true (cruzado com CoachSchool quando há filtro de escola) */
  activeCoaches: number;
  /** Alunos com planId e status ATIVO */
  activeStudents: number;
  /** % de alunos ativos com Payment.status = LATE */
  delinquencyRate: { percent: number; lateStudentsCount: number };
};

export async function fetchExpandedLessonsInRange(
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

  let studentsQuery = supabase
    .from("Student")
    .select("id, userId, schoolId, primaryModality, planId, status, createdAt");
  if (schoolId) studentsQuery = studentsQuery.eq("schoolId", schoolId);
  const [{ data: rawStudents }, adminUserIds] = await Promise.all([
    studentsQuery,
    fetchAdminUserIdSet(supabase),
  ]);
  const students = (rawStudents ?? []).filter((s) => !adminUserIds.has((s as { userId: string }).userId));

  const totalStudents = students.length;
  const countByModality: Record<string, number> = {};
  for (const m of modalities) countByModality[m.code] = 0;
  countByModality[""] = 0;
  for (const s of students) {
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

  let plansQuery = supabase.from("Plan").select("id, name");
  if (schoolId) plansQuery = plansQuery.eq("schoolId", schoolId);
  const [{ data: plans }] = await Promise.all([plansQuery]);

  /**
   * No plano família, `Student.planId` = "plan-familia" é só o agrupamento/desconto —
   * a modalidade/plano real de cada membro vem de `FamilyGroupMember.referencePlanId`
   * (ver DOCS/PLANO_FAMILIA.md). Para "Alunos por plano" contar a distribuição real,
   * cada membro entra na contagem do seu plano de referência, não em "Kingdom Família".
   */
  const familyStudentIds = students
    .filter((s) => isFamilyPlan((s as { planId?: string | null }).planId ?? null))
    .map((s) => (s as { id: string }).id);
  const referencePlanByStudent = await loadFamilyReferencePlanIdByStudent(supabase, familyStudentIds);

  const countByPlan: Record<string, number> = {};
  let noPlanCount = 0;
  for (const s of students) {
    const st = s as { id: string; planId?: string | null };
    const rawPlanId = st.planId ?? null;
    const effectivePlanId = rawPlanId && isFamilyPlan(rawPlanId) ? referencePlanByStudent.get(st.id) ?? rawPlanId : rawPlanId;
    if (!effectivePlanId) {
      noPlanCount++;
      continue;
    }
    countByPlan[effectivePlanId] = (countByPlan[effectivePlanId] ?? 0) + 1;
  }
  const studentsByPlan = (plans ?? [])
    .map((p) => ({
      planId: p.id,
      planName: p.name,
      count: countByPlan[p.id] ?? 0,
    }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);
  if (noPlanCount > 0) {
    studentsByPlan.push({ planId: null, planName: "Sem plano", count: noPlanCount });
  }

  const { data: activeCoachRows } = await supabase.from("Coach").select("id").eq("is_active", true);
  let activeCoaches = activeCoachRows?.length ?? 0;
  if (schoolId && activeCoachRows && activeCoachRows.length > 0) {
    const { data: coachSchoolRows } = await supabase
      .from("CoachSchool")
      .select("coachId")
      .eq("schoolId", schoolId)
      .in(
        "coachId",
        activeCoachRows.map((c) => c.id)
      );
    activeCoaches = new Set((coachSchoolRows ?? []).map((r) => (r as { coachId: string }).coachId)).size;
  }

  let activeStudents = 0;
  const activeStudentIds: string[] = [];
  for (const s of students) {
    const st = s as { id: string; planId?: string | null; status?: string };
    if (st.planId && st.status === "ATIVO") {
      activeStudents++;
      activeStudentIds.push(st.id);
    }
  }

  let lateStudentsCount = 0;
  if (activeStudentIds.length > 0) {
    const { data: latePayments } = await supabase
      .from("Payment")
      .select("studentId")
      .eq("status", "LATE")
      .eq("paymentType", "TUITION")
      .in("studentId", activeStudentIds);
    lateStudentsCount = new Set((latePayments ?? []).map((p) => (p as { studentId: string }).studentId)).size;
  }
  const delinquencyRate = {
    percent: activeStudents > 0 ? (lateStudentsCount / activeStudents) * 100 : 0,
    lateStudentsCount,
  };

  return {
    schools: schools.map((s) => ({ id: s.id, name: s.name })),
    totalStudents,
    studentsByModality,
    studentsByPlan,
    activeCoaches,
    activeStudents,
    delinquencyRate,
  };
}
