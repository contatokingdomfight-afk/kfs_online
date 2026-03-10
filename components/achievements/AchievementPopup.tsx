"use client";

import { useEffect, useState } from "react";

type Props = {
  achievementName: string;
  achievementIcon: string;
  visible: boolean;
  onDismiss?: () => void;
  durationMs?: number;
};

export function AchievementPopup({
  achievementName,
  achievementIcon,
  visible,
  onDismiss,
  durationMs = 4000,
}: Props) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }
    setShow(true);
    const t = setTimeout(() => {
      setShow(false);
      onDismiss?.();
    }, durationMs);
    return () => clearTimeout(t);
  }, [visible, durationMs, onDismiss]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[10001]"
      style={{ animation: "achievementPopupFade 0.3s ease-out forwards" }}
    >
      <div className="rounded-2xl border border-[var(--primary)]/50 bg-[var(--bg)] shadow-xl p-4 flex items-center gap-4 min-w-[280px] max-w-[90vw]">
        <div className="w-12 h-12 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-2xl flex-shrink-0">
          {achievementIcon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
            Nova conquista desbloqueada!
          </p>
          <p className="font-bold text-[var(--text-primary)] truncate mt-0.5">
            {achievementName}
          </p>
        </div>
      </div>
    </div>
  );
}
