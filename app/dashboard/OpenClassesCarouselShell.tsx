"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  sectionTitle: string;
  swipeHint: string;
  ariaLabelPrev: string;
  ariaLabelNext: string;
  /** Número de itens no carrossel (para setas e texto de ajuda) */
  itemCount: number;
};

/**
 * Apenas UI de scroll/setas. Os cartões (`LessonPromoBlock`) são renderizados no Server Component
 * (`page.tsx`) e passados como `children`, para não enviar Map/funções `t` por props ao cliente.
 */
export function OpenClassesCarouselShell({
  children,
  sectionTitle,
  swipeHint,
  ariaLabelPrev,
  ariaLabelNext,
  itemCount,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);
    return () => ro.disconnect();
  }, [itemCount, updateArrows]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth * 0.85;
    el.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  if (itemCount === 0) return null;

  return (
    <section aria-label={sectionTitle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: "clamp(10px, 2.5vw, 14px)",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
          {sectionTitle}
        </h2>
        {itemCount > 1 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              aria-label={ariaLabelPrev}
              disabled={!canPrev}
              onClick={() => scrollByDir(-1)}
              style={{
                minWidth: 44,
                minHeight: 40,
                padding: "0 12px",
                opacity: canPrev ? 1 : 0.45,
                cursor: canPrev ? "pointer" : "not-allowed",
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              aria-label={ariaLabelNext}
              disabled={!canNext}
              onClick={() => scrollByDir(1)}
              style={{
                minWidth: 44,
                minHeight: 40,
                padding: "0 12px",
                opacity: canNext ? 1 : 0.45,
                cursor: canNext ? "pointer" : "not-allowed",
              }}
            >
              ›
            </button>
          </div>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          role="region"
          tabIndex={0}
          style={{
            display: "flex",
            gap: "clamp(12px, 3vw, 16px)",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollPaddingLeft: 2,
            scrollPaddingRight: 2,
            paddingBottom: 6,
            marginInline: -4,
            paddingInline: 4,
            WebkitOverflowScrolling: "touch",
            scrollbarGutter: "stable",
          }}
        >
          {children}
        </div>
        {itemCount > 1 && (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            {swipeHint}
          </p>
        )}
      </div>
    </section>
  );
}
