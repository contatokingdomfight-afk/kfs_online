"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EventCalendar, eventTouchesDay, type EventCalendarRow } from "@/components/events/EventCalendar";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export type AdminEventListRow = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  event_date: string;
  start_date: string | null;
  end_date: string | null;
  price: number;
  is_active: boolean | null;
};

const TYPE_LABELS: Record<string, string> = {
  CAMP: "Camp",
  WORKSHOP: "Workshop",
};

function formatEventDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-PT", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatEventDateRange(e: AdminEventListRow): string {
  const start = (e.start_date ?? e.event_date).slice(0, 10);
  const end = (e.end_date ?? e.event_date).slice(0, 10);
  if (start === end) return formatEventDate(start);
  return `${formatEventDate(start)} a ${formatEventDate(end)}`;
}

export function AdminEventosBoard({ events, locale }: { events: AdminEventListRow[]; locale: Locale }) {
  const t = getTranslations(locale);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

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
    return events.filter((e) =>
      eventTouchesDay(selectedIso, {
        id: e.id,
        name: e.name,
        event_date: e.event_date,
        start_date: e.start_date,
        end_date: e.end_date,
        type: e.type,
      })
    );
  }, [events, selectedIso]);

  const labels = useMemo(() => {
    const tr = getTranslations(locale);
    return {
      title: tr("eventsCalendarTitle"),
      hint: tr("adminEventsCalendarHint"),
      prev: tr("eventsCalendarPrev"),
      next: tr("eventsCalendarNext"),
      filterAll: tr("eventsCalendarShowAll"),
    };
  }, [locale]);

  const countLabel = selectedIso
    ? t("eventsListCountFiltered").replace("{n}", String(list.length))
    : t("adminEventsListCountAll").replace("{n}", String(events.length));

  const calLocale = locale === "en" ? "en" : "pt";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
      <EventCalendar
        events={calendarRows}
        locale={calLocale}
        labels={labels}
        selectedIso={selectedIso}
        onSelectIso={setSelectedIso}
      />
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>{countLabel}</p>

      {list.length === 0 ? (
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          {events.length === 0 ? t("adminEventsEmpty") : t("eventsEmptyDay")}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {list.map((e) => (
            <li key={e.id}>
              <Link
                href={`/admin/eventos/${e.id}`}
                className="card"
                style={{
                  display: "block",
                  padding: "clamp(14px, 3.5vw, 18px)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>{e.name}</span>
                  {!e.is_active && (
                    <span
                      style={{
                        fontSize: 12,
                        padding: "2px 6px",
                        background: "var(--text-secondary)",
                        color: "var(--bg)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      {t("adminEventInactiveBadge")}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: "clamp(12px, 3vw, 14px)",
                      padding: "2px 8px",
                      background: "var(--surface)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {TYPE_LABELS[e.type] ?? e.type}
                  </span>
                  <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {formatEventDateRange(e)}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--primary)" }}>
                    €{Number(e.price).toFixed(0)}
                  </span>
                </div>
                {e.description && (
                  <p style={{ margin: "6px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {e.description.slice(0, 100)}
                    {e.description.length > 100 ? "…" : ""}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
