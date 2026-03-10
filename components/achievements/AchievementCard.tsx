"use client";

import type { AchievementWithStatus } from "@/lib/achievements";

type Props = {
  achievement: AchievementWithStatus;
  className?: string;
};

export function AchievementCard({ achievement, className = "" }: Props) {
  const { name, description, icon, xpReward, isUnlocked } = achievement;

  return (
    <div
      className={`
        rounded-2xl border p-4 sm:p-5 transition-all duration-200
        ${isUnlocked ? "border-[var(--primary)]/40 bg-[var(--bg-secondary)] shadow-md" : "border-[var(--border)] bg-[var(--bg-secondary)] opacity-75"}
        ${className}
      `}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`
            w-16 h-16 rounded-full flex items-center justify-center text-3xl
            ring-4 transition-transform duration-200 hover:scale-105
            ${isUnlocked ? "ring-[var(--primary)]/30 shadow-lg bg-gradient-to-br from-[var(--bg)] to-[var(--border)]" : "ring-[var(--border)] grayscale opacity-80"}
          `}
        >
          {isUnlocked ? icon : "🔒"}
        </div>
        <h3 className="mt-3 font-bold text-[var(--text-primary)] text-sm sm:text-base truncate w-full">
          {name}
        </h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2 min-h-[2.5rem]">
          {description}
        </p>
        {xpReward > 0 && (
          <p className="mt-2 text-xs font-medium text-[var(--primary)]">
            +{xpReward} XP
          </p>
        )}
        {!isUnlocked && (
          <span className="mt-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
            Bloqueada
          </span>
        )}
      </div>
    </div>
  );
}
