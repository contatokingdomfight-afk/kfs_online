"use client";

import type { CriterionScoreItem } from "@/lib/evaluation-results-data";

type Props = {
  strengths: CriterionScoreItem[];
  weaknesses: CriterionScoreItem[];
  className?: string;
};

export function StrengthsWeaknesses({ strengths, weaknesses, className = "" }: Props) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 shadow-md">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--success)] mb-3 flex items-center gap-2">
          <span aria-hidden>✔</span>
          Pontos fortes
        </h3>
        <ul className="list-none p-0 m-0 space-y-2">
          {strengths.length === 0 ? (
            <li className="text-sm text-[var(--text-secondary)]">—</li>
          ) : (
            strengths.map((s) => (
              <li
                key={s.criterionId}
                className="text-sm text-[var(--text-primary)] flex items-center gap-2"
              >
                <span className="text-[var(--success)]" aria-hidden>✔</span>
                {s.label}
                <span className="text-[var(--text-secondary)] tabular-nums ml-auto">
                  {s.score}/{s.maxScore}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 shadow-md">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--warning)] mb-3 flex items-center gap-2">
          <span aria-hidden>⚠</span>
          Áreas a melhorar
        </h3>
        <ul className="list-none p-0 m-0 space-y-2">
          {weaknesses.length === 0 ? (
            <li className="text-sm text-[var(--text-secondary)]">—</li>
          ) : (
            weaknesses.map((w) => (
              <li
                key={w.criterionId}
                className="text-sm text-[var(--text-primary)] flex items-center gap-2"
              >
                <span className="text-[var(--warning)]" aria-hidden>⚠</span>
                {w.label}
                <span className="text-[var(--text-secondary)] tabular-nums ml-auto">
                  {w.score}/{w.maxScore}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
