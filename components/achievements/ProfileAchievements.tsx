"use client";

import { useState } from "react";
import Link from "next/link";
import type { AchievementWithStatus } from "@/lib/achievements";

type Props = {
  achievements: AchievementWithStatus[];
  backHref?: string;
};

export function ProfileAchievements({ achievements, backHref = "/dashboard" }: Props) {
  const [tooltip, setTooltip] = useState<{ name: string; description: string; x: number; y: number } | null>(null);
  const unlocked = achievements.filter((a) => a.isUnlocked);
  const total = achievements.length;
  const pct = total > 0 ? Math.round((unlocked.length / total) * 100) : 0;

  const showTooltip = (a: AchievementWithStatus, e: React.MouseEvent | React.FocusEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      name: a.name,
      description: a.description,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const hideTooltip = () => setTooltip(null);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-base font-bold uppercase tracking-wider text-[var(--text-primary)]">
          Conquistas
        </h2>
        <Link
          href="/dashboard/conquistas"
          className="text-sm font-medium text-[var(--primary)] no-underline hover:underline"
        >
          Ver todas →
        </Link>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-3">
        Conquistas desbloqueadas
      </p>
      <div className="flex flex-wrap gap-2">
        {achievements.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`
              w-11 h-11 rounded-full flex items-center justify-center text-xl
              border-2 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]
              ${a.isUnlocked ? "border-[var(--primary)]/40 bg-[var(--bg)] shadow" : "border-[var(--border)] bg-[var(--border)]/30 grayscale opacity-70"}
            `}
            onMouseEnter={(e) => showTooltip(a, e)}
            onMouseLeave={hideTooltip}
            onFocus={(e) => showTooltip(a, e)}
            onBlur={hideTooltip}
            aria-label={a.isUnlocked ? a.name : `${a.name} (bloqueada)`}
            title={a.description}
          >
            {a.isUnlocked ? a.icon : "🔒"}
          </button>
        ))}
      </div>
      <p className="text-sm text-[var(--text-secondary)] mt-3">
        <span className="font-semibold text-[var(--text-primary)]">{unlocked.length}</span>
        {" / "}
        <span className="font-semibold text-[var(--text-primary)]">{total}</span>
        {" desbloqueadas"}
        {" · "}
        <span className="text-[var(--primary)]">{pct}%</span>
      </p>

      {tooltip && (
        <div
          className="fixed z-[10000] px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] shadow-xl text-sm max-w-[240px] pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%) translateY(-8px)",
          }}
          role="tooltip"
        >
          <p className="font-semibold text-[var(--text-primary)]">{tooltip.name}</p>
          <p className="text-[var(--text-secondary)] mt-0.5 text-xs">{tooltip.description}</p>
        </div>
      )}
    </section>
  );
}
