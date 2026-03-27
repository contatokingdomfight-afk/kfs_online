"use client";

import { useMemo, useState } from "react";
import type { CriterionScoreItem } from "@/lib/evaluation-results-data";
import { SkillBar } from "./SkillBar";

type Props = {
  categoryName: string;
  /** Título do acordeão (ex.: só subcategoria quando um filtro principal está ativo). */
  headingLabel?: string;
  items: CriterionScoreItem[];
  defaultOpen?: boolean;
  showTrend?: boolean;
};

function categoryAverage(items: CriterionScoreItem[]): { avg: number; maxRef: number } {
  const valid = items.filter(
    (i) => Number.isFinite(i.score) && Number.isFinite(i.maxScore) && i.maxScore > 0
  );
  const maxRef = valid[0]?.maxScore ?? items[0]?.maxScore ?? 10;
  if (valid.length === 0) {
    return { avg: 0, maxRef: Number.isFinite(maxRef) && maxRef > 0 ? maxRef : 10 };
  }
  const sum = valid.reduce((acc, i) => acc + i.score, 0);
  return { avg: sum / valid.length, maxRef };
}

export function SkillCategory({
  categoryName,
  headingLabel,
  items,
  defaultOpen = false,
  showTrend = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const { avg, maxRef } = useMemo(() => categoryAverage(items), [items]);
  const avgPct =
    maxRef > 0 && Number.isFinite(avg) ? Math.min(100, Math.max(0, (avg / maxRef) * 100)) : 0;

  const displayTitle =
    headingLabel != null && String(headingLabel).trim() !== ""
      ? String(headingLabel).trim()
      : categoryName;

  if (items.length === 0) return null;

  return (
    <div
      className={`rounded-xl border border-solid bg-[var(--bg-secondary)] overflow-hidden transition-[border-color,box-shadow,transform] duration-300 ease-out ${
        open
          ? "border-[color-mix(in_srgb,var(--text-primary)_28%,var(--border))] shadow-md"
          : "border-[var(--border)] shadow-sm hover:shadow-md hover:scale-[1.005]"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[var(--border)]/25 transition-colors outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border)]"
        aria-expanded={open}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 flex-1 pr-1">
          <span className="font-semibold text-[var(--text-primary)] text-left truncate">
            {displayTitle}
          </span>
          <div className="flex items-center gap-2.5 sm:ml-auto sm:mr-1 flex-shrink-0">
            <span
              className="text-xs font-medium tabular-nums text-[var(--text-secondary)]"
              title="Média da categoria"
            >
              {Number.isFinite(avg) ? avg.toFixed(1) : "—"}
              <span className="text-[var(--text-secondary)]/80 font-normal">/{maxRef}</span>
            </span>
            <div
              className="h-1.5 w-20 sm:w-24 rounded-full bg-[var(--border)]/70 overflow-hidden"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-500 ease-out"
                style={{ width: `${avgPct}%` }}
              />
            </div>
          </div>
        </div>
        <span
          className="text-[var(--text-secondary)] transition-transform duration-300 ease-out flex-shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="border-t border-[var(--border)]/60">
          <div
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 pt-3 px-3 sm:px-4 [-webkit-overflow-scrolling:touch] scroll-pl-3 scroll-pr-3 sm:scroll-pl-4 sm:scroll-pr-4"
            role="region"
            aria-label={`Critérios: ${displayTitle}`}
          >
            {items.map((item) => (
              <div
                key={item.criterionId}
                className="min-w-[80%] sm:min-w-[45%] lg:min-w-[36%] max-w-[min(100%,340px)] snap-center shrink-0"
              >
                <SkillBar item={item} showTrend={showTrend} variant="card" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
