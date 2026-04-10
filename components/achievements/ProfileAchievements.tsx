"use client";

import Link from "next/link";
import type { AchievementWithStatus } from "@/lib/achievements";

type Props = {
  achievements: AchievementWithStatus[];
  backHref?: string;
};

export function ProfileAchievements({ achievements, backHref = "/dashboard" }: Props) {
  const unlocked = achievements.filter((a) => a.isUnlocked);
  const total = achievements.length;
  const pct = total > 0 ? Math.round((unlocked.length / total) * 100) : 0;

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
          <div key={a.id} className="relative group">
            <button
              type="button"
              className={`
                w-11 h-11 rounded-full flex items-center justify-center text-xl
                border-2 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]
                ${a.isUnlocked ? "border-[var(--primary)]/40 bg-[var(--bg)] shadow" : "border-[var(--border)] bg-[var(--border)]/30 grayscale opacity-70"}
              `}
              aria-label={a.isUnlocked ? a.name : `${a.name} (bloqueada)`}
            >
              {a.isUnlocked ? a.icon : "🔒"}
            </button>
            {/* Tooltip CSS puro — sem getBoundingClientRect, sem reflow */}
            <div
              role="tooltip"
              className="
                pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                hidden group-hover:block group-focus-within:block
                z-50 w-max max-w-[200px] rounded-lg
                bg-[var(--bg)] border border-[var(--border)] shadow-xl
                px-3 py-2
              "
            >
              <p className="font-semibold text-[var(--text-primary)] text-xs whitespace-normal">{a.name}</p>
              <p className="text-[var(--text-secondary)] mt-0.5 text-xs whitespace-normal">{a.description}</p>
            </div>
          </div>
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
    </section>
  );
}
