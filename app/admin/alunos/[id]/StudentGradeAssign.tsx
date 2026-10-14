import type { SupabaseClient } from "@supabase/supabase-js";
import { loadGraduationTemplate } from "@/lib/graduation/load-template";
import { StudentGradeAssignForm, type GradeOption, type ModalityGradeBlock } from "./StudentGradeAssignForm";

/** Ficha do aluno: grau atual por modalidade com graduação + atalho para atribuir o grau que vem de outra escola. */
export async function StudentGradeAssign({ supabase, studentId }: { supabase: SupabaseClient; studentId: string }) {
  const { data: templates } = await supabase.from("GraduationTemplate").select("modalityCode");
  const codes = [...new Set((templates ?? []).map((t) => String((t as { modalityCode: string }).modalityCode)))];
  if (codes.length === 0) return null;

  const [{ data: mods }, { data: grades }] = await Promise.all([
    supabase.from("ModalityRef").select("code, name").in("code", codes),
    supabase
      .from("StudentGrade")
      .select("modalityCode, gradeId, source, awardedAt, notes")
      .eq("studentId", studentId)
      .order("awardedAt", { ascending: false }),
  ]);
  const nameByCode = new Map(
    (mods ?? []).map((m) => {
      const r = m as { code: string; name: string | null };
      return [r.code, r.name ?? r.code] as const;
    })
  );
  const latest = new Map<string, { gradeId: string; source: string; awardedAt: string; notes: string | null }>();
  for (const g of grades ?? []) {
    const r = g as { modalityCode: string; gradeId: string; source: string; awardedAt: string; notes: string | null };
    if (!latest.has(r.modalityCode)) latest.set(r.modalityCode, r);
  }

  const blocks: ModalityGradeBlock[] = [];
  for (const code of codes) {
    const tpl = await loadGraduationTemplate(supabase, code);
    if (!tpl || tpl.grades.length === 0) continue;
    const options: GradeOption[] = tpl.grades.map((g) => ({ id: g.id, name: g.name }));
    const cur = latest.get(code) ?? null;
    blocks.push({
      code,
      name: nameByCode.get(code) ?? code,
      options,
      currentGradeId: cur?.gradeId ?? null,
      currentGradeName: cur ? (options.find((o) => o.id === cur.gradeId)?.name ?? null) : null,
      currentSource: (cur?.source as ModalityGradeBlock["currentSource"]) ?? null,
      currentDate: cur ? cur.awardedAt.slice(0, 10) : null,
      currentNotes: cur?.notes ?? null,
    });
  }
  if (blocks.length === 0) return null;

  return <StudentGradeAssignForm studentId={studentId} blocks={blocks} />;
}
