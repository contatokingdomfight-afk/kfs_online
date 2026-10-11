import type { SupabaseClient } from "@supabase/supabase-js";
import { Banknote, Sparkles, BarChart3, Swords } from "lucide-react";
import { getAdminDashboardPeriodStats } from "@/lib/admin-dashboard-period-stats";
import { getAdminDashboardStatsCached } from "@/lib/admin-dashboard-stats";
import { KpiCardGrid } from "../_components/KpiCardGrid";
import { BreakdownList } from "../_components/BreakdownList";
import { OverviewChartsDynamic } from "../_components/OverviewChartsDynamic";
import { CheckinsByWeekdayChartDynamic, EvaluationsPerWeekChartDynamic } from "./_components/PeriodBarChartsDynamic";
import { CourseEngagementSection } from "./_components/CourseEngagementSection";
import { ContentTabs } from "@/components/ui/ContentTabs";
import { getTranslations } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { hasAllV1AdminPermissions, type ResolvedAdminAccess } from "@/lib/permissions/resolve";
import { isGranularRestrictedDashboard } from "@/lib/permissions/paths";

type Props = {
  client: SupabaseClient;
  schoolId: string | null;
  period: string;
  modalityCode: string | null;
  access: ResolvedAdminAccess;
  schoolName: string;
};

const grid = (min: number): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
  gap: "clamp(16px, 4vw, 20px)",
});

/** Relatórios do período em 3 separadores (Alunos · Dinheiro · Treino) — os mesmos gráficos e listas de antes. */
export async function AdminDashboardPeriodContent({ client, schoolId, period, modalityCode, access, schoolName }: Props) {
  const [locale, stats, snapshot] = await Promise.all([
    getLocaleFromCookies(),
    getAdminDashboardPeriodStats(client, schoolId, period, modalityCode),
    getAdminDashboardStatsCached(client, schoolId),
  ]);
  const t = getTranslations(locale as "pt" | "en");

  if (isGranularRestrictedDashboard(access) && !hasAllV1AdminPermissions(access)) {
    return null;
  }

  const newStudentsInPeriod = stats.newStudentsByModality.reduce((sum, m) => sum + m.count, 0);

  const weekdayLabels = [
    t("adminWeekdayMon"),
    t("adminWeekdayTue"),
    t("adminWeekdayWed"),
    t("adminWeekdayThu"),
    t("adminWeekdayFri"),
    t("adminWeekdaySat"),
    t("adminWeekdaySun"),
  ];

  const chartLabels = {
    growthTitle: t("adminChartGrowth"),
    revenueTitle: t("adminChartRevenue"),
    modalityTitle: t("adminChartModality"),
    noData: t("adminNoData"),
    activeLabel: t("adminGrowthActiveLabel"),
    newLabel: t("adminGrowthNewLabel"),
    churnedLabel: t("adminGrowthChurnedLabel"),
    growthInfo: t("adminChartGrowthInfo"),
    revenueInfo: t("adminChartRevenueInfo"),
    modalityInfo: t("adminChartModalityInfo"),
  };
  const chartData = {
    growthByBucket: stats.growthByBucket,
    revenueByBucket: stats.revenue.byBucket,
    modalityPopularity: stats.modalityPopularity,
    modalityCatalog: stats.modalityCatalog,
    schoolName,
    labels: chartLabels,
  };

  const alunos = (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
      <KpiCardGrid
        cards={[
          {
            href: "/admin/alunos",
            icon: <Sparkles size={24} aria-hidden />,
            value: String(newStudentsInPeriod),
            label: t("adminNewStudentsInPeriod"),
            info: t("adminNewStudentsInPeriodInfo"),
          },
        ]}
      />
      <OverviewChartsDynamic {...chartData} only={["growth"]} />
      <div style={grid(260)}>
        <BreakdownList
          title={t("adminStudentsByPlanTitle")}
          noDataLabel={t("adminNoData")}
          infoTip={{ detail: t("adminStudentsByPlanInfo"), ariaLabel: t("adminStudentsByPlanTitle") }}
          rows={snapshot.studentsByPlan.map((p) => ({
            key: p.planId ?? "none",
            label: p.planId ? p.planName : t("adminNoPlan"),
            count: p.count,
          }))}
        />
        <BreakdownList
          title={t("adminStudentsByModalityTitle")}
          noDataLabel={t("adminNoData")}
          infoTip={{ detail: t("adminStudentsByModalityInfo"), ariaLabel: t("adminStudentsByModalityTitle") }}
          rows={snapshot.studentsByModality
            .filter((m) => m.count > 0)
            .map((m) => ({ key: m.modalityCode || "none", label: m.modalityName, count: m.count }))}
        />
        <BreakdownList
          title={t("adminNewStudentsByModalityTitle")}
          noDataLabel={t("adminNoData")}
          infoTip={{ detail: t("adminNewStudentsByModalityInfo"), ariaLabel: t("adminNewStudentsByModalityTitle") }}
          rows={stats.newStudentsByModality
            .filter((m) => m.count > 0)
            .map((m) => ({ key: m.modalityCode || "none", label: m.modalityName, count: m.count }))}
        />
        <BreakdownList
          title={t("adminNewStudentsByPlanTitle")}
          noDataLabel={t("adminNoData")}
          infoTip={{ detail: t("adminNewStudentsByPlanInfo"), ariaLabel: t("adminNewStudentsByPlanTitle") }}
          rows={stats.newStudentsByPlan.map((p) => ({
            key: p.planId ?? "none",
            label: p.planId ? p.planName : t("adminNoPlan"),
            count: p.count,
          }))}
        />
      </div>
    </div>
  );

  const dinheiro = (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
      <KpiCardGrid
        cards={[
          {
            href: "/admin/financeiro",
            icon: <Banknote size={24} aria-hidden />,
            value: `${stats.revenue.total.toFixed(0)} €`,
            label: t("adminRevenueInPeriod"),
            info: t("adminRevenueInPeriodInfo"),
          },
        ]}
      />
      <OverviewChartsDynamic {...chartData} only={["revenue"]} />
    </div>
  );

  const treino = (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
      <KpiCardGrid
        cards={[
          {
            href: "/admin/presenca",
            icon: <BarChart3 size={24} aria-hidden />,
            value: stats.avgAttendance.toFixed(1),
            label: t("adminAvgAttendanceInPeriod"),
            info: t("adminAvgAttendanceInPeriodInfo"),
          },
          {
            href: "/admin/turmas",
            icon: <Swords size={24} aria-hidden />,
            value: `${stats.occupancyRate.averagePercent.toFixed(0)}%`,
            label: t("adminOccupancyRate"),
            info: t("adminOccupancyRateInfo"),
          },
        ]}
      />
      {stats.occupancyRate.lessonsWithoutCapacity > 0 && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
          {stats.occupancyRate.lessonsWithoutCapacity} {t("adminLessonsWithoutCapacity")}
        </p>
      )}
      <OverviewChartsDynamic {...chartData} only={["modality"]} />
      <div style={grid(320)}>
        <CheckinsByWeekdayChartDynamic
          data={stats.checkinsByWeekday}
          title={t("adminCheckinsByWeekdayTitle")}
          noDataLabel={t("adminNoData")}
          info={t("adminCheckinsByWeekdayInfo")}
          weekdayLabels={weekdayLabels}
          modalityCatalog={stats.modalityCatalog}
        />
        <EvaluationsPerWeekChartDynamic
          data={stats.evaluationsPerWeek}
          title={t("adminEvaluationsPerWeekTitle")}
          noDataLabel={t("adminNoData")}
          info={t("adminEvaluationsPerWeekInfo")}
          modalityCatalog={stats.modalityCatalog}
        />
      </div>
      <CourseEngagementSection
        engagement={stats.courseEngagement}
        labels={{
          title: t("adminCourseEngagementTitle"),
          titleInfo: t("adminCourseEngagementInfo"),
          unitsCompleted: t("adminUnitsCompleted"),
          coursesCompleted: t("adminCoursesCompleted"),
          studentsWithPurchase: t("adminStudentsWithPurchase"),
          topCoursesTitle: t("adminTopCoursesTitle"),
          noData: t("adminNoData"),
        }}
      />
    </div>
  );

  return (
    <ContentTabs
      ariaLabel="Relatórios"
      tabs={[
        { id: "alunos", label: "Alunos", content: alunos },
        { id: "dinheiro", label: "Dinheiro", content: dinheiro },
        { id: "treino", label: "Treino", content: treino },
      ]}
    />
  );
}
