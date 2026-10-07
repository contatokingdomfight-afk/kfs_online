import type { StudentModalityGraduation } from "@/lib/graduation/load-student-progress";

/** Dados simples (serializáveis) para o cartão — pode ser passado a componentes cliente. */
export type GraduationSummary = {
  modalityName: string;
  currentName: string | null;
  currentColors: string[];
  nextName: string | null;
  nextColors: string[];
  doneCount: number;
  totalChecks: number;
  isReadyForExam: boolean;
};

export function toGraduationSummary(g: StudentModalityGraduation): GraduationSummary {
  const { current, next } = g.progress;
  return {
    modalityName: g.modalityName,
    currentName: current?.name ?? null,
    currentColors: current?.colors ?? [],
    nextName: next?.name ?? null,
    nextColors: next?.colors ?? [],
    doneCount: g.progress.doneCount,
    totalChecks: g.progress.checks.length,
    isReadyForExam: g.progress.isReadyForExam,
  };
}
