import Link from "next/link";

const BELT_COLORS: Record<string, string> = {
  WHITE: "#e5e5e5",
  YELLOW: "#facc15",
  ORANGE: "#f97316",
  GREEN: "#22c55e",
  BLUE: "#3b82f6",
  PURPLE: "#a855f7",
  BROWN: "#92400e",
  BLACK: "#1f2937",
  BLACK_1: "#1f2937",
  BLACK_2: "#1f2937",
  BLACK_3: "#1f2937",
  GOLDEN: "#f59e0b",
};

type Props = {
  studentName: string | null;
  currentBelt: string | null;
  currentXP: number;
  nextLevelXP: number;
  totalPresences: number;
  currentMonthCount: number;
  attendanceGoal: number;
  hasCheckIn: boolean;
  hasPerformanceTracking: boolean;
  t: (key: string) => string;
  beltLabel: string;
};

export function WarriorPanel({
  studentName,
  currentBelt,
  currentXP,
  nextLevelXP,
  totalPresences,
  currentMonthCount,
  attendanceGoal,
  hasCheckIn,
  hasPerformanceTracking,
  t,
  beltLabel,
}: Props) {
  if (!hasCheckIn && !hasPerformanceTracking) return null;

  const xpPct = nextLevelXP > 0 ? Math.min(100, (currentXP / nextLevelXP) * 100) : 0;
  const attendancePct = attendanceGoal > 0 ? Math.min(100, (currentMonthCount / attendanceGoal) * 100) : 0;
  const goalReached = currentMonthCount >= attendanceGoal;
  const beltColor = currentBelt ? BELT_COLORS[currentBelt] ?? "var(--primary)" : "var(--primary)";

  return (
    <section>
      <Link
        href="/dashboard/performance"
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        <div
          className="card"
          style={{
            padding: "clamp(20px, 5vw, 28px)",
            background: "linear-gradient(135deg, var(--surface) 0%, var(--bg) 100%)",
            borderLeft: "4px solid var(--primary)",
            cursor: "pointer",
          }}
        >
          <h2 style={{ margin: "0 0 4px 0", fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 700, color: "var(--text-primary)" }}>
            🛡️ {t("dashboardWarriorPanelTitle")}
          </h2>
          <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)" }}>
            {t("dashboardWarriorGreeting")} {studentName ?? t("dashboardWarriorDefaultName")}!
          </p>

          {hasPerformanceTracking && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    borderRadius: "var(--radius-full)",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontWeight: 600,
                    color: "#fff",
                    backgroundColor: beltColor,
                    textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }}
                >
                  {beltLabel}
                </span>
                <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                  {currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
                </span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <p style={{ margin: "0 0 6px 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)" }}>
                  {t("progressToNextBelt")}
                </p>
                <div style={{ width: "100%", height: 10, backgroundColor: "var(--border)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${xpPct}%`,
                      height: "100%",
                      backgroundColor: "var(--primary)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {hasCheckIn && (
            <div style={{ marginTop: hasPerformanceTracking ? 20 : 0 }}>
              <p style={{ margin: "0 0 6px 0", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-primary)" }}>
                {t("dashboardAttendanceGoalTitle")}
              </p>
              <p style={{ margin: "0 0 8px 0", fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 700, color: goalReached ? "var(--success)" : "var(--primary)" }}>
                {currentMonthCount} / {attendanceGoal} {t("classesCount")}
              </p>
              <div style={{ width: "100%", height: 10, backgroundColor: "var(--border)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${attendancePct}%`,
                    height: "100%",
                    backgroundColor: goalReached ? "var(--success)" : "var(--primary)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              {goalReached && (
                <p style={{ margin: "6px 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--success)" }}>
                  ✓ {t("goalReached")}
                </p>
              )}
            </div>
          )}

          <p style={{ margin: "clamp(16px, 4vw, 20px) 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
            {t("dashboardTotalPresences")}: <strong style={{ color: "var(--text-primary)" }}>{totalPresences}</strong>
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--primary)", fontWeight: 500 }}>
            {t("dashboardWarriorViewAll")} →
          </p>
        </div>
      </Link>
    </section>
  );
}
