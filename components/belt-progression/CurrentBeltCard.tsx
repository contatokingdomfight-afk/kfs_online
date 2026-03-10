"use client";

import { BELT_DISPLAY } from "./belt-progression-data";
import type { BeltId } from "./belt-progression-data";
import { XPProgressBar } from "./XPProgressBar";

type Props = {
  currentBelt: BeltId;
  currentXP: number;
  nextBeltXP: number;
  className?: string;
};

const MOTIVATIONAL_MESSAGES: Record<string, string> = {
  default: "Continua a treinar para subires de faixa.",
  near: "Estás a aproximar-te da próxima faixa.",
  close: "Quase lá! Mais um esforço e atinges a próxima faixa.",
};

export function CurrentBeltCard({ currentBelt, currentXP, nextBeltXP, className = "" }: Props) {
  const display = BELT_DISPLAY[currentBelt];
  const progress = nextBeltXP > 0 ? (currentXP / nextBeltXP) * 100 : 0;
  const message =
    progress >= 85 ? MOTIVATIONAL_MESSAGES.close : progress >= 50 ? MOTIVATIONAL_MESSAGES.near : MOTIVATIONAL_MESSAGES.default;

  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 shadow-lg ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
        Faixa atual
      </p>
      <div className="flex items-center gap-4 mb-4">
        <div
          className={`w-14 h-14 rounded-full ${display.bgClass} ring-4 ${display.ringClass} flex items-center justify-center text-2xl shadow-md transition-transform hover:scale-105`}
          title={display.label}
        >
          {display.emoji}
        </div>
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">{display.label}</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{message}</p>
        </div>
      </div>
      <XPProgressBar currentXP={currentXP} nextBeltXP={nextBeltXP} />
    </div>
  );
}
