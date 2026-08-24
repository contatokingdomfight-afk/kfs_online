/**
 * Dados para a secção ActionItems do dashboard Admin.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { paymentTypeLabelPt } from "@/lib/admin-payment-list-grouping";

const LOW_ATTENDANCE_THRESHOLD = 3;

export type PendingPayment = {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string | null;
  amount: number;
  referenceMonth: string;
  referenceYear: string;
  paymentType: string;
  paymentTypeLabel: string;
  familyDiscountPercent: number | null;
};

export type PendingTrial = {
  id: string;
  name: string;
  contact: string;
  modality: string;
  lessonDate: string;
  lessonId: string | null;
};

export type LowAttendanceLesson = {
  id: string;
  modality: string;
  date: string;
  startTime: string;
  endTime: string;
  confirmedCount: number;
  pendingCount: number;
};

export type ActionItemsData = {
  pendingPayments: PendingPayment[];
  pendingTrials: PendingTrial[];
  lowAttendanceLessons: LowAttendanceLesson[];
};

export async function getActionItemsData(
  supabase: SupabaseClient,
  schoolId: string | null
): Promise<ActionItemsData> {
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().slice(0, 10);

  let studentsQuery = supabase.from("Student").select("id, userId");
  if (schoolId) studentsQuery = studentsQuery.eq("schoolId", schoolId);
  const { data: allStudents } = await studentsQuery;
  const studentIds = (allStudents ?? []).map((s) => s.id);

  let paymentsQuery = supabase
    .from("Payment")
    .select("id, studentId, amount, referenceMonth, referenceYear, paymentType")
    .eq("status", "LATE")
    .order("referenceMonth", { ascending: false });

  if (studentIds.length > 0) {
    paymentsQuery = paymentsQuery.in("studentId", studentIds);
  } else {
    paymentsQuery = paymentsQuery.eq("studentId", "__none__");
  }

  const { data: payments } = await paymentsQuery;
  const paymentList = payments ?? [];
  const payStudentIds = [...new Set(paymentList.map((p) => p.studentId))];
  let studentMap = new Map<string, string>();
  let phoneByStudentId = new Map<string, string | null>();
  if (payStudentIds.length > 0) {
    const { data: students } = await supabase.from("Student").select("id, userId").in("id", payStudentIds);
    const userIds = [...new Set((students ?? []).map((s) => s.userId))];
    const [{ data: users }, { data: profiles }] = await Promise.all([
      supabase.from("User").select("id, name").in("id", userIds),
      supabase.from("StudentProfile").select("studentId, phone").in("studentId", payStudentIds),
    ]);
    const userById = new Map((users ?? []).map((u) => [u.id, u.name]));
    const studentToUser = new Map((students ?? []).map((s) => [s.id, userById.get(s.userId)]));
    studentMap = new Map((students ?? []).map((s) => [s.id, studentToUser.get(s.id) ?? "—"]));
    phoneByStudentId = new Map((profiles ?? []).map((p) => [p.studentId, (p as { phone?: string | null }).phone ?? null]));
  }

  // Desconto de família: só relevante para a mensalidade combinada do titular.
  const { data: titularRows } = payStudentIds.length
    ? await supabase
        .from("FamilyGroupMember")
        .select("studentId, familyGroupId")
        .eq("role", "TITULAR")
        .in("studentId", payStudentIds)
    : { data: [] as { studentId: string; familyGroupId: string }[] };
  const familyGroupIdByStudent = new Map(
    (titularRows ?? []).map((r) => [r.studentId, (r as { familyGroupId: string }).familyGroupId])
  );
  const familyGroupIds = [...new Set(familyGroupIdByStudent.values())];
  const { data: familyGroups } = familyGroupIds.length
    ? await supabase.from("FamilyGroup").select("id, discountPercent").in("id", familyGroupIds)
    : { data: [] as { id: string; discountPercent: number }[] };
  const discountByGroup = new Map(
    (familyGroups ?? []).map((g) => [g.id, Number((g as { discountPercent?: number }).discountPercent ?? 0)])
  );

  const filteredPayments: PendingPayment[] = paymentList.map((p) => {
    const paymentType = String((p as { paymentType?: string }).paymentType ?? "TUITION");
    const groupId = familyGroupIdByStudent.get(p.studentId);
    const familyDiscountPercent =
      paymentType === "TUITION" && groupId ? discountByGroup.get(groupId) ?? null : null;
    return {
      id: p.id,
      studentId: p.studentId,
      studentName: studentMap.get(p.studentId) ?? "—",
      studentPhone: phoneByStudentId.get(p.studentId) ?? null,
      amount: Number(p.amount),
      referenceMonth: (p.referenceMonth as string | null) ?? "",
      referenceYear: ((p as { referenceYear?: string | null }).referenceYear as string | null) ?? "",
      paymentType,
      paymentTypeLabel: paymentTypeLabelPt(paymentType),
      familyDiscountPercent,
    };
  });

  // Aulas experimentais pendentes (não convertidas, não aceites)
  const { data: trialsRaw } = await supabase
    .from("TrialClass")
    .select("id, name, contact, modality, lessonDate, lessonId, acceptedAt")
    .eq("convertedToStudent", false)
    .order("createdAt", { ascending: false });

  const trialsFiltered = (trialsRaw ?? []).filter((t) => !(t as { acceptedAt?: string | null }).acceptedAt);

  let pendingTrials: PendingTrial[] = trialsFiltered.map((t) => ({
    id: t.id,
    name: t.name,
    contact: t.contact,
    modality: t.modality,
    lessonDate: String(t.lessonDate),
    lessonId: t.lessonId,
  }));

  if (schoolId) {
    const lessonIds = [...new Set(pendingTrials.map((t) => t.lessonId).filter(Boolean))] as string[];
    if (lessonIds.length > 0) {
      const { data: lessons } = await supabase
        .from("Lesson")
        .select("id")
        .eq("schoolId", schoolId)
        .in("id", lessonIds);
      const validLessonIds = new Set((lessons ?? []).map((l) => l.id));
      pendingTrials = pendingTrials.filter((t) => !t.lessonId || validLessonIds.has(t.lessonId));
    } else {
      pendingTrials = [];
    }
  }

  // Turmas com baixa adesão (próxima semana)
  let lessonsQuery = supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime")
    .gte("date", today)
    .lte("date", nextWeekStr)
    .order("date", { ascending: true })
    .order("startTime", { ascending: true });
  if (schoolId) lessonsQuery = lessonsQuery.eq("schoolId", schoolId);
  const { data: lessons } = await lessonsQuery;
  const lessonIds = (lessons ?? []).map((l) => l.id);
  const lowAttendanceLessons: LowAttendanceLesson[] = [];

  if (lessonIds.length > 0) {
    const { data: attendances } = await supabase
      .from("Attendance")
      .select("lessonId, status")
      .in("lessonId", lessonIds);
    const byLesson = new Map<string, { confirmed: number; pending: number }>();
    for (const lid of lessonIds) byLesson.set(lid, { confirmed: 0, pending: 0 });
    for (const a of attendances ?? []) {
      const m = byLesson.get(a.lessonId);
      if (m) {
        if (a.status === "CONFIRMED") m.confirmed++;
        else if (a.status === "PENDING") m.pending++;
      }
    }
    for (const l of lessons ?? []) {
      const m = byLesson.get(l.id)!;
      const total = m.confirmed + m.pending;
      if (total < LOW_ATTENDANCE_THRESHOLD) {
        lowAttendanceLessons.push({
          id: l.id,
          modality: l.modality,
          date: l.date,
          startTime: l.startTime,
          endTime: l.endTime,
          confirmedCount: m.confirmed,
          pendingCount: m.pending,
        });
      }
    }
  }

  return {
    pendingPayments: filteredPayments,
    pendingTrials,
    lowAttendanceLessons,
  };
}
