import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadGraduationTemplate } from "./load-template";
import { averageEvaluationScores, computeStudentProgress, type StudentProgress } from "./progress";

/** Últimas N avaliações de performance usadas na média (igual ao radar). */
const PERFORMANCE_LAST_N = 10;

export type StudentModalityGraduation = {
  modalityCode: string;
  modalityName: string;
  isPrimary: boolean;
  lastAwardedAt: string | null;
  totalGrades: number;
  /** Posição (1-based) do grau atual; 0 = sem graduação. */
  currentPosition: number;
  monthlyMinAttendances: number;
  progress: StudentProgress;
};

/**
 * Graduação do aluno em cada modalidade com template publicado em que ele treina
 * (modalidade principal, presenças confirmadas ou grau já atribuído). Principal primeiro.
 * Usa o cliente service-role: o chamador garante que `studentId` é o aluno autenticado.
 */
export async function loadStudentGraduations(
  supabase: SupabaseClient,
  studentId: string,
  options: {
    now?: Date;
    /** Pré-visualização do admin: só esta modalidade, mesmo em rascunho e sem presenças do aluno. */
    previewModalityCode?: string;
  } = {}
): Promise<StudentModalityGraduation[]> {
  const now = options.now ?? new Date();
  const preview = options.previewModalityCode ?? null;
  let templatesQuery = supabase.from("GraduationTemplate").select("modalityCode");
  templatesQuery = preview ? templatesQuery.eq("modalityCode", preview) : templatesQuery.eq("isPublished", true);
  const { data: templates } = await templatesQuery;
  const publishedCodes = new Set((templates ?? []).map((t) => t.modalityCode as string));
  if (publishedCodes.size === 0) return [];

  const [{ data: student }, { data: gradeRows }, attendanceRows, { data: modalityRows }] = await Promise.all([
    supabase.from("Student").select("primaryModality").eq("id", studentId).maybeSingle(),
    supabase
      .from("StudentGrade")
      .select("modalityCode, gradeId, awardedAt")
      .eq("studentId", studentId)
      .order("awardedAt", { ascending: false }),
    loadConfirmedAttendances(supabase, studentId),
    supabase.from("ModalityRef").select("code, name"),
  ]);

  const lessonIds = [...new Set(attendanceRows.map((a) => a.lessonId as string))];
  const lessonModality = new Map<string, string>();
  for (let i = 0; i < lessonIds.length; i += 200) {
    const { data: lessons } = await supabase.from("Lesson").select("id, modality").in("id", lessonIds.slice(i, i + 200));
    for (const l of lessons ?? []) lessonModality.set(l.id, l.modality);
  }

  const attendanceByModality = new Map<string, Date[]>();
  for (const a of attendanceRows) {
    const code = lessonModality.get(a.lessonId);
    if (!code) continue;
    const list = attendanceByModality.get(code) ?? [];
    list.push(new Date(`${a.occurrenceDate}T00:00:00Z`));
    attendanceByModality.set(code, list);
  }

  const latestGrade = new Map<string, { gradeId: string; awardedAt: string }>();
  for (const g of gradeRows ?? []) {
    if (!latestGrade.has(g.modalityCode)) latestGrade.set(g.modalityCode, { gradeId: g.gradeId, awardedAt: g.awardedAt });
  }

  const primary = (student?.primaryModality as string | null) ?? null;
  const codes = [...publishedCodes]
    .filter((code) => code === preview || code === primary || attendanceByModality.has(code) || latestGrade.has(code))
    .sort((a, b) => Number(b === primary) - Number(a === primary));
  if (codes.length === 0) return [];

  const [templatesFull, { data: athlete }, { data: physical }, { data: completions }, { data: fulfilled }] = await Promise.all([
    Promise.all(codes.map((code) => loadGraduationTemplate(supabase, code))),
    supabase.from("Athlete").select("id").eq("studentId", studentId).maybeSingle(),
    supabase
      .from("StudentPhysicalAssessment")
      .select("assessedAt")
      .eq("studentId", studentId)
      .eq("status", "SUBMITTED")
      .order("assessedAt", { ascending: false })
      .limit(1),
    supabase.from("CourseCompletion").select("course_id").eq("student_id", studentId),
    supabase.from("StudentGraduationRequirement").select("requirementId").eq("studentId", studentId),
  ]);

  const evaluationsByModality = new Map<string, { scores: Record<string, unknown> | null }[]>();
  if (athlete) {
    await Promise.all(
      codes.map(async (code) => {
        const { data } = await supabase
          .from("AthleteEvaluation")
          .select("scores")
          .eq("athleteId", athlete.id)
          .eq("modality", code)
          .order("created_at", { ascending: false })
          .limit(PERFORMANCE_LAST_N);
        evaluationsByModality.set(code, (data ?? []) as { scores: Record<string, unknown> | null }[]);
      })
    );
  }

  const courseIds = [...new Set(templatesFull.flatMap((t) => t?.grades.flatMap((g) => g.courses.map((c) => c.courseId)) ?? []))];
  const { data: courses } = courseIds.length
    ? await supabase.from("Course").select("id, name").in("id", courseIds)
    : { data: [] as { id: string; name: string }[] };
  const courseNames = new Map((courses ?? []).map((c) => [c.id, c.name]));
  const completedCourseIds = new Set((completions ?? []).map((c) => c.course_id as string));
  const fulfilledRequirementIds = new Set((fulfilled ?? []).map((r) => r.requirementId as string));
  const lastPhysical = physical?.[0]?.assessedAt ? new Date(`${String(physical[0].assessedAt).slice(0, 10)}T00:00:00Z`) : null;
  const modalityNames = new Map((modalityRows ?? []).map((m) => [m.code, m.name]));

  const result: StudentModalityGraduation[] = [];
  codes.forEach((code, i) => {
    const template = templatesFull[i];
    if (!template || template.grades.length === 0) return;
    const latest = latestGrade.get(code) ?? null;
    const currentGradeIndex = latest ? template.grades.findIndex((g) => g.id === latest.gradeId) : -1;
    const evaluations = evaluationsByModality.get(code) ?? [];
    const lastAwardedAt = latest ? new Date(latest.awardedAt) : null;

    result.push({
      modalityCode: code,
      modalityName: modalityNames.get(code) ?? code,
      isPrimary: code === primary,
      lastAwardedAt: latest?.awardedAt ?? null,
      totalGrades: template.grades.length,
      currentPosition: currentGradeIndex + 1,
      monthlyMinAttendances: template.monthlyMinAttendances,
      progress: computeStudentProgress({
        grades: template.grades,
        monthlyMinAttendances: template.monthlyMinAttendances,
        currentGradeIndex,
        lastAwardedAt,
        attendanceDates: attendanceByModality.get(code) ?? [],
        performanceAvg: averageEvaluationScores(evaluations),
        performanceEvaluationCount: evaluations.length,
        lastPhysicalAssessmentAt: lastPhysical,
        completedCourseIds,
        courseNames,
        fulfilledRequirementIds,
        now,
      }),
    });
  });
  return result;
}

/** Presenças confirmadas (paginado: o PostgREST devolve no máximo 1000 linhas por pedido). */
async function loadConfirmedAttendances(
  supabase: SupabaseClient,
  studentId: string
): Promise<{ lessonId: string; occurrenceDate: string }[]> {
  const pageSize = 1000;
  const rows: { lessonId: string; occurrenceDate: string }[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data } = await supabase
      .from("Attendance")
      .select("lessonId, occurrenceDate")
      .eq("studentId", studentId)
      .eq("status", "CONFIRMED")
      .eq("isExperimental", false)
      .order("occurrenceDate", { ascending: true })
      .range(from, from + pageSize - 1);
    rows.push(...((data ?? []) as { lessonId: string; occurrenceDate: string }[]));
    if (!data || data.length < pageSize) return rows;
  }
}
