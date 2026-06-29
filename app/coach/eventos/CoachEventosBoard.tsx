"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EventCalendar, eventTouchesDay, type EventCalendarRow } from "@/components/events/EventCalendar";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import type { CoachEventRow } from "@/lib/coach-upcoming-events";

const TYPE_LABELS: Record<string, { pt: string; en: string }> = {
  CAMP: { pt: "Camp", en: "Camp" },
  WORKSHOP: { pt: "Workshop", en: "Workshop" },
  OTHER: { pt: "Outro", en: "Other" },
};

function formatEventDate(dateStr: string, locale: Locale): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatEventDateRange(e: CoachEventRow, locale: Locale): string {
  const start = (e.start_date ?? e.event_date).slice(0, 10);
  const end = (e.end_date ?? e.event_date).slice(0, 10);
  if (start === end) return formatEventDate(start, locale);
  return `${formatEventDate(start, locale)} → ${formatEventDate(end, locale)}`;
}

function formatTimeRange(st: string | null, et: string | null): string | null {
  if (!st?.trim() || !et?.trim()) return null;
  return `${st.trim().slice(0, 5)} – ${et.trim().slice(0, 5)}`;
}

type Props = {
  events: CoachEventRow[];
  locale: Locale;
  schoolCheckInEventIds?: string[];
};

export function CoachEventosBoard({ events, locale, schoolCheckInEventIds = [] }: Props) {
  const t = getTranslations(locale);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const checkInSet = useMemo(() => new Set(schoolCheckInEventIds), [schoolCheckInEventIds]);

  const calendarRows: EventCalendarRow[] = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        name: e.name,
        event_date: e.event_date,
        start_date: e.start_date,
        end_date: e.end_date,
        type: e.type,
      })),
    [events]
  );

  const list = useMemo(() => {
    if (!selectedIso) return events;
    return events.filter((e) => eventTouchesDay(selectedIso, e));
  }, [events, selectedIso]);

  const labels = useMemo(
    () => ({
      title: t("eventsCalendarTitle"),
      hint: t("eventsCalendarHint"),
      prev: t("eventsCalendarPrev"),
      next: t("eventsCalendarNext"),
      filterAll: t("eventsCalendarShowAll"),
    }),
    [t]
  );

  const calLocale = locale === "en" ? "en" : "pt";
  const countLabel = selectedIso
    ? t("eventsListCountFiltered").replace("{n}", String(list.length))
    : t("coachEventsListCountAll").replace("{n}", String(events.length));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
      <details
        style={{
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            padding: "clamp(12px, 3vw, 14px) clamp(14px, 3.5vw, 16px)",
            fontWeight: 600,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-primary)",
            listStyle: "none",
          }}
        >
          {t("eventsCalendarSummary")}
        </summary>
        <div style={{ padding: "0 clamp(14px, 3.5vw, 16px) clamp(14px, 3.5vw, 16px)" }}>
          <EventCalendar
            events={calendarRows}
            locale={calLocale}
            labels={labels}
            selectedIso={selectedIso}
            onSelectIso={setSelectedIso}
          />
        </div>
      </details>

      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>{countLabel}</p>

      {list.length === 0 ? (
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          {events.length === 0 ? t("coachEventsEmpty") : t("eventsEmptyDay")}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((e) => {
            const typeLabel = TYPE_LABELS[e.type]?.[locale] ?? e.type;
            const timeLabel = formatTimeRange(e.start_time, e.end_time);
            const canCheckIn = checkInSet.has(e.id);
            return (
              <li key={e.id}>
                <div
                  className="card"
                  style={{
                    padding: "clamp(14px, 3.5vw, 18px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                      {e.name}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "2px 8px",
                        background: "var(--surface)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {typeLabel}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--primary)" }}>
                      €{e.price.toFixed(0)}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
                    {formatEventDateRange(e, locale)}
                    {timeLabel ? ` · ${timeLabel}` : ""}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                  {e.description ? (
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
                      {e.description.slice(0, 140)}
                      {e.description.length > 140 ? "…" : ""}
                    </p>
                  ) : null}
                  {canCheckIn ? (
                    <Link
                      href={`/coach/eventos/${e.id}/validar`}
                      className="btn btn-primary"
                      style={{ textDecoration: "none", alignSelf: "flex-start", fontSize: 14 }}
                    >
                      {t("coachEventsCheckInCta")}
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
