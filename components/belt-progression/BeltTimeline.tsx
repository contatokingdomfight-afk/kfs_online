"use client";

import { useState } from "react";
import { BELT_ORDER, BELT_DISPLAY, BELT_XP, formatXP } from "./belt-progression-data";
import type { BeltId } from "./belt-progression-data";

/** Esconde scrollbar mas mantém scroll por toque (mobile). */
const scrollHide =
  "overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

type Props = {
  currentBelt: BeltId;
  className?: string;
};

export function BeltTimeline({ currentBelt, className = "" }: Props) {
  const currentIndex = BELT_ORDER.indexOf(currentBelt);

  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-2.5">
        Visão geral das faixas
      </p>
      <div
        className={`rounded-2xl bg-[var(--bg)]/60 px-2 py-3 sm:px-3 ring-1 ring-[var(--border)]/50 ${scrollHide} snap-x snap-mandatory`}
      >
        <div className="flex min-w-0 items-center justify-between gap-0.5 sm:gap-1 pr-1">
          {BELT_ORDER.map((beltId, i) => {
            const isCurrent = beltId === currentBelt;
            const isPast = i < currentIndex;
            const display = BELT_DISPLAY[beltId];
            const xpRequired = BELT_XP[beltId];

            return (
              <BeltNode
                key={beltId}
                beltId={beltId}
                emoji={display.emoji}
                bgClass={display.bgClass}
                ringClass={display.ringClass}
                xpRequired={xpRequired}
                isCurrent={isCurrent}
                isPast={isPast}
                showConnector={i < BELT_ORDER.length - 1}
              />
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-[var(--text-secondary)]/80 sm:hidden">
        Desliza para ver todas as faixas
      </p>
    </div>
  );
}

function BeltNode({
  beltId,
  emoji,
  bgClass,
  ringClass,
  xpRequired,
  isCurrent,
  isPast,
  showConnector,
}: {
  beltId: BeltId;
  emoji: string;
  bgClass: string;
  ringClass: string;
  xpRequired: number;
  isCurrent: boolean;
  isPast: boolean;
  showConnector: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const label = BELT_DISPLAY[beltId].label;

  return (
    <div className="flex flex-shrink-0 snap-center items-center">
      <div className="relative flex flex-col items-center">
        <button
          type="button"
          className={`
            flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full text-base sm:text-lg
            transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)] focus-visible:ring-[var(--primary)]/70
            ${bgClass}
            ${
              isCurrent
                ? `ring-2 ring-offset-2 ring-offset-[var(--bg)] ${ringClass} shadow-lg`
                : "ring-2 ring-[var(--border)]/60"
            }
            ${isPast ? "opacity-80 saturate-75" : ""}
            ${!isCurrent && !isPast ? "opacity-95" : ""}
            hover:z-[1] hover:scale-[1.06] hover:shadow-md active:scale-100
          `}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          aria-current={isCurrent ? "step" : undefined}
          aria-label={`Nível ${label}, XP necessário: ${formatXP(xpRequired)}`}
        >
          {emoji}
        </button>
        {showTooltip && (
          <div
            className="absolute z-20 bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm shadow-xl whitespace-nowrap"
            role="tooltip"
          >
            <p className="font-semibold text-[var(--text-primary)]">Nível {label}</p>
            <p className="text-xs text-[var(--text-secondary)]">XP mín.: {formatXP(xpRequired)}</p>
          </div>
        )}
      </div>
      {showConnector && (
        <div
          className={`
            mx-0.5 h-0.5 w-2 shrink-0 rounded-full sm:mx-1 sm:w-6
            ${isPast ? "bg-gradient-to-r from-[var(--primary)]/40 to-[var(--primary)]/70" : "bg-[var(--border)]/70"}
          `}
          aria-hidden
        />
      )}
    </div>
  );
}
