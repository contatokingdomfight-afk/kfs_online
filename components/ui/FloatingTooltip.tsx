"use client";

import type { FocusEvent as ReactFocusEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Tooltip ancorado, renderizado em portal com `position: fixed`.
 * Invariantes: nunca é cortado por `overflow: hidden` de ancestrais e fica
 * sempre dentro do viewport (reenquadra na horizontal, inverte acima/abaixo).
 */

const VIEWPORT_PADDING = 8;
const ANCHOR_GAP = 8;
/** Acima dos modais do projeto (máx. 30000). */
const TOOLTIP_Z = 40000;

type Position = { top: number; left: number };

export function FloatingTooltip({
  anchorRef,
  open,
  id,
  maxWidth = 280,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  id?: string;
  maxWidth?: number;
  children: ReactNode;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => setMounted(true), []);

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;

    const rect = anchor.getBoundingClientRect();
    const { innerWidth: vw, innerHeight: vh } = window;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;

    const fitsAbove = height + ANCHOR_GAP + VIEWPORT_PADDING <= rect.top;
    const above = fitsAbove || rect.top > vh - rect.bottom;
    const rawTop = above ? rect.top - ANCHOR_GAP - height : rect.bottom + ANCHOR_GAP;
    const rawLeft = rect.left + rect.width / 2 - width / 2;

    setPosition({
      top: clamp(rawTop, VIEWPORT_PADDING, vh - VIEWPORT_PADDING - height),
      left: clamp(rawLeft, VIEWPORT_PADDING, vw - VIEWPORT_PADDING - width),
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const handle = () => reposition();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [open, reposition]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      id={id}
      role="tooltip"
      style={{
        position: "fixed",
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        maxWidth: `min(${maxWidth}px, calc(100vw - ${VIEWPORT_PADDING * 2}px))`,
        zIndex: TOOLTIP_Z,
        visibility: position ? "visible" : "hidden",
      }}
      className="pointer-events-none w-max rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left text-xs leading-snug text-[var(--text-secondary)] shadow-xl whitespace-normal"
    >
      {children}
    </div>,
    document.body
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Estado e handlers do gatilho: rato abre em hover, toque/clique alterna,
 * teclado abre só em `:focus-visible` (evita abrir ao clicar com o rato).
 */
export function useTooltipTrigger<T extends HTMLElement>(options?: { hover?: boolean }) {
  const hover = options?.hover ?? true;
  const anchorRef = useRef<T>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: Event) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const triggerProps = {
    onPointerEnter: (e: ReactPointerEvent<T>) => {
      if (hover && e.pointerType === "mouse") setOpen(true);
    },
    onPointerLeave: (e: ReactPointerEvent<T>) => {
      if (hover && e.pointerType === "mouse") setOpen(false);
    },
    onClick: () => setOpen((v) => !v),
    /** `target` (não `currentTarget`) para funcionar quando o foco vem de um filho. */
    onFocus: (e: ReactFocusEvent<T>) => {
      if (e.target instanceof HTMLElement && e.target.matches(":focus-visible")) setOpen(true);
    },
    onBlur: () => setOpen(false),
  };

  return { open, setOpen, anchorRef, triggerProps };
}

/**
 * Envolve um gatilho arbitrário (ícone, botão, chip) e mostra `content` ancorado a ele.
 */
export function Tooltipped({
  content,
  className,
  maxWidth,
  children,
}: {
  content: ReactNode;
  className?: string;
  maxWidth?: number;
  children: ReactNode;
}) {
  const tooltipId = useId();
  const { open, anchorRef, triggerProps } = useTooltipTrigger<HTMLSpanElement>();

  return (
    <span
      ref={anchorRef}
      className={`inline-flex ${className ?? ""}`}
      aria-describedby={open ? tooltipId : undefined}
      {...triggerProps}
    >
      {children}
      <FloatingTooltip anchorRef={anchorRef} open={open} id={tooltipId} maxWidth={maxWidth}>
        {content}
      </FloatingTooltip>
    </span>
  );
}
