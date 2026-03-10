"use client";

import { BELT_ORDER, BELT_DISPLAY, BELT_MEANING } from "./belt-progression-data";
import type { BeltId } from "./belt-progression-data";

type Props = {
  currentBelt: BeltId;
  className?: string;
};

export function ProgressionPath({ currentBelt, className = "" }: Props) {
  const currentIndex = BELT_ORDER.indexOf(currentBelt);

  return (
    <div className={className}>
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">O teu caminho</h3>
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-2">
        {BELT_ORDER.map((beltId, i) => {
          const isCurrent = beltId === currentBelt;
          const isCompleted = i < currentIndex;
          const display = BELT_DISPLAY[beltId];
          const meaning = BELT_MEANING[beltId];

          return (
            <div key={beltId} className="flex items-center gap-2 sm:gap-1">
              <div
                className={`
                  flex items-center gap-2 rounded-xl border px-3 py-2 min-w-0 transition-all duration-200
                  ${isCurrent ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-md scale-[1.02]" : "border-[var(--border)] bg-[var(--bg-secondary)]"}
                  ${isCompleted ? "opacity-75" : ""}
                  hover:border-[var(--primary)]/50
                `}
              >
                <span className="text-xl flex-shrink-0" aria-hidden>
                  {display.emoji}
                </span>
                <div className="min-w-0">
                  <p className={`font-semibold text-sm truncate ${isCurrent ? "text-[var(--primary)]" : "text-[var(--text-primary)]"}`}>
                    Faixa {display.label}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{meaning}</p>
                </div>
                {isCompleted && (
                  <span className="ml-1 text-[var(--success)] text-sm flex-shrink-0" aria-label="Concluída">
                    ✓
                  </span>
                )}
              </div>
              {i < BELT_ORDER.length - 1 && (
                <span
                  className="hidden sm:inline text-[var(--text-secondary)] flex-shrink-0"
                  aria-hidden
                >
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
