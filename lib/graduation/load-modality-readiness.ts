import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadGraduationTemplate } from "./load-template";
import { averageEvaluationScores, computeStudentProgress, type StudentProgress } from "./progress";
import { fetchAllPages, inChunks } from "./queries";
import type { GraduationTemplateDraft } from "./template";

const PERFORMANCE_LAST_N = 10;

export type ModalityStudentReadiness = {
  studentId: string;
  name: string;
  isPrimary: boolean;
  progress: StudentProgress;
  /** Requisitos manuais do próximo grau ainda por validar. */
  pendingRequirements: { id: string; label: string }[];
  /** Convocatória ativa (evento agendado) desta modalidade, se existir. */
  activeConvocation: { eventId: string; title: string; scheduledAt: string } | null;
};

export type ModalityReadiness = {
  template: GraduationTemplateDraft;
  students: ModalityStudentReadiness[];
};

/**
 * Estado de todos os alunos ativos de uma modalidade face ao próximo grau (para convocar exames).
 * Inclui alunos com a modalidade como principal, com presenças confirmadas nela ou com grau atribuído.
 */
export async function loadModalityReadiness(
  supabase: SupabaseClient,
  modalityCode: string,
  now: Date = new Date()
): Promise<ModalityReadiness | null> {
  const template = await loadGraduationTemplate(supabase, modalityCode);
  if (!template || template.grades.length === 0) return null;

  const [students, lessons, gradeRows] = await Promise.all([
    fetchAllPages<{ id: string; userId: string; primaryModality: string | null }>((from, to) =>
      supabase.from("Student").select("id, userId, primaryModality").eq("status", "ATIVO").order("id").range(from, to)
    ),
    fetchAllPages<{ id: string }>((from, to) => supabase.from("Lesson").select("id").eq("modality", modalityCode).order("id").range(from, to)),
    fetchAllPages<{ studentId: string; gradeId: string; awardedAt: string; source: string }>((from, to) =>
      supabase
        .from("StudentGrade")
        .select("studentId, gradeId, awardedAt, source")
        .eq("modalityCode", modalityCode)
        .order("awardedAt", { ascending: false })
        .range(from, to)
    ),
  ]);

  const attendances = await inChunks(
    lessons.map((l) => l.id),
    (chunk) =>
      fetchAllPages<{ studentId: string; occurrenceDate: string }>((from, to) =>
        supabase
          .from("Attendance")
          .select("studentId, occurrenceDate")
          .in("lessonId", chunk)
          .eq("status", "CONFIRMED")
          .eq("isExperimental", false)
          .order("id")
          .range(from, to)
      )
  );

  const attendanceByStudent = new Map<string, Date[]>();
  for (const a of attendances) {
    const list = attendanceByStudent.get(a.studentId) ?? [];
    list.push(new Date(`${a.occurrenceDate}T00:00:00Z`));
    attendanceByStudent.set(a.studentId, list);
  }
  const latestGrade = new Map<string, { gradeId: string; awardedAt: string; source: string }>();
  for (const g of gradeRows) if (!latestGrade.has(g.studentId)) latestGrade.set(g.studentId, g);

  // Modalidades compostas (ex.: MMA) cujos graus incluem esta modalidade: os seus alunos também contam.
  const { data: composites } = await supabase.from("ModalityRef").select("code").contains("graduationModalities", [modalityCode]);
  const compositeCodes = new Set((composites ?? []).map((c) => c.code as string));
  const relevant = students.filter(
    (s) =>
      s.primaryModality === modalityCode ||
      (s.primaryModality != null && compositeCodes.has(s.primaryModality)) ||
      attendanceByStudent.has(s.id) ||
      latestGrade.has(s.id)
  );
  const ids = relevant.map((s) => s.id);
  if (ids.length === 0) return { template, students: [] };

  const courseIds = [...new Set(template.grades.flatMap((g) => g.courses.map((c) => c.courseId)))];

  const [users, athletes, physicals, completions, fulfilled, candidates] = await Promise.all([
    inChunks(relevant.map((s) => s.userId), async (chunk) => (await supabase.from("User").select("id, name").in("id", chunk)).data ?? []),
    inChunks(ids, async (chunk) => (await supabase.from("Athlete").select("id, studentId").in("studentId", chunk)).data ?? []),
    inChunks(
      ids,
      async (chunk) =>
        (await supabase.from("StudentPhysicalAssessment").select("studentId, assessedAt").in("studentId", chunk).eq("status", "SUBMITTED"))
          .data ?? []
    ),
    courseIds.length
      ? inChunks(
          ids,
          async (chunk) =>
            (await supabase.from("CourseCompletion").select("student_id, course_id").in("student_id", chunk).in("course_id", courseIds)).data ?? []
        )
      : Promise.resolve([] as { student_id: string; course_id: string }[]),
    inChunks(
      ids,
      async (chunk) => (await supabase.from("StudentGraduationRequirement").select("studentId, requirementId").in("studentId", chunk)).data ?? []
    ),
    inChunks(
      ids,
      async (chunk) =>
        (await supabase.from("GraduationExamCandidate").select("studentId, gradeId, status, decidedAt, eventId").in("studentId", chunk)).data ?? []
    ),
  ]);

  const athleteIds = athletes.map((a) => a.id);
  const evaluations = await inChunks(athleteIds, (chunk) =>
    fetchAllPages<{ athleteId: string; scores: Record<string, unknown> | null }>((from, to) =>
      supabase
        .from("AthleteEvaluation")
        .select("athleteId, scores")
        .in("athleteId", chunk)
        .eq("modality", modalityCode)
        .order("created_at", { ascending: false })
        .range(from, to)
    )
  );

  const eventIds = [...new Set(candidates.map((c) => c.eventId))];
  const events = await inChunks(
    eventIds,
    async (chunk) =>
      (await supabase.from("GraduationExamEvent").select("id, title, scheduledAt, status, modalityCode").in("id", chunk)).data ?? []
  );
  const eventById = new Map(events.map((e) => [e.id, e]));

  const names = new Map(users.map((u) => [u.id, u.name ?? ""]));
  const athleteByStudent = new Map(athletes.map((a) => [a.studentId, a.id]));
  const evalsByAthlete = new Map<string, { scores: Record<string, unknown> | null }[]>();
  for (const e of evaluations) {
    const list = evalsByAthlete.get(e.athleteId) ?? [];
    if (list.length < PERFORMANCE_LAST_N) list.push(e);
    evalsByAthlete.set(e.athleteId, list);
  }
  const lastPhysical = new Map<string, Date>();
  for (const p of physicals) {
    const d = new Date(`${String(p.assessedAt).slice(0, 10)}T00:00:00Z`);
    const prev = lastPhysical.get(p.studentId);
    if (!prev || d > prev) lastPhysical.set(p.studentId, d);
  }
  const completedByStudent = new Map<string, Set<string>>();
  for (const c of completions) {
    const set = completedByStudent.get(c.student_id) ?? new Set<string>();
    set.add(c.course_id);
    completedByStudent.set(c.student_id, set);
  }
  const fulfilledByStudent = new Map<string, Set<string>>();
  for (const r of fulfilled) {
    const set = fulfilledByStudent.get(r.studentId) ?? new Set<string>();
    set.add(r.requirementId);
    fulfilledByStudent.set(r.studentId, set);
  }

  const { data: courses } = courseIds.length
    ? await supabase.from("Course").select("id, name").in("id", courseIds)
    : { data: [] as { id: string; name: string }[] };
  const courseNames = new Map((courses ?? []).map((c) => [c.id, c.name]));

  const result: ModalityStudentReadiness[] = relevant.map((s) => {
    const latest = latestGrade.get(s.id) ?? null;
    const currentGradeIndex = latest ? template.grades.findIndex((g) => g.id === latest.gradeId) : -1;
    const next = template.grades[currentGradeIndex + 1] ?? null;
    const athleteId = athleteByStudent.get(s.id);
    const evals = athleteId ? evalsByAthlete.get(athleteId) ?? [] : [];
    const studentCandidates = candidates.filter((c) => c.studentId === s.id && eventById.get(c.eventId)?.modalityCode === modalityCode);
    const lastFailed = studentCandidates
      .filter((c) => c.status === "FAILED" && next && c.gradeId === next.id && c.decidedAt)
      .map((c) => new Date(c.decidedAt as string))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const active = studentCandidates.find((c) => c.status === "CONVOKED" && eventById.get(c.eventId)?.status === "SCHEDULED");
    const activeEvent = active ? eventById.get(active.eventId) : undefined;
    const fulfilledSet = fulfilledByStudent.get(s.id) ?? new Set<string>();

    return {
      studentId: s.id,
      name: names.get(s.userId) || "Sem nome",
      isPrimary: s.primaryModality === modalityCode || (s.primaryModality != null && compositeCodes.has(s.primaryModality)),
      pendingRequirements: (next?.requirements ?? []).filter((r) => !fulfilledSet.has(r.id)),
      activeConvocation: activeEvent ? { eventId: activeEvent.id, title: activeEvent.title, scheduledAt: activeEvent.scheduledAt } : null,
      progress: computeStudentProgress({
        grades: template.grades,
        monthlyMinAttendances: template.monthlyMinAttendances,
        currentGradeIndex,
        lastAwardedAt: latest ? new Date(latest.awardedAt) : null,
        currentGradeSource: (latest?.source as "EXAM" | "MIGRATION" | "MANUAL" | undefined) ?? null,
        attendanceDates: attendanceByStudent.get(s.id) ?? [],
        performanceAvg: averageEvaluationScores(evals),
        performanceEvaluationCount: evals.length,
        lastPhysicalAssessmentAt: lastPhysical.get(s.id) ?? null,
        completedCourseIds: completedByStudent.get(s.id) ?? new Set(),
        courseNames,
        fulfilledRequirementIds: fulfilledSet,
        lastFailedExamAt: lastFailed ?? null,
        now,
      }),
    };
  });

  result.sort(
    (a, b) =>
      Number(b.progress.isReadyForExam) - Number(a.progress.isReadyForExam) ||
      b.progress.doneCount / Math.max(1, b.progress.checks.length) - a.progress.doneCount / Math.max(1, a.progress.checks.length) ||
      a.name.localeCompare(b.name, "pt")
  );
  return { template, students: result };
}
