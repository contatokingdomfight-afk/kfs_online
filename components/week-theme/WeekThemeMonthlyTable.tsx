import Link from "next/link";
import { weekdayLabelForPublicSchedule, weekdayShortLabelForPublicSchedule } from "@/lib/weekday-labels";
import type { WeekThemeMonthlyRow } from "@/lib/week-theme-monthly";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

type Props = {
  weeks: WeekThemeMonthlyRow[];
  weekdays: readonly number[];
  locale: Locale;
  /** Omitir para uma vista só de leitura (sem link de editar) — ex.: vista do aluno. */
  editHrefBase?: string;
};

/** Segunda…Domingo — cor própria por dia, para reconhecimento visual rápido entre cards. */
const WEEKDAY_COLORS = ["#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6", "#94a3b8"];

function weekdayColor(weekday: number): string {
  return WEEKDAY_COLORS[weekday - 1] ?? "#94a3b8";
}

export function WeekThemeMonthlyTable({ weeks, weekdays, locale, editHrefBase }: Props) {
  const t = getTranslations(locale);

  if (weeks.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {t("weekThemeMonthlyEmpty")}
      </p>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "clamp(12px, 3vw, 16px)",
      }}
    >
      {weeks.map((week) => {
        const filledWeekdays = new Set(weekdays.filter((weekday) => Boolean(week.days[weekday])));
        const daysWithTopic = weekdays
          .map((weekday) => ({ weekday, topic: week.days[weekday] }))
          .filter((d): d is { weekday: number; topic: string } => Boolean(d.topic));

        return (
          <div
            key={week.weekStart}
            className="card"
            style={{ padding: "clamp(14px, 3.5vw, 18px)", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 16px)", fontWeight: 600, color: "var(--text-primary)" }}>
                {week.label}
              </h3>
              {editHrefBase && (
                <Link
                  href={`${editHrefBase}?week=${week.weekStart}`}
                  className="btn btn-secondary"
                  style={{ fontSize: 13, padding: "4px 10px", minHeight: 32, textDecoration: "none", flexShrink: 0 }}
                >
                  {t("weekThemeMonthlyEditLink")}
                </Link>
              )}
            </div>

            <div style={{ display: "flex", gap: 5 }} aria-hidden="true">
              {weekdays.map((weekday) => {
                const filled = filledWeekdays.has(weekday);
                const color = weekdayColor(weekday);
                return (
                  <span
                    key={weekday}
                    title={weekdayLabelForPublicSchedule(weekday, locale)}
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      backgroundColor: filled ? color : "transparent",
                      border: `1.5px solid ${filled ? color : "var(--border)"}`,
                    }}
                  />
                );
              })}
            </div>

            {daysWithTopic.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>{t("weekThemeMonthlyWeekEmpty")}</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {daysWithTopic.map(({ weekday, topic }) => {
                  const color = weekdayColor(weekday);
                  return (
                    <li key={weekday} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "clamp(13px, 3.2vw, 14px)" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          flexShrink: 0,
                          padding: "2px 9px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          color,
                          backgroundColor: `${color}22`,
                          border: `1px solid ${color}55`,
                        }}
                      >
                        {weekdayShortLabelForPublicSchedule(weekday, locale)}
                      </span>
                      <span style={{ color: "var(--text-primary)", paddingTop: 2 }}>{topic}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
