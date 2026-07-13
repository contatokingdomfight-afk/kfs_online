import Link from "next/link";

type Props = { ctaLabel: string; timerLabel: string; judgingLabel: string };

export function HomeHeader({ ctaLabel, timerLabel, judgingLabel }: Props) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg)]/95 px-4 py-3 backdrop-blur-md sm:px-6 sm:pr-[max(72px,env(safe-area-inset-right))]">
      <span className="truncate text-lg font-bold text-[var(--text-primary)]">
        Kingdom Fight School
      </span>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          href="/timer"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
        >
          <span aria-hidden>⏱️</span>
          <span>{timerLabel}</span>
        </Link>
        <Link
          href="/julgamento"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
        >
          <span aria-hidden>🥊</span>
          <span>{judgingLabel}</span>
        </Link>
        <Link
          href="/aula-experimental"
          className="btn btn-primary hidden px-4 py-2.5 text-sm font-semibold sm:inline-flex"
        >
          {ctaLabel}
        </Link>
      </div>
    </header>
  );
}
