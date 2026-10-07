import "server-only";

import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { inChunks } from "./queries";

/** Grau a mostrar no lugar da faixa antiga (por XP). */
export type DisplayGrade = {
  modalityCode: string;
  modalityName: string;
  /** null = sem graduação (ainda não fez o primeiro exame). */
  gradeName: string | null;
  colors: string[];
};

export function displayGradeLabel(g: DisplayGrade): string {
  return g.gradeName ?? "Sem graduação";
}

/**
 * Para cada aluno, o grau da modalidade principal (ou, sem principal, da modalidade em que tem grau),
 * só quando essa modalidade tem graduação PUBLICADA. Alunos fora do mapa continuam com a faixa antiga.
 * Usa o cliente service-role (também é usado em páginas públicas, ex. cartão de lutador).
 */
export async function loadDisplayGrades(studentIds: string[]): Promise<Map<string, DisplayGrade>> {
  const out = new Map<string, DisplayGrade>();
  const supabase = getAdminClientOrNull().client;
  const ids = [...new Set(studentIds.filter(Boolean))];
  if (!supabase || ids.length === 0) return out;

  const { data: templates } = await supabase.from("GraduationTemplate").select("modalityCode").eq("isPublished", true);
  const published = new Set((templates ?? []).map((t) => t.modalityCode as string));
  if (published.size === 0) return out;

  const [students, grades, { data: modalities }] = await Promise.all([
    inChunks(ids, async (chunk) => (await supabase.from("Student").select("id, primaryModality").in("id", chunk)).data ?? []),
    inChunks(
      ids,
      async (chunk) =>
        (
          await supabase
            .from("StudentGrade")
            .select("studentId, modalityCode, gradeId, awardedAt")
            .in("studentId", chunk)
            .in("modalityCode", [...published])
            .order("awardedAt", { ascending: false })
        ).data ?? []
    ),
    supabase.from("ModalityRef").select("code, name, graduationModalities"),
  ]);

  const gradeIds = [...new Set(grades.map((g) => g.gradeId as string))];
  const gradeRows = await inChunks(gradeIds, async (chunk) => (await supabase.from("GraduationGrade").select("id, name, colors, sortOrder").in("id", chunk)).data ?? []);
  const gradeById = new Map(gradeRows.map((g) => [g.id as string, g]));
  const modalityName = new Map((modalities ?? []).map((m) => [m.code as string, m.name as string]));
  const components = new Map((modalities ?? []).map((m) => [m.code as string, ((m.graduationModalities as string[] | null) ?? []).filter((c) => published.has(c))]));

  // Último grau por (aluno, modalidade).
  const latest = new Map<string, string>();
  for (const g of grades) {
    const key = `${g.studentId}|${g.modalityCode}`;
    if (!latest.has(key)) latest.set(key, g.gradeId as string);
  }

  for (const s of students) {
    const primary = s.primaryModality as string | null;
    let code: string | null = primary && published.has(primary) ? primary : null;
    // Modalidade composta (ex.: MMA): o grau mais alto entre as modalidades base (ou a primeira, sem graus).
    const bases = primary ? components.get(primary) ?? [] : [];
    if (!code && bases.length > 0) {
      const position = (c: string) => (gradeById.get(latest.get(`${s.id}|${c}`) ?? "")?.sortOrder as number | undefined) ?? -1;
      code = [...bases].sort((a, b) => position(b) - position(a))[0] ?? null;
    }
    if (!code) code = grades.find((g) => g.studentId === s.id)?.modalityCode ?? null;
    if (!code) continue;
    const grade = gradeById.get(latest.get(`${s.id}|${code}`) ?? "");
    out.set(s.id as string, {
      modalityCode: code,
      modalityName: modalityName.get(code) ?? code,
      gradeName: (grade?.name as string | undefined) ?? null,
      colors: (grade?.colors as string[] | undefined) ?? [],
    });
  }
  return out;
}

export async function loadDisplayGrade(studentId: string): Promise<DisplayGrade | null> {
  return (await loadDisplayGrades([studentId])).get(studentId) ?? null;
}
