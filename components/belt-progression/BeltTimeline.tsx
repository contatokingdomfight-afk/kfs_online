"use client";

import { useState } from "react";
import { BELT_ORDER, BELT_DISPLAY, BELT_XP, formatXP } from "./belt-progression-data";
import type { BeltId } from "./belt-progression-data";

type Props = {
  currentBelt: BeltId;
  className?: string;
};

export function BeltTimeline({ currentBelt, className = "" }: Props) {
  const currentIndex = BELT_ORDER.indexOf(currentBelt);

  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
        Progressão de faixas
      </p>
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
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
    <div className="flex flex-shrink-0 items-center">
      <div className="relative flex flex-col items-center">
        <button
          type="button"
          className={`
            w-12 h-12 rounded-full flex items-center justify-center text-xl
            transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]
            ${bgClass} ${isCurrent ? `ring-4 ${ringClass} scale-110 shadow-lg` : "ring-2 ring-[var(--border)]"}
            ${isPast ? "opacity-70" : ""}
            hover:scale-110 hover:shadow-md
          `}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          aria-label={`Faixa ${label}, XP necessário: ${formatXP(xpRequired)}`}
        >
          {emoji}
        </button>
        {showTooltip && (
          <div
            className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] shadow-xl text-sm whitespace-nowrap"
            role="tooltip"
          >
            <p className="font-semibold text-[var(--text-primary)]">Faixa {label}</p>
            <p className="text-[var(--text-secondary)]">XP necessário: {formatXP(xpRequired)}</p>
          </div>
        )}
      </div>
      {showConnector && (
        <div
          className={`
            w-4 sm:w-8 h-0.5 rounded mx-0.5 flex-shrink-0
            ${isPast ? "bg-[var(--primary)]/50" : "bg-[var(--border)]"}
          `}
          aria-hidden
        />
      )}
    </div>
  );
}
