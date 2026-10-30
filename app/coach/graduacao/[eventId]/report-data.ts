import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExamCandidateRow } from "@/lib/graduation/load-exam";
import { GRADUATION_AXIS_META, type GraduationTemplateDraft } from "@/lib/graduation/template";

export type ReportGrade = { name: string; colors: string[] };

export type ExamReportRow = {
  candidateId: string;
  name: string;
  /** Hora do horário marcado (Lisboa) ou null. */
  slot: string | null;
  slotSort: number;
  status: "CONVOKED" | "PASSED" | "FAILED" | "ABSENT";
  revealed: boolean;
  /** Aprovado contra o critério, com justificação. */
  override: boolean;
  isPlacement: boolean;
  /** Grau a que se propõe (exame normal) ou «Nivelamento». */
  examFor: string;
  /** Grau que o aluno tem agora (antes do exame, se o resultado ainda não foi aplicado). */
  currentGrade: ReportGrade | null;
  /** Grau obtido no exame (só se aprovado). */
  newGrade: ReportGrade | null;
  axes: { label: string; avg: number | null; below: boolean }[];
  scored: number;
  total: number;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" });
}

/** Linhas do relatório do dia de exame: resultado, grau atual/novo e médias por eixo de cada convocado. */
export async function buildExamReportRows(
  supabase: SupabaseClient,
  modalityCode: string,
  candidates: ExamCandidateRow[],
  template: GraduationTemplateDraft | null
): Promise<ExamReportRow[]> {
  const gradeById = new Map((template?.grades ?? []).map((g) => [g.id, { name: g.name, colors: g.colors }]));
  const studentIds = [...new Set(candidates.map((c) => c.studentId))];
  const { data: gradeRows } = studentIds.length
    ? await supabase
        .from("StudentGrade")
        .select("studentId, gradeId, awardedAt")
        .eq("modalityCode", modalityCode)
        .in("studentId", studentIds)
        .order("awardedAt", { ascending: false })
    : { data: [] as { studentId: string; gradeId: string; awardedAt: string }[] };
  // Graus de cada aluno, do mais recente para o mais antigo.
  const gradesByStudent = new Map<string, { id: string; at: number }[]>();
  for (const g of gradeRows ?? []) {
    const list = gradesByStudent.get(g.studentId as string) ?? [];
    list.push({ id: g.gradeId as string, at: new Date(g.awardedAt as string).getTime() });
    gradesByStudent.set(g.studentId as string, list);
  }

  return candidates
    .map((c) => {
      const owned = gradesByStudent.get(c.studentId) ?? [];
      const passed = c.status === "PASSED";
      const newGradeId = passed
        ? c.mode === "PLACEMENT"
          ? (template?.grades.find((g) => g.name === c.awardedGradeName)?.id ?? null)
          : c.gradeId
        : null;
      // Depois da revelação o grau novo (e os intermédios, atribuídos no mesmo momento) já estão em
      // StudentGrade: o grau de antes do exame é o primeiro atribuído mais de 10 min antes do mais recente.
      const before =
        passed && c.revealed && owned[0] ? owned.find((g) => owned[0].at - g.at > 10 * 60_000) ?? null : owned[0] ?? null;
      const r = c.result;
      return {
        candidateId: c.id,
        name: c.studentName,
        slot: c.slotStartsAt ? formatTime(c.slotStartsAt) : null,
        slotSort: c.slotStartsAt ? new Date(c.slotStartsAt).getTime() : Number.MAX_SAFE_INTEGER,
        status: c.status,
        revealed: c.revealed,
        override: Boolean(r?.override),
        isPlacement: c.mode === "PLACEMENT",
        examFor: c.mode === "PLACEMENT" ? "Nivelamento" : c.gradeName,
        currentGrade: before ? (gradeById.get(before.id) ?? null) : null,
        newGrade: newGradeId ? (gradeById.get(newGradeId) ?? null) : null,
        axes: (r?.axes ?? []).map((a) => ({
          label: GRADUATION_AXIS_META[a.axis].label,
          avg: a.newAvg,
          below: a.newPassed === false && a.newAvg != null,
        })),
        scored: r?.scoredCount ?? 0,
        total: r?.totalCount ?? 0,
      } satisfies ExamReportRow;
    })
    .sort((a, b) => a.slotSort - b.slotSort || a.name.localeCompare(b.name, "pt"));
}
