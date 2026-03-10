"use client";

import { useEffect, useState } from "react";
import { formatXP } from "./belt-progression-data";

type Props = {
  currentXP: number;
  nextBeltXP: number;
  className?: string;
};

export function XPProgressBar({ currentXP, nextBeltXP, className = "" }: Props) {
  const progress = nextBeltXP > 0 ? Math.min(100, (currentXP / nextBeltXP) * 100) : 0;
  const remaining = Math.max(0, nextBeltXP - currentXP);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const isNearComplete = progress >= 90;

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setAnimatedProgress(progress);
    });
    return () => cancelAnimationFrame(id);
  }, [progress]);

  return (
    <div className={className}>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-[var(--text-secondary)]">
          XP atual: <strong className="text-[var(--text-primary)]">{formatXP(currentXP)}</strong>
          {" / "}
          <strong className="text-[var(--text-primary)]">{formatXP(nextBeltXP)}</strong>
        </span>
        <span className="text-[var(--primary)] font-semibold tabular-nums">{animatedProgress.toFixed(0)}%</span>
      </div>
      <div
        className="h-4 rounded-full bg-[var(--border)] overflow-hidden"
        role="progressbar"
        aria-valuenow={currentXP}
        aria-valuemin={0}
        aria-valuemax={nextBeltXP}
        aria-label={`Progresso: ${animatedProgress.toFixed(0)}% para a próxima faixa`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/80 transition-all duration-700 ease-out relative"
          style={{ width: `${animatedProgress}%` }}
        >
          {isNearComplete && (
            <span
              className="absolute inset-0 rounded-full animate-pulse opacity-60"
              style={{
                boxShadow: "0 0 20px 4px var(--primary)",
              }}
            />
          )}
        </div>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mt-2">
        Faltam <strong className="text-[var(--text-primary)]">{formatXP(remaining)}</strong> XP para atingir a próxima faixa.
      </p>
    </div>
  );
}
