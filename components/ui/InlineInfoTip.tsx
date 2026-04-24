"use client";

type Props = {
  /** Texto longo no tooltip (pode incluir várias frases). */
  detail: string;
  ariaLabel: string;
  className?: string;
};

/**
 * Ícone «i» com tooltip em CSS (hover + foco), sem portais — alinhado ao padrão de `ProfileAchievements`.
 */
export function InlineInfoTip({ detail, ariaLabel, className }: Props) {
  return (
    <span className={`relative inline-flex shrink-0 align-middle group ${className ?? ""}`}>
      <button
        type="button"
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-1 text-[10px] font-bold leading-none text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        aria-label={ariaLabel}
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-max max-w-[min(280px,85vw)] -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left text-xs leading-snug text-[var(--text-secondary)] shadow-xl whitespace-normal group-hover:block group-focus-within:block"
      >
        {detail}
      </span>
    </span>
  );
}
