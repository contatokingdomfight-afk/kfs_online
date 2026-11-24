import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { applySchoolGradeOverrides, type SchoolGradeOverride } from "./school-overrides";
import type { GraduationAxis, GraduationTemplateDraft } from "./template";

type GradeRow = {
  id: string;
  sortOrder: number;
  name: string;
  subtitle: string | null;
  motto: string | null;
  objective: string | null;
  notes: string | null;
  colors: string[] | null;
  minMonths: number;
  minAttendances: number | null;
  minPerformanceAvg: number | string | null;
  physicalAssessmentMaxAgeMonths: number | null;
  passMinAxisAvg: number | string;
};

/** Ajustes (tempo/presenças/nota mínima) de uma escola aos graus dados. */
export async function loadSchoolGradeOverrides(
  supabase: SupabaseClient,
  schoolId: string,
  gradeIds: string[]
): Promise<SchoolGradeOverride[]> {
  if (gradeIds.length === 0) return [];
  const { data } = await supabase
    .from("SchoolGraduationGradeOverride")
    .select("gradeId, minMonths, minAttendances, minPerformanceAvg")
    .eq("schoolId", schoolId)
    .in("gradeId", gradeIds);
  return (data ?? []).map((r) => ({
    gradeId: r.gradeId as string,
    minMonths: r.minMonths as number | null,
    minAttendances: r.minAttendances as number | null,
    minPerformanceAvg: r.minPerformanceAvg == null ? null : Number(r.minPerformanceAvg),
  }));
}

/** Template com os requisitos ajustados pela escola (sem escola → o da rede). */
export async function withSchoolOverrides(
  supabase: SupabaseClient,
  template: GraduationTemplateDraft | null,
  schoolId: string | null | undefined
): Promise<GraduationTemplateDraft | null> {
  if (!template || !schoolId) return template;
  const overrides = await loadSchoolGradeOverrides(supabase, schoolId, template.grades.map((g) => g.id));
  if (overrides.length === 0) return template;
  return { ...template, grades: applySchoolGradeOverrides(template.grades, overrides) };
}

/**
 * Carrega o template completo de uma modalidade no formato do editor (null se ainda não existe).
 * Com `schoolId`, aplica os ajustes dessa escola (tempo/presenças/nota mínima) — usar para o progresso do aluno.
 */
export async function loadGraduationTemplate(
  supabase: SupabaseClient,
  modalityCode: string,
  opts?: { schoolId?: string | null }
): Promise<GraduationTemplateDraft | null> {
  if (opts?.schoolId) return withSchoolOverrides(supabase, await loadGraduationTemplate(supabase, modalityCode), opts.schoolId);
  const { data: template } = await supabase
    .from("GraduationTemplate")
    .select("id, modalityCode, name, isPublished, monthlyMinAttendances")
    .eq("modalityCode", modalityCode)
    .maybeSingle();
  if (!template) return null;

  const { data: gradeRows } = await supabase
    .from("GraduationGrade")
    .select(
      "id, sortOrder, name, subtitle, motto, objective, notes, colors, minMonths, minAttendances, minPerformanceAvg, physicalAssessmentMaxAgeMonths, passMinAxisAvg"
    )
    .eq("templateId", template.id)
    .order("sortOrder", { ascending: true });
  const grades = (gradeRows ?? []) as GradeRow[];
  const gradeIds = grades.map((g) => g.id);

  const [items, courses, requirements] = gradeIds.length
    ? await Promise.all([
        supabase
          .from("GraduationItem")
          .select("id, gradeId, axis, label, description, isCritical, sortOrder")
          .in("gradeId", gradeIds)
          .order("sortOrder", { ascending: true }),
        supabase.from("GraduationGradeCourse").select("gradeId, courseId, isRequired").in("gradeId", gradeIds),
        supabase
          .from("GraduationRequirement")
          .select("id, gradeId, label, sortOrder")
          .in("gradeId", gradeIds)
          .order("sortOrder", { ascending: true }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const toNumber = (v: number | string | null) => (v === null ? null : Number(v));

  return {
    modalityCode: template.modalityCode,
    name: template.name,
    isPublished: template.isPublished,
    monthlyMinAttendances: template.monthlyMinAttendances,
    grades: grades.map((g) => ({
      id: g.id,
      name: g.name,
      subtitle: g.subtitle,
      motto: g.motto,
      objective: g.objective,
      notes: g.notes,
      colors: g.colors ?? [],
      minMonths: g.minMonths,
      minAttendances: g.minAttendances,
      minPerformanceAvg: toNumber(g.minPerformanceAvg),
      physicalAssessmentMaxAgeMonths: g.physicalAssessmentMaxAgeMonths,
      passMinAxisAvg: Number(g.passMinAxisAvg),
      items: (items.data ?? [])
        .filter((i) => i.gradeId === g.id)
        .map((i) => ({
          id: i.id,
          axis: i.axis as GraduationAxis,
          label: i.label,
          description: i.description,
          isCritical: i.isCritical,
        })),
      courses: (courses.data ?? [])
        .filter((c) => c.gradeId === g.id)
        .map((c) => ({ courseId: c.courseId, isRequired: c.isRequired })),
      requirements: (requirements.data ?? [])
        .filter((r) => r.gradeId === g.id)
        .map((r) => ({ id: r.id, label: r.label })),
    })),
  };
}
