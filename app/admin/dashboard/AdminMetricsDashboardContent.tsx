import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminDashboardStats } from "@/lib/admin-dashboard-stats";
import { KpiCardGrid } from "../_components/KpiCardGrid";
import { BreakdownList } from "../_components/BreakdownList";
import { getTranslations } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { hasAllV1AdminPermissions, type ResolvedAdminAccess } from "@/lib/permissions/resolve";
import { isGranularRestrictedDashboard } from "@/lib/permissions/paths";

type Props = {
  client: SupabaseClient;
  schoolId: string | null;
  access: ResolvedAdminAccess;
};

export async function AdminMetricsDashboardContent({ client, schoolId, access }: Props) {
  const [locale, stats] = await Promise.all([
    getLocaleFromCookies(),
    getAdminDashboardStats(client, schoolId),
  ]);
  const t = getTranslations(locale as "pt" | "en");

  if (isGranularRestrictedDashboard(access) && !hasAllV1AdminPermissions(access)) {
    return (
      <p
        style={{
          margin: 0,
          maxWidth: 560,
          fontSize: "clamp(15px, 3.8vw, 17px)",
          lineHeight: 1.6,
          color: "var(--text-secondary)",
        }}
      >
        {t("adminGranularHomeHint")}
      </p>
    );
  }

  return (
    <>
      <KpiCardGrid
        cards={[
          { href: "/admin/alunos", icon: "👥", value: String(stats.activeStudents), label: t("adminActiveStudents") },
          { href: "/admin/coaches", icon: "🥋", value: String(stats.activeCoaches), label: t("adminActiveCoaches") },
          {
            href: "/admin/financeiro",
            icon: "⚠️",
            value: `${stats.delinquencyRate.percent.toFixed(1)}%`,
            label: t("adminDelinquencyRate"),
          },
        ]}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "clamp(16px, 4vw, 20px)",
        }}
      >
        <BreakdownList
          title={t("adminStudentsByPlanTitle")}
          noDataLabel={t("adminNoData")}
          infoTip={{ detail: t("adminStudentsByPlanInfo"), ariaLabel: t("adminStudentsByPlanTitle") }}
          rows={stats.studentsByPlan.map((p) => ({
            key: p.planId ?? "none",
            label: p.planId ? p.planName : t("adminNoPlan"),
            count: p.count,
          }))}
        />
        <BreakdownList
          title={t("adminStudentsByModalityTitle")}
          noDataLabel={t("adminNoData")}
          infoTip={{ detail: t("adminStudentsByModalityInfo"), ariaLabel: t("adminStudentsByModalityTitle") }}
          rows={stats.studentsByModality
            .filter((m) => m.count > 0)
            .map((m) => ({ key: m.modalityCode || "none", label: m.modalityName, count: m.count }))}
        />
      </div>
    </>
  );
}
