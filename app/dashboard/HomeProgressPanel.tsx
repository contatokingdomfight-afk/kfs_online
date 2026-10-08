import Link from "next/link";
import type { ReactNode } from "react";
import { Flame, Zap, Medal, ChevronRight } from "lucide-react";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import type { GraduationSummary } from "@/components/graduation/GraduationSummaryCard";
import type { WeekDayMark } from "@/lib/attendance-streak";

const card: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-secondary)",
};

function StatTile({
  href,
  icon,
  iconBg,
  iconFg,
  value,
  label,
}: {
  href: string;
  icon: ReactNode;
  iconBg: string;
  iconFg: string;
  value: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{ ...card, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8, textDecoration: "none", color: "inherit", minWidth: 0 }}
    >
      <span aria-hidden style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: iconBg, color: iconFg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </span>
      <span style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 800, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.2 }}>{label}</span>
    </Link>
  );
}

/**
 * Painel da página inicial (mockup «Hoje»): fila sequência · XP · ranking, a semana com os dias
 * treinados e o progresso da graduação.
 */
export function HomeProgressPanel({
  locale,
  hasCheckIn,
  hasPerformanceTracking,
  streakWeeks,
  xp,
  level,
  rank,
  rankTotal,
  week,
  monthCount,
  monthGoal,
  graduation,
}: {
  locale: "pt" | "en";
  hasCheckIn: boolean;
  hasPerformanceTracking: boolean;
  streakWeeks: number;
  xp: number | null;
  level: number | null;
  rank: number | null;
  rankTotal: number | null;
  week: WeekDayMark[];
  monthCount: number;
  monthGoal: number;
  graduation: GraduationSummary | null;
}) {
  if (!hasCheckIn && !hasPerformanceTracking) return null;
  const pt = locale === "pt";
  const nf = new Intl.NumberFormat(pt ? "pt-PT" : "en-GB");
  const gradPct =
    graduation && graduation.nextName && graduation.totalChecks > 0
      ? Math.round((graduation.doneCount / graduation.totalChecks) * 100)
      : graduation
        ? 100
        : 0;
  const tiles = [
    hasCheckIn && {
      key: "streak",
      href: "/dashboard/historico",
      icon: <Flame size={20} />,
      iconBg: "rgba(251,146,60,0.16)",
      iconFg: "#fb923c",
      value: String(streakWeeks),
      label: pt ? (streakWeeks === 1 ? "semana seguida" : "semanas seguidas") : streakWeeks === 1 ? "week in a row" : "weeks in a row",
    },
    hasPerformanceTracking &&
      xp != null && {
        key: "xp",
        href: "/dashboard/evolucao",
        icon: <Zap size={20} />,
        iconBg: "rgba(250,204,21,0.16)",
        iconFg: "#facc15",
        value: nf.format(xp),
        label: level != null ? `XP · ${pt ? "nível" : "level"} ${level}` : "XP",
      },
    hasPerformanceTracking &&
      rank != null && {
        key: "rank",
        href: "/dashboard/rank",
        icon: <Medal size={20} />,
        iconBg: "rgba(248,113,113,0.16)",
        iconFg: "#f87171",
        value: `#${rank}`,
        label: rankTotal ? (pt ? `de ${rankTotal} no ranking` : `of ${rankTotal} in ranking`) : pt ? "no ranking" : "in ranking",
      },
  ].filter(Boolean) as Array<{ key: string; href: string; icon: ReactNode; iconBg: string; iconFg: string; value: string; label: string }>;

  return (
    <section aria-label={pt ? "O teu progresso" : "Your progress"} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {tiles.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`, gap: 10 }}>
          {tiles.map(({ key, ...tile }) => (
            <StatTile key={key} {...tile} />
          ))}
        </div>
      )}

      {hasCheckIn && (
        <Link href="/dashboard/historico" style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 10, textDecoration: "none", color: "inherit" }}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
              {pt ? "Esta semana" : "This week"}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {monthCount}/{monthGoal} {pt ? "este mês" : "this month"}
            </span>
          </span>
          <span style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6, textAlign: "center" }}>
            {week.map((d) => (
              <span key={d.ymd} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: d.isToday ? "var(--text-primary)" : "var(--text-secondary)" }}>{d.label}</span>
                <span
                  aria-label={`${d.ymd}${d.trained ? (pt ? ": treinaste" : ": trained") : d.going ? (pt ? ": vais" : ": going") : ""}`}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    boxSizing: "border-box",
                    backgroundColor: d.trained ? "var(--primary)" : "var(--bg)",
                    border: d.isToday
                      ? "2px solid var(--text-primary)"
                      : d.going
                        ? "2px dashed var(--primary)"
                        : d.trained
                          ? "2px solid var(--primary)"
                          : "1px solid var(--border)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {d.trained ? "✓" : ""}
                </span>
              </span>
            ))}
          </span>
        </Link>
      )}

      {hasPerformanceTracking && graduation && (
        <Link href="/dashboard/graduacao" style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 10, textDecoration: "none", color: "inherit" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BeltSwatch colors={graduation.currentColors} width={34} height={12} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700 }}>
              {graduation.nextName
                ? `${pt ? "Rumo a" : "Towards"} ${graduation.nextName}`
                : graduation.currentName ?? (pt ? "Graduação" : "Graduation")}
              <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}> · {graduation.modalityName}</span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{gradPct}%</span>
            <ChevronRight size={18} color="var(--text-secondary)" aria-hidden />
          </span>
          <span style={{ height: 8, borderRadius: 4, backgroundColor: "var(--border)", overflow: "hidden" }}>
            <span style={{ display: "block", width: `${gradPct}%`, height: "100%", backgroundColor: graduation.isReadyForExam ? "var(--success)" : "var(--primary)" }} />
          </span>
          <span style={{ fontSize: 12, color: graduation.isReadyForExam ? "var(--success)" : "var(--text-secondary)", fontWeight: graduation.isReadyForExam ? 700 : 400 }}>
            {graduation.isReadyForExam
              ? pt
                ? "Pronto para o exame"
                : "Ready for the exam"
              : graduation.nextName
                ? `${pt ? "Requisitos" : "Requirements"}: ${graduation.doneCount}/${graduation.totalChecks}`
                : pt
                  ? "Grau máximo atingido"
                  : "Top grade reached"}
          </span>
        </Link>
      )}
    </section>
  );
}
