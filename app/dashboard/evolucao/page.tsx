import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  LineChart,
  Award,
  FileText,
  Trophy,
  Medal,
  CalendarCheck,
  HelpCircle,
  ChevronRight,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/require-plan";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getCachedPlanAccess } from "@/lib/plan-access";
import { getStudentNavAreas } from "@/lib/dashboard-student-nav";
import { getRankInfoForStudent } from "@/lib/get-rank-info";
import { getAchievementUnlockContext, getAchievementsWithStatus } from "@/lib/achievements";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { loadStudentGraduations } from "@/lib/graduation/load-student-progress";
import { toGraduationSummary } from "@/components/graduation/GraduationSummaryCard";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";

export const dynamic = "force-dynamic";

type Tile = { icon: ReactNode; bg: string; fg: string; hint: string };

/** Ícone, cor e descrição curta de cada sub-página de Evolução (por href). */
function tileFor(href: string, pt: boolean): Tile {
  const size = 20;
  if (href.startsWith("/dashboard/performance/historico"))
    return { icon: <FileText size={size} />, bg: "rgba(167,139,250,0.16)", fg: "#a78bfa", hint: pt ? "Notas e comentários do coach" : "Coach scores and notes" };
  if (href.startsWith("/dashboard/performance"))
    return { icon: <LineChart size={size} />, bg: "rgba(96,165,250,0.16)", fg: "#60a5fa", hint: pt ? "Radar, físico e pontos a melhorar" : "Radar, physical and focus points" };
  if (href.startsWith("/dashboard/graduacao"))
    return { icon: <Award size={size} />, bg: "rgba(193,18,31,0.16)", fg: "#f87171", hint: pt ? "Requisitos e próximo exame" : "Requirements and next exam" };
  if (href.startsWith("/dashboard/conquistas"))
    return { icon: <Trophy size={size} />, bg: "rgba(250,204,21,0.16)", fg: "#facc15", hint: pt ? "Medalhas desbloqueadas" : "Unlocked badges" };
  if (href.startsWith("/dashboard/rank"))
    return { icon: <Medal size={size} />, bg: "rgba(251,146,60,0.16)", fg: "#fb923c", hint: pt ? "O teu lugar na escola" : "Your place in the school" };
  if (href.startsWith("/dashboard/historico"))
    return { icon: <CalendarCheck size={size} />, bg: "rgba(74,222,128,0.16)", fg: "#4ade80", hint: pt ? "Todas as aulas em que estiveste" : "Every class you attended" };
  return { icon: <HelpCircle size={size} />, bg: "var(--bg)", fg: "var(--text-secondary)", hint: pt ? "XP, critérios e exames" : "XP, criteria and exams" };
}

const card: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-secondary)",
};

export default async function EvolucaoPage() {
  await requirePlan();
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/dashboard");

  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const pt = locale === "pt";
  const t = getTranslations(locale);
  const supabase = await createClient();
  const planAccess = await getCachedPlanAccess(studentId);

  const graduationAdmin = getAdminClientOrNull().client;
  const [rankState, achievementContext, graduations] = await Promise.all([
    planAccess.hasPerformanceTracking ? getRankInfoForStudent(supabase, studentId) : Promise.resolve(null),
    planAccess.hasPerformanceTracking ? getAchievementUnlockContext(supabase, studentId) : Promise.resolve(null),
    planAccess.hasPerformanceTracking && graduationAdmin
      ? loadStudentGraduations(graduationAdmin, studentId).catch((err) => {
          console.error("loadStudentGraduations (evolucao):", err);
          return [];
        })
      : Promise.resolve([]),
  ]);

  const areas = getStudentNavAreas({ t, locale, planAccess, hasPlan: true });
  const evolucao = areas.find((a) => a.id === "evolucao");
  const links = evolucao?.children ?? [];

  const rank = rankState?.rankInfo ?? null;
  const xpPct = rank && rank.xpNext > 0 ? Math.min(100, Math.round((rank.xpCurrent / rank.xpNext) * 100)) : 0;
  const achievements = achievementContext ? getAchievementsWithStatus(achievementContext) : [];
  const unlocked = achievements.filter((a) => a.isUnlocked).length;
  const graduation = graduations[0] ? toGraduationSummary(graduations[0]) : null;
  const gradPct =
    graduation && graduation.nextName && graduation.totalChecks > 0
      ? Math.round((graduation.doneCount / graduation.totalChecks) * 100)
      : graduation
        ? 100
        : 0;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18, paddingBottom: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 800 }}>{pt ? "Evolução" : "Progress"}</h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>
          {pt ? "O teu progresso na KFS, num só sítio." : "Your progress at KFS, in one place."}
        </p>
      </header>

      {(graduation || rank) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {graduation && (
            <Link
              href="/dashboard/graduacao"
              style={{ ...card, flex: "1 1 320px", padding: 18, display: "flex", alignItems: "center", gap: 18, textDecoration: "none", color: "inherit" }}
            >
              <div
                aria-hidden
                style={{
                  width: 96,
                  height: 96,
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: `conic-gradient(var(--primary) ${gradPct * 3.6}deg, var(--border) 0deg)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    backgroundColor: "var(--bg-secondary)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{gradPct}%</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                  {graduation.modalityName}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 800 }}>
                  <BeltSwatch colors={graduation.currentColors} width={32} height={12} />
                  {graduation.currentName ?? (pt ? "Sem graduação" : "No grade yet")}
                  {graduation.nextName ? ` → ${graduation.nextName}` : ""}
                </span>
                <span style={{ fontSize: 13, color: graduation.isReadyForExam ? "var(--success)" : "var(--text-secondary)", fontWeight: graduation.isReadyForExam ? 700 : 400 }}>
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
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" aria-hidden />
            </Link>
          )}

          {rank && (
            <Link
              href="/dashboard/rank"
              style={{ ...card, flex: "1 1 260px", padding: 18, display: "flex", flexDirection: "column", gap: 12, textDecoration: "none", color: "inherit" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(250,204,21,0.16)", color: "#facc15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Zap size={22} aria-hidden />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {pt ? "Nível" : "Level"} {rank.level} · {rank.rankName}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    {rank.xpCurrent} <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>/ {rank.xpNext} XP</span>
                  </div>
                </div>
              </div>
              <div style={{ height: 8, borderRadius: 4, backgroundColor: "var(--border)", overflow: "hidden" }}>
                <div style={{ width: `${xpPct}%`, height: "100%", backgroundColor: "#facc15" }} />
              </div>
              {achievements.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Trophy size={14} aria-hidden />
                  {unlocked} {pt ? "de" : "of"} {achievements.length} {pt ? "conquistas" : "achievements"}
                </div>
              )}
            </Link>
          )}
        </div>
      )}

      <nav aria-label={pt ? "Secções de evolução" : "Progress sections"}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 12 }}>
          {links.map((l) => {
            const tile = tileFor(l.href, pt);
            return (
              <Link
                key={l.href}
                href={l.href}
                prefetch={l.prefetch}
                style={{ ...card, padding: 16, display: "flex", alignItems: "center", gap: 14, textDecoration: "none", color: "inherit", minHeight: 76 }}
              >
                <span
                  aria-hidden
                  style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, backgroundColor: tile.bg, color: tile.fg, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  {tile.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{l.label}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{tile.hint}</span>
                </span>
                <ChevronRight size={18} color="var(--text-secondary)" aria-hidden />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
