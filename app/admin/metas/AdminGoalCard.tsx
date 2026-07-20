"use client";

import Link from "next/link";
import {
  formatGoalValue,
  GOAL_METRIC_LABELS_PT,
  GOAL_STATUS_LABELS_PT,
  isGoalOverdue,
  progressPercent,
  type AdminGoalWithSchool,
} from "@/lib/admin-business-goals";

type Props = {
  goal: AdminGoalWithSchool;
};

export function AdminGoalCard({ goal }: Props) {
  const pct = progressPercent(goal.currentValue, goal.targetValue);
  const overdue = isGoalOverdue(goal);

  return (
    <Link
      href={`/admin/metas/${goal.id}`}
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "clamp(14px, 3.5vw, 18px)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, flex: 1, minWidth: 0 }}>{goal.title}</h2>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 999,
            background: "var(--bg)",
            color: "var(--text-secondary)",
          }}
        >
          {GOAL_METRIC_LABELS_PT[goal.metricType]}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 999,
            background:
              goal.status === "COMPLETED"
                ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                : goal.status === "CANCELLED"
                  ? "var(--bg)"
                  : overdue
                    ? "color-mix(in srgb, var(--danger, #c00) 12%, transparent)"
                    : "var(--bg)",
            color:
              goal.status === "COMPLETED"
                ? "var(--primary)"
                : overdue
                  ? "var(--danger, #c00)"
                  : "var(--text-secondary)",
          }}
        >
          {overdue && goal.status === "ACTIVE" ? "Em atraso" : GOAL_STATUS_LABELS_PT[goal.status]}
        </span>
      </div>

      {goal.description && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>{goal.description}</p>
      )}

      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
        {formatGoalValue(goal.metricType, goal.currentValue)} / {formatGoalValue(goal.metricType, goal.targetValue)}
      </p>

      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: "var(--bg)",
          overflow: "hidden",
        }}
        aria-hidden
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: goal.status === "COMPLETED" ? "var(--primary)" : overdue ? "var(--danger, #c00)" : "var(--primary)",
            transition: "width 0.2s ease",
          }}
        />
      </div>

      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
        {goal.schoolId ? goal.schoolName ?? "Escola" : "Global"} · {goal.startDate.slice(0, 10)} →{" "}
        {goal.targetEndDate.slice(0, 10)} · {pct}%
      </p>
    </Link>
  );
}
