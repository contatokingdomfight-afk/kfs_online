"use client";

import { AchievementCard } from "@/components/achievements/AchievementCard";
import type { AchievementWithStatus } from "@/lib/achievements";

type Props = {
  achievements: AchievementWithStatus[];
};

export function AchievementsGrid({ achievements }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
      {achievements.map((a) => (
        <AchievementCard key={a.id} achievement={a} />
      ))}
    </div>
  );
}
