"use client";

import { useState } from "react";
import Link from "next/link";
import type { EvaluationDetail } from "../actions";

function formatModality(mod: string | null): string {
  if (!mod) return "";
  return mod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type ListItem = { id: string; coachName: string; date: string };

type Props = {
  list: ListItem[];
  getEvaluationById: (evalId: string) => Promise<EvaluationDetail | { error: string }>;
  backHref: string;
  backLabel: string;
};

export function EvaluationHistoryClient({ list, getEvaluationById, backHref, backLabel }: Props) {
  const [modalEval, setModalEval] = useState<EvaluationDetail | null>(null);
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

  return (
    <>
    <div className="card p-4 sm:p-6">
      <p className="text-sm text-text-secondary mb-4">
        Clica numa avaliação para ver o detalhe (nota do treinador e critérios).
      </p>
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
                <span className="font-medium text-text-primary">{item.coachName}</span>
                <span className="text-text-secondary"> · </span>
                <span className="text-text-secondary">{item.date}</span>
                {loadingId === item.id && (
                  <span className="ml-2 text-sm text-text-secondary">A carregar…</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="mt-4 text-sm text-danger">{error}</p>
      )}
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
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 id="eval-modal-title" className="text-lg font-bold text-text-primary">
                Avaliação
              </h2>
              <button
                type="button"
                onClick={() => setModalEval(null)}
                className="p-2 text-text-secondary hover:text-text-primary"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-text-secondary">
                Por <strong className="text-text-primary">{modalEval.coachName}</strong>
                {modalEval.date ? ` · ${modalEval.date}` : ""}
                {modalEval.modality ? ` · ${formatModality(modalEval.modality)}` : ""}
              </p>
              {modalEval.note ? (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase mb-1">Comentário</p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{modalEval.note}</p>
                </div>
              ) : (
                <p className="text-sm text-text-secondary italic">O treinador não deixou comentário nesta avaliação.</p>
              )}
              {(modalEval.scores && Object.keys(modalEval.scores).length > 0) && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase mb-2">Critérios (1–10)</p>
                  <ul className="space-y-2 text-sm">
                    {Object.entries(modalEval.scores).map(([criterionId, value]) => {
                      const label = modalEval.criterionLabels?.[criterionId] ?? criterionId;
                      return (
                        <li key={criterionId} className="flex justify-between gap-2 items-baseline">
                          <span className="text-text-primary min-w-0">{label}</span>
                          <span className="text-primary font-medium flex-shrink-0">{value}/10</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {(modalEval.gas != null || modalEval.technique != null || modalEval.strength != null || modalEval.theory != null) && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase mb-2">Dimensões (1–5)</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {modalEval.gas != null && <span>Técnico: {modalEval.technique ?? "–"}</span>}
                    {modalEval.technique != null && <span>Força: {modalEval.strength ?? "–"}</span>}
                    {modalEval.strength != null && <span>Teórico: {modalEval.theory ?? "–"}</span>}
                    {modalEval.gas != null && <span>Gás: {modalEval.gas}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
