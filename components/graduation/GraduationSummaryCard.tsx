import Link from "next/link";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
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

export function GraduationSummaryCard({ summary }: { summary: GraduationSummary }) {
  const status = summary.isReadyForExam
    ? "Apto para exame"
    : summary.nextName && summary.totalChecks > 0
      ? `${summary.doneCount} de ${summary.totalChecks} requisitos para ${summary.nextName}`
      : summary.nextName
        ? `Próximo: ${summary.nextName}`
        : "Grau máximo";
  return (
    <Link
      href="/dashboard/graduacao"
      className="block rounded-2xl border border-border bg-bg-secondary p-4 text-inherit no-underline shadow-md transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <BeltSwatch colors={summary.currentColors} width={44} height={14} />
          <div className="min-w-0">
            <h2 className="m-0 text-base font-bold text-text-primary">
              Graduação {summary.modalityName}: {summary.currentName ?? "Sem graduação"}
            </h2>
            <p className={`m-0 text-sm ${summary.isReadyForExam ? "font-semibold text-success" : "text-text-secondary"}`}>{status}</p>
          </div>
        </div>
        <span className="shrink-0 text-sm font-medium text-primary">Ver →</span>
      </div>
    </Link>
  );
}
