import Link from "next/link";

type Props = {
  hubLabel: string;
  breadcrumbLabel?: string;
};

export function ModalidadesHeader({ hubLabel, breadcrumbLabel }: Props) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold text-[var(--primary)] transition-opacity hover:opacity-80">
          ← Kingdom Fight School
        </Link>
        <span className="text-[var(--text-secondary)]" aria-hidden>
          /
        </span>
        <Link
          href="/modalidades"
          className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
        >
          {hubLabel}
        </Link>
        {breadcrumbLabel ? (
          <>
            <span className="text-[var(--text-secondary)]" aria-hidden>
              /
            </span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{breadcrumbLabel}</span>
          </>
        ) : null}
      </div>
    </header>
  );
}
