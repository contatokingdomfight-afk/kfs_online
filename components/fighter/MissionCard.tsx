"use client";

import { useEffect, useState } from "react";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/theme-locale";

export type Mission = {
  id: string;
  target: string;
  xpReward: number;
  progress: number; // 0–100
};

const INITIAL_VISIBLE = 3;
const PAGE_SIZE = 3;

type Props = {
  missions: Mission[];
  locale?: Locale;
};

export function MissionCard({ missions, locale = "pt" }: Props) {
  const t = getTranslations(locale);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [missions]);

  if (missions.length === 0) return null;

  const shown = missions.slice(0, visibleCount);
  const hasMore = visibleCount < missions.length;
  const allVisible = visibleCount >= missions.length;
  const canCollapse = missions.length > INITIAL_VISIBLE && allVisible;

  return (
    <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
      <h2 className="text-base font-bold text-text-primary uppercase tracking-wider mb-1 flex items-center gap-2">
        <span aria-hidden>🎯</span>
        {t("missionsObjectivesTitle")}
      </h2>
      <p className="text-sm text-text-secondary mb-4">{t("missionsObjectivesSubtitle")}</p>
      <ul className="space-y-3">
        {shown.map((m) => (
          <li
            key={m.id}
            className="flex flex-col gap-2 p-3 rounded-xl bg-bg border border-border hover:border-primary/30 transition-colors"
          >
            <p className="text-sm font-medium text-text-primary">{m.target}</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-primary font-semibold">+{m.xpReward} XP</span>
              <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, m.progress)}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      {(hasMore || canCollapse) && (
        <div className="mt-4 flex flex-col gap-2">
          {hasMore && (
            <button
              type="button"
              className="btn btn-secondary w-full min-h-11"
              onClick={() => setVisibleCount((n) => Math.min(missions.length, n + PAGE_SIZE))}
            >
              {t("missionsShowMore")}
            </button>
          )}
          {canCollapse && (
            <button
              type="button"
              className="btn btn-secondary w-full min-h-11"
              onClick={() => setVisibleCount(INITIAL_VISIBLE)}
            >
              {t("missionsShowLess")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
