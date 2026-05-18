"use client";

import { useState } from "react";
import Link from "next/link";
import type { EvaluationHistoryModalDetail } from "@/lib/evaluation-history-modal-types";

/** Linha de base 1–10 alinhada com o formulário do treinador (valores só a 5 = “não avaliado” em registos antigos). */
const EVAL_HISTORY_BASELINE_10 = 5;

/**
 * Registos legados gravavam todos os critérios a 5/10; esconde esse ruído quando há pelo menos uma nota ≠ 5.
 * Mantém 5/10 quando a evolução mostra mudança face à avaliação anterior (ex.: 7 → 5).
 */
function filterScoresForHistoryModal(
  scores: Record<string, number>,
  previous: EvaluationHistoryModalDetail["previous"]
): Record<string, number> {
  const entries = Object.entries(scores);
  const hasNonBaseline = entries.some(([, v]) => v !== EVAL_HISTORY_BASELINE_10);
  if (!hasNonBaseline) return scores;
  return Object.fromEntries(
    entries.filter(([id, v]) => {
      if (v !== EVAL_HISTORY_BASELINE_10) return true;
      const prevRaw = previous?.scores?.[id];
      return typeof prevRaw === "number" && !Number.isNaN(prevRaw) && prevRaw !== EVAL_HISTORY_BASELINE_10;
    })
  );
}

function formatModality(mod: string | null): string {
  if (!mod) return "";
  return mod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ScoreValueWithChange({ prev, value, suffix }: { prev: number | undefined; value: number; suffix: string }) {
  const changed = prev !== undefined && prev !== value;
  if (!changed) {
    return (
      <span className="text-primary font-medium flex-shrink-0">
        {value}
        {suffix}
      </span>
    );
  }
  return (
    <span className="text-primary font-medium flex-shrink-0 text-right">
      <span className="text-text-secondary line-through decoration-text-secondary/80">{prev}</span>
      <span className="text-text-secondary mx-1" aria-hidden>
        →
      </span>
      <span className="underline underline-offset-2 decoration-2 decoration-primary">{value}</span>
      {suffix}
    </span>
  );
}

type ListItem = { id: string; coachName: string; date: string };

type Props = {
  list: ListItem[];
  getEvaluationById: (evalId: string) => Promise<EvaluationHistoryModalDetail | { error: string }>;
  backHref: string;
  backLabel: string;
};

export function EvaluationHistoryClient({ list, getEvaluationById, backHref, backLabel }: Props) {
  const [modalEval, setModalEval] = useState<EvaluationHistoryModalDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openEvaluation(id: string) {
    setError(null);
    setLoadingId(id);
    try {
      const result = await getEvaluationById(id);
      if ("error" in result) {
        setError(result.error);
        setModalEval(null);
      } else {
        setModalEval(result);
      }
    } finally {
      setLoadingId(null);
    }
  }

  const defaultIntro = (
    <p className="text-sm text-text-secondary mb-4">
      Clica numa avaliação para ver o detalhe: <strong>treinador</strong>, critérios <strong>avaliados nesta sessão</strong>
      {` `}e, quando existir avaliação anterior, a <strong>evolução</strong> (valor antigo → novo, sublinhado).
    </p>
  );

  return (
    <>
      <div className="card p-4 sm:p-6">
        {defaultIntro}
        {list.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-text-secondary">Ainda não há avaliações.</p>
            <Link href={backHref} className="btn btn-primary mt-4 inline-block no-underline">
              {backLabel}
            </Link>
          </div>
        ) : (
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {list.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openEvaluation(item.id)}
                  disabled={loadingId === item.id}
                  className="w-full text-left rounded-xl border border-border bg-bg-secondary p-4 hover:bg-bg transition-colors disabled:opacity-70"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Treinador</span>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-semibold text-text-primary text-base">{item.coachName}</span>
                      <span className="text-text-secondary text-sm">{item.date}</span>
                      {loadingId === item.id && <span className="text-sm text-text-secondary">A carregar…</span>}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        <Link href={backHref} className="inline-block mt-6 text-sm font-medium text-primary no-underline hover:underline">
          {backLabel} →
        </Link>
      </div>

      {modalEval && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="eval-modal-title"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setModalEval(null)}
        >
          <div
            className="bg-bg border border-border rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between gap-2">
              <h2 id="eval-modal-title" className="text-lg font-bold text-text-primary">
                Avaliação
              </h2>
              <button
                type="button"
                onClick={() => setModalEval(null)}
                className="p-2 text-text-secondary hover:text-text-primary shrink-0"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Treinador</p>
                <p className="text-sm text-text-primary">
                  <strong className="text-base font-semibold">{modalEval.coachName}</strong>
                  {modalEval.date ? (
                    <>
                      <span className="text-text-secondary"> · </span>
                      <span className="text-text-secondary">{modalEval.date}</span>
                    </>
                  ) : null}
                  {modalEval.modality ? (
                    <>
                      <span className="text-text-secondary"> · </span>
                      <span className="text-text-secondary">{formatModality(modalEval.modality)}</span>
                    </>
                  ) : null}
                </p>
              </div>
              {modalEval.note ? (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase mb-1">Comentário</p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{modalEval.note}</p>
                </div>
              ) : (
                <p className="text-sm text-text-secondary italic">O treinador não deixou comentário nesta avaliação.</p>
              )}
              {modalEval.scores && Object.keys(modalEval.scores).length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase mb-2">Critérios avaliados (1–10)</p>
                  <ul className="space-y-2 text-sm">
                    {Object.entries(filterScoresForHistoryModal(modalEval.scores, modalEval.previous)).map(([criterionId, value]) => {
                      const label = modalEval.criterionLabels?.[criterionId] ?? criterionId;
                      const prevRaw = modalEval.previous?.scores?.[criterionId];
                      const prev = typeof prevRaw === "number" && !Number.isNaN(prevRaw) ? prevRaw : undefined;
                      return (
                        <li key={criterionId} className="flex justify-between gap-3 items-baseline">
                          <span className="text-text-primary min-w-0">{label}</span>
                          <ScoreValueWithChange prev={prev} value={value} suffix="/10" />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {(modalEval.gas != null ||
                modalEval.technique != null ||
                modalEval.strength != null ||
                modalEval.theory != null) && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase mb-2">Dimensões avaliadas (1–5)</p>
                  <ul className="space-y-2 text-sm">
                    {modalEval.gas != null ? (
                      <li className="flex justify-between gap-3 items-baseline">
                        <span className="text-text-primary">Gás</span>
                        <ScoreValueWithChange
                          prev={modalEval.previous?.gas ?? undefined}
                          value={modalEval.gas}
                          suffix=""
                        />
                      </li>
                    ) : null}
                    {modalEval.technique != null ? (
                      <li className="flex justify-between gap-3 items-baseline">
                        <span className="text-text-primary">Técnico</span>
                        <ScoreValueWithChange
                          prev={modalEval.previous?.technique ?? undefined}
                          value={modalEval.technique}
                          suffix=""
                        />
                      </li>
                    ) : null}
                    {modalEval.strength != null ? (
                      <li className="flex justify-between gap-3 items-baseline">
                        <span className="text-text-primary">Força</span>
                        <ScoreValueWithChange
                          prev={modalEval.previous?.strength ?? undefined}
                          value={modalEval.strength}
                          suffix=""
                        />
                      </li>
                    ) : null}
                    {modalEval.theory != null ? (
                      <li className="flex justify-between gap-3 items-baseline">
                        <span className="text-text-primary">Teórico</span>
                        <ScoreValueWithChange
                          prev={modalEval.previous?.theory ?? undefined}
                          value={modalEval.theory}
                          suffix=""
                        />
                      </li>
                    ) : null}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
