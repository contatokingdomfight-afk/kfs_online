import Link from "next/link";

type Props = { ctaLabel: string };

export function HomeHeader({ ctaLabel }: Props) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg)]/95 px-4 py-3 backdrop-blur-md sm:px-6 sm:pr-[max(72px,env(safe-area-inset-right))]">
      <span className="truncate text-lg font-bold text-[var(--text-primary)]">
        Kingdom Fight School
      </span>
      <Link
        href="/aula-experimental"
        className="btn btn-primary hidden shrink-0 px-4 py-2.5 text-sm font-semibold sm:inline-flex"
      >
        {ctaLabel}
      </Link>
    </header>
  );
}
