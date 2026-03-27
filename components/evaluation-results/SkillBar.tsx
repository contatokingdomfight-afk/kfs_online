"use client";

import { useEffect, useState } from "react";
import type { CriterionScoreItem } from "@/lib/evaluation-results-data";

type Props = {
  item: CriterionScoreItem;
  showTrend?: boolean;
  className?: string;
  /** list: linha compacta (legado); card: cartão para carrossel */
  variant?: "list" | "card";
};

/** Normaliza para escala 0–10 para faixas qualitativas (0–3 / 4–7 / 8–10). */
function normalizedTen(score: number, maxScore: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return 0;
  return Math.min(10, Math.max(0, (score / maxScore) * 10));
}

function qualitativeLabel(norm: number): string {
  if (norm <= 3) return "Iniciante";
  if (norm <= 7) return "Intermediário";
  return "Avançado";
}

function qualitativeClasses(tierLabel: string): string {
  if (tierLabel === "Iniciante") return "text-amber-700/90 dark:text-amber-400/95";
  if (tierLabel === "Intermediário") return "text-sky-700/90 dark:text-sky-400/95";
  return "text-emerald-700/90 dark:text-emerald-400/95";
}

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

  const norm = normalizedTen(rawScore, max);
  const tierLabel = qualitativeLabel(norm);
  const tierClass = qualitativeClasses(tierLabel);

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
        className={`rounded-2xl border border-[var(--border)]/80 bg-[var(--bg-secondary)] p-4 shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:scale-[1.02] hover:border-[var(--primary)]/30 ${className}`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-3">
            {labelText}
          </span>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0 text-right">
            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums leading-none">
              {rawScore}/{max}
            </span>
            <span className={`text-[11px] font-medium leading-tight ${tierClass}`}>{tierLabel}</span>
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-[var(--border)]/80 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-700 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        {hasTrend && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mb-3">
            <div className="flex items-center gap-1.5 font-semibold tabular-nums text-[var(--text-primary)]">
              <span className="text-[var(--text-secondary)]/90">{prev}</span>
              <span className="text-[var(--text-secondary)]">→</span>
              <span>{rawScore}</span>
            </div>
            {delta > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--success)]/15 px-2 py-0.5 text-[var(--success)] font-semibold tabular-nums">
                <span aria-hidden>▲</span>
                <span>+{delta}</span>
              </span>
            )}
            {delta < 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--danger)]/15 px-2 py-0.5 text-[var(--danger)] font-semibold tabular-nums">
                <span aria-hidden>▼</span>
                <span>{delta}</span>
              </span>
            )}
            {delta === 0 && (
              <span className="text-[var(--text-secondary)] tabular-nums">—</span>
            )}
          </div>
        )}
        <p className="text-[11px] text-[var(--text-secondary)] opacity-90 border-t border-[var(--border)]/50 pt-3">
          <span className="cursor-default select-none">Ver como melhorar →</span>
        </p>
      </div>
    );
  }

  return (
    <div className={`py-2.5 border-b border-[var(--border)]/55 last:border-0 ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium text-[var(--text-primary)] truncate leading-snug">
          {labelText}
        </span>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0 text-right">
          <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums leading-none">
            {rawScore}/{max}
          </span>
          <span className={`text-[11px] font-medium leading-tight ${tierClass}`}>{tierLabel}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[var(--border)]/80 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-700 ease-out"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {hasTrend && (
        <p className="text-xs mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {delta > 0 && (
            <span className="text-[var(--success)] font-semibold" aria-hidden>
              ▲
            </span>
          )}
          {delta < 0 && (
            <span className="text-[var(--danger)] font-semibold" aria-hidden>
              ▼
            </span>
          )}
          {delta === 0 && (
            <span className="text-[var(--text-secondary)] font-medium" aria-hidden>
              —
            </span>
          )}
          <span
            className={
              delta > 0
                ? "text-[var(--success)] font-semibold tabular-nums"
                : delta < 0
                  ? "text-[var(--danger)] font-semibold tabular-nums"
                  : "text-[var(--text-secondary)] tabular-nums"
            }
          >
            {prev} → {rawScore}
          </span>
        </p>
      )}
      <p className="text-[11px] text-[var(--text-secondary)] mt-2 opacity-90">
        <span className="cursor-default select-none">Ver como melhorar →</span>
      </p>
    </div>
  );
}
