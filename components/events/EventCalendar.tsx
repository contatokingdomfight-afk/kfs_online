"use client";

import { useMemo, useState } from "react";

export type EventCalendarRow = {
  id: string;
  name: string;
  event_date: string;
  start_date?: string | null;
  end_date?: string | null;
  type?: string;
};

export type EventCalendarLabels = {
  title: string;
  hint: string;
  prev: string;
  next: string;
  filterAll: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDay(y: number, m0: number, d: number): string {
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
}

function rangeOf(e: EventCalendarRow): { start: string; end: string } {
  const start = (e.start_date ?? e.event_date).slice(0, 10);
  const end = (e.end_date ?? e.event_date).slice(0, 10);
  return start <= end ? { start, end } : { start: end, end: start };
}

/** Dia civil ISO (AAAA-MM-DD) dentro do intervalo do evento (inclusive). */
export function eventTouchesDay(iso: string, e: EventCalendarRow): boolean {
  const { start, end } = rangeOf(e);
  return iso >= start && iso <= end;
}

export function EventCalendar({
  events,
  locale,
  labels,
  selectedIso,
  onSelectIso,
}: {
  events: EventCalendarRow[];
  locale: "pt" | "en";
  labels: EventCalendarLabels;
  selectedIso: string | null;
  onSelectIso: (iso: string | null) => void;
}) {
  const localeTag = locale === "en" ? "en-GB" : "pt-PT";
  const now = new Date();
  const [cursor, setCursor] = useState(() => ({ y: now.getFullYear(), m: now.getMonth() }));

  const { y, m } = cursor;
  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthTitle = new Date(y, m, 1).toLocaleDateString(localeTag, { month: "long", year: "numeric" });

  const weekdayLabels = useMemo(() => {
    const out: string[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(2023, 0, 1 + d);
      out.push(dt.toLocaleDateString(localeTag, { weekday: "short" }));
    }
    return out;
  }, [localeTag]);

  const cells = useMemo(() => {
    const total = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const rows: { iso: string | null; dayNum: number | null }[] = [];
    for (let i = 0; i < total; i++) {
      const dayNum = i - firstWeekday + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        rows.push({ iso: null, dayNum: null });
      } else {
        rows.push({ iso: isoDay(y, m, dayNum), dayNum });
      }
    }
    return rows;
  }, [y, m, firstWeekday, daysInMonth]);

  const prevMonth = () => {
    setCursor((c) => {
      const nm = c.m - 1;
      if (nm < 0) return { y: c.y - 1, m: 11 };
      return { y: c.y, m: nm };
    });
    onSelectIso(null);
  };

  const nextMonth = () => {
    setCursor((c) => {
      const nm = c.m + 1;
      if (nm > 11) return { y: c.y + 1, m: 0 };
      return { y: c.y, m: nm };
    });
    onSelectIso(null);
  };

  return (
    <div className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {labels.title}
        </h2>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={prevMonth} aria-label={labels.prev} style={{ minWidth: 44 }}>
            ‹
          </button>
          <button type="button" className="btn btn-secondary" onClick={nextMonth} aria-label={labels.next} style={{ minWidth: 44 }}>
            ›
          </button>
        </div>
      </div>
      <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 }}>{labels.hint}</p>
      <p
        style={{
          margin: "0 0 10px 0",
          fontSize: "clamp(15px, 3.8vw, 17px)",
          fontWeight: 600,
          color: "var(--text-primary)",
          textTransform: "capitalize",
        }}
      >
        {monthTitle}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 4,
          fontSize: 11,
          color: "var(--text-secondary)",
          marginBottom: 4,
        }}
      >
        {weekdayLabels.map((w) => (
          <div key={w} style={{ textAlign: "center", fontWeight: 600 }}>
            {w}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
        {cells.map((cell, idx) => {
          if (!cell.iso) {
            return <div key={`e-${idx}`} style={{ minHeight: 40 }} />;
          }
          const hits = events.filter((e) => eventTouchesDay(cell.iso!, e));
          const has = hits.length > 0;
          const selected = selectedIso === cell.iso;
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelectIso(selectedIso === cell.iso ? null : cell.iso)}
              style={{
                minHeight: 44,
                borderRadius: "var(--radius-md)",
                border: selected ? "2px solid var(--primary)" : "1px solid var(--border)",
                background: has ? "color-mix(in srgb, var(--primary) 18%, transparent)" : "var(--surface)",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: has ? 600 : 500,
                padding: 4,
              }}
            >
              {cell.dayNum}
              {has ? <span style={{ display: "block", fontSize: 9, opacity: 0.85 }}>{hits.length}</span> : null}
            </button>
          );
        })}
      </div>
      {selectedIso && (
        <button type="button" className="btn btn-secondary" style={{ marginTop: 12, alignSelf: "flex-start" }} onClick={() => onSelectIso(null)}>
          {labels.filterAll}
        </button>
      )}
    </div>
  );
}
