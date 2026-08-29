import Link from "next/link";
import type { CSSProperties } from "react";
import { weekdayShortLabelForPublicSchedule } from "@/lib/weekday-labels";
import type { WeekThemeMonthlyRow } from "@/lib/week-theme-monthly";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

type Props = {
  weeks: WeekThemeMonthlyRow[];
  weekdays: readonly number[];
  locale: Locale;
  editHrefBase: string;
};

const cellStyle: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid var(--border)",
  fontSize: "clamp(13px, 3.2vw, 14px)",
  color: "var(--text-primary)",
  verticalAlign: "top",
};

const headerCellStyle: CSSProperties = {
  ...cellStyle,
  fontWeight: 600,
  color: "var(--text-secondary)",
  whiteSpace: "nowrap",
};

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
    <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
        <thead>
          <tr>
            <th style={headerCellStyle}>{t("weekThemeMonthlyWeekColumnLabel")}</th>
            {weekdays.map((weekday) => (
              <th key={weekday} style={headerCellStyle}>
                {weekdayShortLabelForPublicSchedule(weekday, locale)}
              </th>
            ))}
            <th style={headerCellStyle} />
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.weekStart}>
              <td style={{ ...cellStyle, fontWeight: 600, whiteSpace: "nowrap" }}>{week.label}</td>
              {weekdays.map((weekday) => (
                <td key={weekday} style={cellStyle}>
                  {week.days[weekday] ?? "—"}
                </td>
              ))}
              <td style={{ ...cellStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                <Link
                  href={`${editHrefBase}?week=${week.weekStart}`}
                  style={{ color: "var(--primary)", fontWeight: 500, textDecoration: "none" }}
                >
                  {t("weekThemeMonthlyEditLink")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
