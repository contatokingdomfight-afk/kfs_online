"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Texto longo no tooltip (pode incluir várias frases). */
  detail: string;
  ariaLabel: string;
  className?: string;
  /** "hover" (padrão, hover+foco via CSS) ou "click" (abre/fecha ao clicar, fecha com Escape ou clique fora). */
  trigger?: "hover" | "click";
};

/**
 * Ícone «i» com tooltip — por padrão hover/foco em CSS, sem portais (alinhado a `ProfileAchievements`).
 * `trigger="click"` troca para abrir/fechar ao toque, mais previsível em ecrãs táteis.
 */
export function InlineInfoTip({ detail, ariaLabel, className, trigger = "hover" }: Props) {
  if (trigger === "click") {
    return <ClickInfoTip detail={detail} ariaLabel={ariaLabel} className={className} />;
  }

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

function ClickInfoTip({ detail, ariaLabel, className }: Omit<Props, "trigger">) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className={`relative inline-flex shrink-0 align-middle ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-1 text-[10px] font-bold leading-none text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[min(280px,85vw)] -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left text-xs leading-snug text-[var(--text-secondary)] shadow-xl whitespace-normal"
        >
          {detail}
        </span>
      )}
    </span>
  );
}
