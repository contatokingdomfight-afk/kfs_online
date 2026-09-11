"use client";

import Link from "next/link";
import type { StudentEvaluationHistoryItem } from "@/lib/student-evaluations-history";
import { EvaluationHistoryClient } from "@/components/evaluation/EvaluationHistoryClient";
import type { EvaluationHistoryModalDetail } from "@/lib/evaluation-history-modal-types";

type Props = {
  items: StudentEvaluationHistoryItem[];
  getEvaluationById: (evalId: string) => Promise<EvaluationHistoryModalDetail | { error: string }>;
  backHref: string;
  backLabel: string;
  newPhysicalHref?: string;
  newPerformanceHref?: string;
};

export function StudentEvaluationsHistoryClient({
  items,
  getEvaluationById,
  backHref,
  backLabel,
  newPhysicalHref,
  newPerformanceHref,
}: Props) {
  const performanceItems = items.filter((i) => i.kind === "performance");
  const physicalItems = items.filter((i) => i.kind === "physical");

  if (items.length === 0) {
    return (
      <div className="card p-4 sm:p-6">
        <p className="text-sm text-text-secondary mb-4">
          Ainda não há avaliações de <strong>performance</strong> nem fichas de <strong>avaliação física</strong>{" "}
          entregues para este aluno.
        </p>
        <div className="flex flex-wrap gap-2">
          {newPhysicalHref ? (
            <Link href={newPhysicalHref} className="btn btn-primary inline-block no-underline">
              Nova avaliação física
            </Link>
          ) : null}
          {newPerformanceHref ? (
            <Link href={newPerformanceHref} className="btn btn-secondary inline-block no-underline">
              Ir para performance
            </Link>
          ) : null}
          <Link href={backHref} className="btn btn-secondary inline-block no-underline">
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {physicalItems.length > 0 ? (
        <section className="card p-4 sm:p-6">
          <h2 className="text-base font-semibold text-text-primary m-0 mb-1">Avaliações físicas</h2>
          <p className="text-sm text-text-secondary mb-4">
            Fichas de anamnese entregues. Clica para ver o detalhe completo.
          </p>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {physicalItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.viewHref}
                  className="block w-full text-left rounded-xl border border-border bg-bg-secondary p-4 hover:bg-bg transition-colors no-underline"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">Avaliação física</span>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-semibold text-text-primary text-base">{item.dateLabel}</span>
                      <span className="text-text-secondary text-sm">· {item.clearanceLabel}</span>
                    </div>
                    <span className="text-text-secondary text-sm">Por {item.coachName}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {performanceItems.length > 0 ? (
        <EvaluationHistoryClient
          list={performanceItems.map((item) => ({
            id: item.id,
            coachName: item.coachName,
            date: item.dateLabel,
          }))}
          getEvaluationById={getEvaluationById}
          backHref={backHref}
          backLabel={backLabel}
          sectionTitle="Avaliações de performance"
          introOverride={
            <p className="text-sm text-text-secondary mb-4">
              Sessões de avaliação técnica nas modalidades. Clica numa linha para ver critérios, comentário do treinador
              e evolução face à avaliação anterior.
            </p>
          }
          showBackLink={false}
        />
      ) : (
        <div className="card p-4 sm:p-6">
          <h2 className="text-base font-semibold text-text-primary m-0 mb-2">Avaliações de performance</h2>
          <p className="text-sm text-text-secondary mb-4">
            Ainda não há avaliações de performance registadas{physicalItems.length > 0 ? " (só fichas físicas acima)" : ""}.
          </p>
          {newPerformanceHref ? (
            <Link href={newPerformanceHref} className="text-sm font-medium text-primary no-underline hover:underline">
              {backLabel} →
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
