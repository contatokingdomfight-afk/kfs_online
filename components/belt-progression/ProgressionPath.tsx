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
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">O teu caminho</h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Etapas da tua progressão. A faixa atual está assinalhada.
        </p>
      </div>

      <ol className="flex flex-col">
        {BELT_ORDER.map((beltId, i) => {
          const isCurrent = beltId === currentBelt;
          const isCompleted = i < currentIndex;
          const isFuture = i > currentIndex;
          const display = BELT_DISPLAY[beltId];
          const meaning = BELT_MEANING[beltId];
          const isLast = i === BELT_ORDER.length - 1;

          return (
            <li key={beltId} className="flex gap-3 sm:gap-4">
              {/* Timeline: círculo + segmento vertical */}
              <div className="flex w-11 shrink-0 flex-col items-center sm:w-12" aria-hidden>
                <span
                  className={`
                    flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl shadow-sm ring-2 ring-offset-2 ring-offset-[var(--bg)]
                    ${display.bgClass}
                    ${
                      isCurrent
                        ? `${display.ringClass}`
                        : isCompleted
                          ? "ring-[var(--border)]/55 opacity-90"
                          : "ring-[var(--border)]/40"
                    }
                  `}
                >
                  {display.emoji}
                </span>
                {!isLast ? (
                  <span
                    className={`mt-2 block h-10 w-px sm:h-11 ${
                      isCompleted ? "bg-[var(--primary)]/40" : "bg-[var(--border)]/55"
                    }`}
                  />
                ) : null}
              </div>

              <div
                className={`
                  mb-4 min-w-0 flex-1 rounded-2xl border px-3.5 py-3 sm:mb-5 sm:px-4 sm:py-3.5
                  ${
                    isCurrent
                      ? "border-[var(--primary)]/40 bg-[var(--primary)]/[0.06]"
                      : isCompleted
                        ? "border-[var(--border)]/45 bg-[var(--bg-secondary)]/35"
                        : "border-[var(--border)]/30 bg-[var(--bg)]/25"
                  }
                  ${isFuture ? "opacity-[0.9]" : ""}
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Nível {display.label}</p>
                    <p className="mt-0.5 text-xs leading-snug text-[var(--text-secondary)]">{meaning}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {isCurrent ? (
                      <span className="rounded-full bg-[var(--bg)]/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] ring-1 ring-[var(--border)]/50">
                        Atual
                      </span>
                    ) : null}
                    {isCompleted ? (
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/25"
                        aria-label="Concluída"
                        title="Concluída"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    ) : null}
                    {isFuture ? (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]/65">
                        Por vir
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
