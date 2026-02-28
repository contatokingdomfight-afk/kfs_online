"use client";

import { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  label: string;
  score: number;
  maxScore?: number;
};

function getScoreBarStyle(score: number, max: number): React.CSSProperties {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct <= 30) return { backgroundColor: "var(--danger)" };
  if (pct <= 60) return { backgroundColor: "var(--warning)", color: "#0b0b0b" };
  return { backgroundColor: "var(--success)" };
}

export function StatCard({ icon, label, score, maxScore = 10 }: Props) {
  const value = Math.min(maxScore, Math.max(0, score));
  const percent = maxScore > 0 ? (value / maxScore) * 100 : 0;
  const barStyle = getScoreBarStyle(value, maxScore);

  return (
    <div className="rounded-xl bg-bg-secondary border border-border p-4 shadow-sm hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-lg">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-secondary truncate">{label}</p>
          <p className="text-lg font-bold text-text-primary tabular-nums">
            {value.toFixed(1)}
            <span className="text-sm font-normal text-text-secondary">/{maxScore}</span>
          </p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%`, ...barStyle }}
        />
      </div>
    </div>
  );
}
