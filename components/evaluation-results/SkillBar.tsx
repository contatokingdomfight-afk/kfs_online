"use client";

import { useEffect, useState } from "react";
import type { CriterionScoreItem } from "@/lib/evaluation-results-data";

type Props = {
  item: CriterionScoreItem;
  showTrend?: boolean;
  className?: string;
  /** list: linha compacta; card: cartão para carrossel */
  variant?: "list" | "card";
};

export function SkillBar({
  item,
  showTrend = true,
  className = "",
  variant = "list",
}: Props) {
  const max = Number.isFinite(item.maxScore) && item.maxScore > 0 ? item.maxScore : 10;
  const rawScore = Number.isFinite(item.score) ? item.score : 0;
  const pct = max > 0 ? (rawScore / max) * 100 : 0;
  const safePct = Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 0));

  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    setBarWidth(safePct);
  }, [safePct]);

  const prev =
    item.previousScore != null && Number.isFinite(item.previousScore)
      ? item.previousScore
      : null;
  const hasTrend = showTrend && prev !== null;
  const delta = hasTrend ? rawScore - prev! : 0;

  const labelText =
    item.label != null && String(item.label).trim() !== "" ? String(item.label) : "—";

  if (variant === "card") {
    return (
      <div
        className={`rounded-2xl border border-solid border-[var(--border)] bg-[var(--bg-secondary)] p-4 shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:border-[color-mix(in_srgb,var(--text-primary)_22%,var(--border))] ${className}`}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-3">
            {labelText}
          </span>
          <span className="text-base font-bold text-[var(--text-primary)] tabular-nums leading-none flex-shrink-0">
            {rawScore}/{max}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-[var(--border)]/50 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-700 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        {hasTrend && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-[var(--text-secondary)] shrink-0">vs. anterior:</span>
            <div className="flex items-center gap-1.5 font-semibold tabular-nums">
              <span
                className={
                  delta === 0
                    ? "text-[var(--text-secondary)]"
                    : delta > 0
                      ? "text-[var(--success)]"
                      : "text-[var(--danger)]"
                }
              >
                {prev} → {rawScore}
              </span>
              {delta > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-[var(--success)]/12 px-1.5 py-0.5 text-[var(--success)] font-semibold tabular-nums">
                  <span aria-hidden>▲</span>
                  +{delta}
                </span>
              )}
              {delta < 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-[var(--danger)]/12 px-1.5 py-0.5 text-[var(--danger)] font-semibold tabular-nums">
                  <span aria-hidden>▼</span>
                  {delta}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`py-2.5 border-b border-[var(--border)]/55 last:border-0 ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium text-[var(--text-primary)] truncate leading-snug">
          {labelText}
        </span>
        <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums leading-none flex-shrink-0">
          {rawScore}/{max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--border)]/80 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-700 ease-out"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {hasTrend && (
        <p className="text-xs mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[var(--text-secondary)]">Anterior:</span>
          <span
            className={
              delta === 0
                ? "text-[var(--text-secondary)] font-medium tabular-nums"
                : delta > 0
                  ? "text-[var(--success)] font-semibold tabular-nums"
                  : "text-[var(--danger)] font-semibold tabular-nums"
            }
          >
            {prev} → {rawScore}
          </span>
          {delta > 0 && (
            <span className="text-[var(--success)] font-semibold tabular-nums">
              (▲ +{delta})
            </span>
          )}
          {delta < 0 && (
            <span className="text-[var(--danger)] font-semibold tabular-nums">(▼ {delta})</span>
          )}
        </p>
      )}
    </div>
  );
}
