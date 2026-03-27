"use client";

import Link from "next/link";
import { formatWeekRangeLabel, addWeeks } from "@/lib/lesson-utils";

type ViewMode = "modalidade" | "semana";

export function TurmasViewSwitcher({
  view,
  weekMonday,
  weekMondayForLink,
}: {
  view: ViewMode;
  weekMonday: string | null;
  weekMondayForLink: string;
}) {
  const base = "/admin/turmas";
  const weekForNav = weekMonday ?? weekMondayForLink;
  const prevWeek = weekForNav ? addWeeks(weekForNav, -1) : null;
  const nextWeek = weekForNav ? addWeeks(weekForNav, 1) : null;

  return (
    <div style={{ marginBottom: "clamp(16px, 4vw, 20px)" }}>
      <div
        style={{
          display: "inline-flex",
          borderRadius: 8,
          padding: 4,
          backgroundColor: "var(--bg-secondary)",
          gap: 2,
        }}
      >
        <Link
          href={`${base}?view=modalidade`}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            fontSize: "clamp(13px, 3.2vw, 15px)",
            fontWeight: 500,
            textDecoration: "none",
            color: view === "modalidade" ? "var(--text-inverse)" : "var(--text-secondary)",
            backgroundColor: view === "modalidade" ? "var(--primary)" : "transparent",
          }}
        >
          Por modalidade
        </Link>
        <Link
          href={`${base}?view=semana&week=${weekMondayForLink}`}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            fontSize: "clamp(13px, 3.2vw, 15px)",
            fontWeight: 500,
            textDecoration: "none",
            color: view === "semana" ? "var(--text-inverse)" : "var(--text-secondary)",
            backgroundColor: view === "semana" ? "var(--primary)" : "transparent",
          }}
        >
          Por semana
        </Link>
      </div>
      {view === "semana" && weekMonday && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2">
          <span
            className="min-w-0 shrink text-[clamp(14px,3.5vw,16px)] font-medium text-[var(--text-primary)]"
          >
            {formatWeekRangeLabel(weekMonday)}
          </span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:justify-end sm:shrink-0">
            {prevWeek && (
              <Link
                href={`${base}?view=semana&week=${prevWeek}`}
                className="whitespace-nowrap text-[clamp(13px,3.2vw,15px)] text-[var(--primary)] no-underline"
              >
                ← Semana anterior
              </Link>
            )}
            {nextWeek && (
              <Link
                href={`${base}?view=semana&week=${nextWeek}`}
                className="whitespace-nowrap text-[clamp(13px,3.2vw,15px)] text-[var(--primary)] no-underline"
              >
                Próxima semana →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
