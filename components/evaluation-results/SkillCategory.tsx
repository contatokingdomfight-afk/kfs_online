"use client";

import { useMemo, useState } from "react";
import type { CriterionScoreItem } from "@/lib/evaluation-results-data";
import { SkillBar } from "./SkillBar";

type Props = {
  categoryName: string;
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
  items,
  defaultOpen = false,
  showTrend = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const { avg, maxRef } = useMemo(() => categoryAverage(items), [items]);
  const avgPct =
    maxRef > 0 && Number.isFinite(avg) ? Math.min(100, Math.max(0, (avg / maxRef) * 100)) : 0;

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--border)]/70 bg-[var(--bg-secondary)] overflow-hidden transition-all duration-200 ease-out hover:shadow-md hover:scale-[1.005] hover:border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[var(--border)]/25 transition-colors"
        aria-expanded={open}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 flex-1 pr-1">
          <span className="font-semibold text-[var(--text-primary)] text-left truncate">
            {categoryName}
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
        <div className="px-4 pb-3.5 pt-1 border-t border-[var(--border)]/60">
          {items.map((item) => (
            <SkillBar key={item.criterionId} item={item} showTrend={showTrend} />
          ))}
        </div>
      )}
    </div>
  );
}
