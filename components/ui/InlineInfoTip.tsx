"use client";

import { useId } from "react";
import { FloatingTooltip, useTooltipTrigger } from "@/components/ui/FloatingTooltip";

type Props = {
  /** Texto longo no tooltip (pode incluir várias frases). */
  detail: string;
  ariaLabel: string;
  className?: string;
  /** "hover" (padrão, rato abre em hover) ou "click" (só abre ao clicar/tocar). */
  trigger?: "hover" | "click";
};

/**
 * Ícone «i» com tooltip ancorado em portal: hover no rato, toque em ecrãs táteis,
 * teclado via `:focus-visible`. Fecha com Escape ou clique fora.
 */
export function InlineInfoTip({ detail, ariaLabel, className, trigger = "hover" }: Props) {
  const tooltipId = useId();
  const { open, anchorRef, triggerProps } = useTooltipTrigger<HTMLButtonElement>({
    hover: trigger === "hover",
  });

  return (
    <span className={`inline-flex shrink-0 align-middle ${className ?? ""}`}>
      <button
        ref={anchorRef}
        type="button"
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-1 text-[10px] font-bold leading-none text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        {...triggerProps}
      >
        i
      </button>
      <FloatingTooltip anchorRef={anchorRef} open={open} id={tooltipId}>
        {detail}
      </FloatingTooltip>
    </span>
  );
}
