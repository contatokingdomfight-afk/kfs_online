"use client";

import type { CriterionScoreItem } from "@/lib/evaluation-results-data";

type Props = {
  item: CriterionScoreItem;
  showTrend?: boolean;
  className?: string;
};

export function SkillBar({ item, showTrend = true, className = "" }: Props) {
  const pct = item.maxScore > 0 ? (item.score / item.maxScore) * 100 : 0;
  const hasTrend = showTrend && item.previousScore != null;
  const delta = hasTrend ? item.score - (item.previousScore ?? 0) : 0;

  return (
    <div className={`py-2 border-b border-[var(--border)] last:border-0 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
          {item.label}
        </span>
        <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums flex-shrink-0">
          {item.score}/{item.maxScore}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {hasTrend && delta !== 0 && (
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Anterior: {item.previousScore}/{item.maxScore}
          {delta > 0 && (
            <span className="text-[var(--success)] font-medium ml-1">+{delta} melhoria</span>
          )}
          {delta < 0 && (
            <span className="text-[var(--danger)] font-medium ml-1">{delta}</span>
          )}
        </p>
      )}
    </div>
  );
}
