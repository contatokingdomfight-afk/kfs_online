"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LessonPromoBlock, type OpenLessonRow } from "./LessonPromoBlock";

type Props = {
  rows: OpenLessonRow[];
  studentSchoolId: string | null;
  locationById: Map<string, string>;
  attendanceByLesson: Record<string, { status: string; checkedInAt: string | null }>;
  locale: "pt" | "en";
  todayStr: string;
  isFreeTier: boolean;
  t: (key: string) => string;
  statusLabels: Record<string, string>;
  sectionTitle: string;
  swipeHint: string;
};

const CARD_WIDTH = "min(88vw, 380px)";

export function OpenClassesThisWeekCarousel({
  rows,
  studentSchoolId,
  locationById,
  attendanceByLesson,
  locale,
  todayStr,
  isFreeTier,
  t,
  statusLabels,
  sectionTitle,
  swipeHint,
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
  }, [rows.length, updateArrows]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth * 0.85;
    el.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  if (rows.length === 0) return null;

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
        {rows.length > 1 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              aria-label={t("dashboardCarouselPrev")}
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
              aria-label={t("dashboardCarouselNext")}
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
          {rows.map((row) => (
            <div
              key={row.lesson.id}
              style={{
                flex: `0 0 ${CARD_WIDTH}`,
                maxWidth: CARD_WIDTH,
                scrollSnapAlign: "start",
                minHeight: 1,
              }}
            >
              <LessonPromoBlock
                lesson={row.lesson}
                studentSchoolId={studentSchoolId}
                checkInWindowOpen={row.checkInWindowOpen}
                checkInStartTimeLabel={row.checkInStartTimeLabel}
                locationById={locationById}
                attendanceByLesson={attendanceByLesson}
                locale={locale}
                todayStr={todayStr}
                isFreeTier={isFreeTier}
                t={t}
                statusLabels={statusLabels}
              />
            </div>
          ))}
        </div>
        {rows.length > 1 && (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            {swipeHint}
          </p>
        )}
      </div>
    </section>
  );
}
