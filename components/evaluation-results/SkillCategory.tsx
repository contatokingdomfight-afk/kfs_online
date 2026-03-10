"use client";

import { useState } from "react";
import type { CriterionScoreItem } from "@/lib/evaluation-results-data";
import { SkillBar } from "./SkillBar";

type Props = {
  categoryName: string;
  items: CriterionScoreItem[];
  defaultOpen?: boolean;
  showTrend?: boolean;
};

export function SkillCategory({
  categoryName,
  items,
  defaultOpen = false,
  showTrend = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--border)]/30 transition-colors"
        aria-expanded={open}
      >
        <span className="font-semibold text-[var(--text-primary)]">{categoryName}</span>
        <span
          className="text-[var(--text-secondary)] transition-transform duration-200 flex-shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 border-t border-[var(--border)]">
          {items.map((item) => (
            <SkillBar key={item.criterionId} item={item} showTrend={showTrend} />
          ))}
        </div>
      )}
    </div>
  );
}
