import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminDashboardPeriodStats } from "@/lib/admin-dashboard-period-stats";
import { KpiCardGrid } from "../_components/KpiCardGrid";
import { BreakdownList } from "../_components/BreakdownList";
import { OverviewChartsDynamic } from "../_components/OverviewChartsDynamic";
import { CheckinsByWeekdayChartDynamic, EvaluationsPerWeekChartDynamic } from "./_components/PeriodBarChartsDynamic";
import { CourseEngagementSection } from "./_components/CourseEngagementSection";
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

export async function AdminDashboardPeriodContent({ client, schoolId, period, modalityCode, access, schoolName }: Props) {
  const [locale, stats] = await Promise.all([
    getLocaleFromCookies(),
    getAdminDashboardPeriodStats(client, schoolId, period, modalityCode),
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
      <KpiCardGrid
        cards={[
          { href: "/admin/financeiro", icon: "💰", value: `${stats.revenue.total.toFixed(0)} €`, label: t("adminRevenueInPeriod") },
          { href: "/admin/alunos", icon: "✨", value: String(newStudentsInPeriod), label: t("adminNewStudentsInPeriod") },
          { href: "/admin/presenca", icon: "📊", value: stats.avgAttendance.toFixed(1), label: t("adminAvgAttendanceInPeriod") },
          { href: "/admin/turmas", icon: "🥊", value: `${stats.occupancyRate.averagePercent.toFixed(0)}%`, label: t("adminOccupancyRate") },
        ]}
      />
      {stats.occupancyRate.lessonsWithoutCapacity > 0 && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
          {stats.occupancyRate.lessonsWithoutCapacity} {t("adminLessonsWithoutCapacity")}
        </p>
      )}

      <OverviewChartsDynamic
        growthByBucket={stats.growthByBucket}
        revenueByBucket={stats.revenue.byBucket}
        modalityPopularity={stats.modalityPopularity}
        schoolName={schoolName}
        labels={{
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
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "clamp(16px, 4vw, 20px)",
        }}
      >
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "clamp(16px, 4vw, 20px)",
        }}
      >
        <CheckinsByWeekdayChartDynamic
          data={stats.checkinsByWeekday}
          title={t("adminCheckinsByWeekdayTitle")}
          noDataLabel={t("adminNoData")}
          info={t("adminCheckinsByWeekdayInfo")}
          weekdayLabels={weekdayLabels}
        />
        <EvaluationsPerWeekChartDynamic
          data={stats.evaluationsPerWeek}
          title={t("adminEvaluationsPerWeekTitle")}
          noDataLabel={t("adminNoData")}
          info={t("adminEvaluationsPerWeekInfo")}
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
}
