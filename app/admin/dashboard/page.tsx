import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { Suspense } from "react";
import { AdminMetricsDashboardSkeleton } from "./AdminMetricsDashboardSkeleton";
import { AdminMetricsDashboardContent } from "./AdminMetricsDashboardContent";
import { AdminDashboardPeriodSkeleton } from "./AdminDashboardPeriodSkeleton";
import { AdminDashboardPeriodContent } from "./AdminDashboardPeriodContent";
import { AdminDashboardPeriodFilter } from "./_components/AdminDashboardPeriodFilter";
import { getCachedResolvedAdminAccess } from "@/lib/permissions/get-cached-resolved";
import { AdminSchoolFilter } from "../AdminSchoolFilter";
import { getCachedSchools, getCachedModalityRefs } from "@/lib/cached-reference-data";

const VALID_PERIOD = /^\d+[dm]$/;

type SearchParams = Promise<{ school?: string; period?: string; modality?: string }>;

export default async function AdminMetricsDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const params = await searchParams;
  const schoolId = (params.school?.trim() || null) || null;
  const periodParam = params.period?.trim();
  const period = periodParam && VALID_PERIOD.test(periodParam) ? periodParam : "30d";
  const modalityCode = params.modality?.trim() || null;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  const access = await getCachedResolvedAdminAccess();
  const [schools, modalities] = await Promise.all([
    getCachedSchools(result.client),
    getCachedModalityRefs(result.client),
  ]);
  const schoolName = schoolId ? schools.find((s) => s.id === schoolId)?.name ?? "Todas" : "Todas";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)", minWidth: 0, overflowX: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "clamp(12px, 3vw, 16px)", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("navDashboard")}
        </h1>
        <AdminSchoolFilter schools={schools} currentSchoolId={schoolId} />
      </div>

      <Suspense fallback={<AdminMetricsDashboardSkeleton />}>
        <AdminMetricsDashboardContent client={result.client} schoolId={schoolId} access={access} />
      </Suspense>

      <AdminDashboardPeriodFilter
        currentPeriod={period}
        currentModality={modalityCode}
        modalities={modalities}
        labels={{
          periodLabel: t("adminPeriodFilterPeriod"),
          modalityLabel: t("adminPeriodFilterModality"),
          allModalities: t("adminPeriodFilterAllModalities"),
          days7: t("adminPeriodDays7"),
          days15: t("adminPeriodDays15"),
          days30: t("adminPeriodDays30"),
          months1: t("adminPeriodMonths1"),
          months3: t("adminPeriodMonths3"),
          months6: t("adminPeriodMonths6"),
          months12: t("adminPeriodMonths12"),
        }}
      />

      <Suspense fallback={<AdminDashboardPeriodSkeleton />}>
        <AdminDashboardPeriodContent
          client={result.client}
          schoolId={schoolId}
          period={period}
          modalityCode={modalityCode}
          access={access}
          schoolName={schoolName}
        />
      </Suspense>
    </div>
  );
}
