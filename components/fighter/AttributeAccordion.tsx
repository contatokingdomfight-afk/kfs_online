"use client";

import { useState } from "react";
import type { DetailGroup, DetailItem, DimensionDetail } from "@/lib/performance-detail-structure";

type Props = {
  detailOrder: string[];
  detailSource: Record<string, DimensionDetail>;
  scores: Record<string, number>;
  maxScore?: number;
  /** Modalidade principal do aluno (ex.: "Muay Thai"). Se definida, só mostra critérios desta modalidade. */
  primaryModalityLabel?: string | null;
};

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  const v = Math.min(max, Math.max(0, Math.round(value)));
  return (
    <div className="flex gap-0.5" aria-label={`${v} de ${max} estrelas`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          style={{ color: i < v ? "var(--warning)" : "var(--border)" }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function AccordionSection({
  dimId,
  detail,
  score,
  maxScore,
  defaultOpen,
  primaryModalityLabel,
}: {
  dimId: string;
  detail: DimensionDetail;
  score: number | undefined;
  maxScore: number;
  defaultOpen?: boolean;
  primaryModalityLabel?: string | null;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const scoreVal = score ?? 0;
  const starValue = maxScore > 0 ? (scoreVal / maxScore) * 5 : 0;

  return (
    <div className="rounded-xl bg-bg-secondary border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-white/5 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-sm font-bold"
            aria-hidden
          >
            {score != null ? score.toFixed(1) : "–"}
          </span>
          <h3 className="font-semibold text-text-primary truncate">
            {detail.title} — {score != null ? `${score.toFixed(1)}/${maxScore}` : "–"}
          </h3>
        </div>
        <span
          className="flex-shrink-0 text-text-secondary transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="border-t border-border p-4 pt-3 space-y-5">
          {detail.groups
            .filter((group) => {
              if (!primaryModalityLabel || primaryModalityLabel === "Todas as modalidades") return true;
              const suffix = ` (${primaryModalityLabel})`;
              return group.title.endsWith(suffix) || !group.title.includes(" (");
            })
            .flatMap((group, gi) => {
              const subGroups = group.subGroups ?? (group.items?.length ? [{ title: group.title, items: group.items, note: group.note }] : []);
              return subGroups.map((sg, sgi) => ({ ...sg, key: `${gi}-${sgi}` }));
            })
            .map((group) => (
            <div key={group.key} className="space-y-2">
              <p className="text-sm font-semibold text-text-primary">{group.title}</p>
              {group.note && (
                <p className="text-xs text-text-secondary italic">{group.note}</p>
              )}
              <ul className="space-y-3 list-none pl-0">
                {(group.items ?? []).map((item, i) => {
                  const label = typeof item === "string" ? item : (item as DetailItem).label;
                  const note = typeof item === "string" ? undefined : (item as DetailItem).note;
                  return (
                    <li
                      key={i}
                      className="rounded-lg bg-bg border border-border/50 p-3 space-y-2"
                    >
                      <p className="text-sm font-medium text-text-primary">{label}</p>
                      {note && (
                        <p className="text-xs text-text-secondary">{note}</p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        <StarRating value={starValue} />
                        <div
                          className="w-20 h-1 rounded-full bg-border overflow-hidden flex-shrink-0"
                          aria-hidden
                        >
                          <div
                            className="h-full rounded-full bg-primary/80 transition-all"
                            style={{
                              width: `${maxScore > 0 ? (scoreVal / maxScore) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AttributeAccordion({
  detailOrder,
  detailSource,
  scores,
  maxScore = 10,
  primaryModalityLabel = null,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {detailOrder.map((dimId) => {
        const detail = detailSource[dimId];
        if (!detail) return null;
        const score = scores[dimId];
        return (
          <AccordionSection
            key={dimId}
            dimId={dimId}
            detail={detail}
            score={score}
            maxScore={maxScore}
            defaultOpen={dimId === detailOrder[0]}
            primaryModalityLabel={primaryModalityLabel}
          />
        );
      })}
    </div>
  );
}
