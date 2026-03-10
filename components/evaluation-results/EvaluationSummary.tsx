"use client";

import type { DimensionScore } from "@/lib/evaluation-results-data";
import { DIMENSION_ICONS } from "@/lib/evaluation-results-data";

type Props = {
  dimensionScores: DimensionScore[];
  overallScore: number;
  maxScore?: number;
  className?: string;
};

export function EvaluationSummary({
  dimensionScores,
  overallScore,
  maxScore = 10,
  className = "",
}: Props) {
  return (
    <section
      className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 shadow-lg ${className}`}
    >
      <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
        Resumo da avaliação
      </h2>
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-6">
        <div className="text-center sm:text-left">
          <p className="text-xs text-[var(--text-secondary)] mb-0.5">Pontuação geral</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">
            {overallScore.toFixed(1)}
            <span className="text-lg font-normal text-[var(--text-secondary)]"> / {maxScore}</span>
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {dimensionScores.map((d) => {
          const pct = d.maxScore > 0 ? (d.score / d.maxScore) * 100 : 0;
          const icon = DIMENSION_ICONS[d.id] ?? "•";
          return (
            <div key={d.id} className="flex items-center gap-3">
              <span className="w-8 text-center flex-shrink-0" aria-hidden>
                {icon}
              </span>
              <span className="w-24 flex-shrink-0 text-sm font-medium text-[var(--text-primary)]">
                {d.label}
              </span>
              <div className="flex-1 h-3 rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <span className="w-10 text-right text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                {d.score.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
