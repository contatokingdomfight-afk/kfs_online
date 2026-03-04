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
          href={base}
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
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "12px",
            marginTop: "12px",
          }}
        >
          <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)", fontWeight: 500 }}>
            {formatWeekRangeLabel(weekMonday)}
          </span>
          {prevWeek && (
            <Link
              href={`${base}?view=semana&week=${prevWeek}`}
              style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)", textDecoration: "none" }}
            >
              ← Semana anterior
            </Link>
          )}
          {nextWeek && (
            <Link
              href={`${base}?view=semana&week=${nextWeek}`}
              style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)", textDecoration: "none" }}
            >
              Próxima semana →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
