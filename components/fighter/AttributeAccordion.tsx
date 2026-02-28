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
              if (!primaryModalityLabel) return true;
              const suffix = ` (${primaryModalityLabel})`;
              return group.title.endsWith(suffix) || !group.title.includes(" (");
            })
            .map((group, gi) => (
            <div key={gi} className="space-y-2">
              <p className="text-sm font-semibold text-text-primary">{group.title}</p>
              {group.note && (
                <p className="text-xs text-text-secondary italic">{group.note}</p>
              )}
              <ul className="space-y-2 list-none pl-0">
                {group.items.map((item, i) => {
                  const label = typeof item === "string" ? item : (item as DetailItem).label;
                  const note = typeof item === "string" ? undefined : (item as DetailItem).note;
                  return (
                    <li
                      key={i}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg bg-bg border border-border/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary">{label}</p>
                        {note && (
                          <p className="text-xs text-text-secondary mt-0.5">{note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StarRating value={starValue} />
                        <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
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
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-text-primary">Detalhe por componente</h2>
      <p className="text-sm text-text-secondary mb-4">
        {primaryModalityLabel
          ? `Critérios da tua modalidade (${primaryModalityLabel}) e a tua evolução.`
          : "Expande cada dimensão para ver critérios por modalidade e a tua evolução."}
      </p>
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
    </section>
  );
}
