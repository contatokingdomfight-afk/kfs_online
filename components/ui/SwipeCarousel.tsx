"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type SwipeCarouselPanel = {
  id: string;
  /** Texto do separador. */
  label: string;
  /** Título dentro do painel (por omissão, o mesmo do separador). */
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  content: ReactNode;
};

/**
 * Carrossel com scroll lateral (snap) para agrupar secções longas: separadores por cima,
 * setas, pontos por baixo e sem barra de rolagem. Deslizar actualiza o separador activo.
 */
export function SwipeCarousel({
  title,
  panels,
  ariaLabel,
  prevLabel = "Painel anterior",
  nextLabel = "Painel seguinte",
}: {
  title?: string;
  panels: SwipeCarouselPanel[];
  ariaLabel: string;
  prevLabel?: string;
  nextLabel?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = panels.length;

  const goTo = useCallback(
    (index: number) => {
      const el = scrollerRef.current;
      const n = Math.max(0, Math.min(count - 1, index));
      setActive(n);
      const target = el?.children[n] as HTMLElement | undefined;
      const first = el?.children[0] as HTMLElement | undefined;
      if (el && target && first) {
        el.scrollTo({ left: target.offsetLeft - first.offsetLeft, behavior: "smooth" });
      }
    },
    [count]
  );

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.children.length === 0) return;
    const base = (el.children[0] as HTMLElement).offsetLeft;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < el.children.length; i++) {
      const dist = Math.abs((el.children[i] as HTMLElement).offsetLeft - base - el.scrollLeft);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setActive((prev) => (prev === best ? prev : best));
  }, []);

  useEffect(() => {
    if (active > count - 1) setActive(Math.max(0, count - 1));
  }, [active, count]);

  if (count === 0) return null;

  return (
    <section aria-label={ariaLabel} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {title ? <h2 className="m-0 text-lg font-extrabold text-[var(--text-primary)]">{title}</h2> : <span />}
        {count > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              aria-label={prevLabel}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-40"
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active === count - 1}
              aria-label={nextLabel}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-40"
            >
              <ChevronRight size={18} aria-hidden />
            </button>
          </div>
        )}
      </div>

      {count > 1 && (
        <div className="swipe-carousel-scroll -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label={ariaLabel}>
          {panels.map((p, i) => {
            const on = i === active;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => goTo(i)}
                className={`h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-bold transition-colors ${
                  on
                    ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="swipe-carousel-scroll -mx-4 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto scroll-smooth px-4 pb-1.5 [scroll-padding-inline:1rem]"
      >
        {panels.map((p, i) => (
          <div
            key={p.id}
            role="group"
            aria-roledescription="painel"
            aria-label={`${i + 1} / ${count}: ${p.title ?? p.label}`}
            className="flex min-w-0 shrink-0 grow-0 basis-[min(100%,560px)] snap-start flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 shadow-md"
          >
            <div className="flex items-center gap-3">
              {p.icon ? (
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg)] text-[var(--primary)]">
                  {p.icon}
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                <h3 className="m-0 text-base font-extrabold text-[var(--text-primary)]">{p.title ?? p.label}</h3>
                {p.subtitle ? <p className="m-0 mt-0.5 text-xs text-[var(--text-secondary)]">{p.subtitle}</p> : null}
              </div>
              {count > 1 && <span className="whitespace-nowrap text-xs text-[var(--text-secondary)]">{i + 1}/{count}</span>}
            </div>
            <div className="min-w-0">{p.content}</div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-1.5" aria-hidden>
          {panels.map((p, i) => (
            <span
              key={p.id}
              className="h-2 rounded-full transition-all"
              style={{ width: i === active ? 22 : 8, backgroundColor: i === active ? "var(--primary)" : "var(--border)" }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
