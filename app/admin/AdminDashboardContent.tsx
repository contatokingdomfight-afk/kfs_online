import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminDashboardStats } from "@/lib/admin-dashboard-stats";
import { getActionItemsData } from "@/lib/admin-action-items";
import { getTodayTrialClassesForAdmin } from "@/lib/today-trial-classes";
import { TodayTrialClassesHighlight } from "@/components/TodayTrialClassesHighlight";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { AdminSchoolFilter } from "./AdminSchoolFilter";
import { BusinessHealthStats } from "./_components/BusinessHealthStats";
import { ActionItems } from "./_components/ActionItems";
import { ManagementGrid } from "./_components/ManagementGrid";
import { OverviewChartsDynamic } from "./_components/OverviewChartsDynamic";
import { getTranslations } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { hasAllV1AdminPermissions, type ResolvedAdminAccess, adminAccessAllows } from "@/lib/permissions/resolve";
import { isGranularRestrictedDashboard } from "@/lib/permissions/paths";

function canAccessFinanceiro(access: ResolvedAdminAccess): boolean {
  if (access.kind === "all") return true;
  if (access.kind === "none") return false;
  return adminAccessAllows(access, "admin:financeiro:read") || adminAccessAllows(access, "admin:financeiro:write");
}

type Props = {
  client: SupabaseClient;
  schoolId: string | null;
  access: ResolvedAdminAccess;
};

export async function AdminDashboardContent({ client, schoolId, access }: Props) {
  const [locale, stats, actionItems, todayTrials] = await Promise.all([
    getLocaleFromCookies(),
    getAdminDashboardStats(client, schoolId),
    getActionItemsData(client, schoolId),
    getTodayTrialClassesForAdmin(client, schoolId),
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

  const modalityNames: Record<string, string> = {};
  stats.studentsByModality.forEach((m) => {
    modalityNames[m.modalityCode] = m.modalityName;
  });

  const schoolName = schoolId ? stats.schools.find((s) => s.id === schoolId)?.name ?? "Todas" : "Todas";

  const financeShortcuts = canAccessFinanceiro(access)
    ? [
        { href: "/admin/loja/vendas/novo", icon: "🧾", label: t("adminQuickRegisterSale") },
        { href: "/admin/loja", icon: "🛍️", label: t("navLoja") },
        { href: "/admin/financeiro", icon: "💶", label: t("navFinance") },
        { href: "/admin/financeiro/relatorio", icon: "📈", label: t("adminQuickFinanceReport") },
      ]
    : [];

  const managementGroups = [
    ...(financeShortcuts.length
      ? [{ title: t("adminGroupShortcuts"), items: financeShortcuts }]
      : []),
    {
      title: t("adminGroupPeople"),
      items: [
        { href: "/admin/alunos", icon: "🧑‍🎓", label: t("navStudents") },
        { href: "/admin/atletas", icon: "🤸", label: t("navAthletes") },
        { href: "/admin/coaches", icon: "👨‍🏫", label: t("navCoaches") },
        { href: "/admin/experimentais", icon: "🧪", label: t("navTrials") },
      ],
    },
    {
      title: t("adminGroupAcademic"),
      items: [
        { href: "/admin/escolas", icon: "🏫", label: t("navSchools") },
        { href: "/admin/turmas", icon: "🥋", label: t("navClasses") },
        { href: "/admin/modalidades", icon: "🥊", label: t("navModalities") },
        { href: "/admin/locais", icon: "📍", label: t("navLocations") },
      ],
    },
    {
      title: t("adminGroupContentFinance"),
      items: [
        { href: "/admin/planos", icon: "💳", label: t("navPlans") },
        { href: "/admin/cursos", icon: "📚", label: t("navCourses") },
        { href: "/admin/eventos", icon: "✨", label: t("navEventsAdmin") },
      ],
    },
    {
      title: t("adminGroupPlatform"),
      items: [
        { href: "/admin/avaliacao", icon: "📊", label: t("navEvaluationCriteria") },
        { href: "/admin/missoes", icon: "🎯", label: t("navMissions") },
        { href: "/admin/metas", icon: "📌", label: t("navGoals") },
        { href: "/admin/configuracoes", icon: "⚙️", label: t("navSettings") },
        { href: "/admin/permissoes", icon: "🔐", label: t("navPermissions") },
      ],
    },
  ];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <AdminSchoolFilter schools={stats.schools} currentSchoolId={schoolId} />
      </div>

      <TodayTrialClassesHighlight
        trials={todayTrials}
        modalityLabels={MODALITY_LABELS}
        labels={{
          title: t("todayTrialsTitle"),
          subtitle: t("todayTrialsSubtitle"),
          pendingBadge: t("todayTrialsPending"),
          acceptedBadge: t("todayTrialsAccepted"),
          viewAll: t("todayTrialsViewAll"),
          goToLesson: t("adminViewLesson"),
        }}
        manageHref="/admin/experimentais"
      />

      {/* Secção: SAÚDE DO NEGÓCIO */}
      <BusinessHealthStats
        revenueCurrentMonth={stats.revenueCurrentMonth}
        activeStudents={stats.activeStudents}
        newStudentsThisMonth={stats.newStudentsThisMonth}
        avgAttendanceLast7Days={stats.avgAttendanceLast7Days}
        labels={{
          revenueThisMonth: t("adminRevenueThisMonth"),
          activeStudents: t("adminActiveStudents"),
          newStudentsMonth: t("adminNewStudentsMonth"),
          avgAttendanceDaily: t("adminAvgAttendanceDaily"),
        }}
      />

      {/* Gestão da plataforma (atalhos no mesmo modelo dos tiles) */}
      <ManagementGrid groups={managementGroups} title={t("adminManagementTitle")} />

      {/* Secção 2: AÇÕES IMEDIATAS */}
      <ActionItems
        pendingPayments={actionItems.pendingPayments}
        pendingTrials={actionItems.pendingTrials}
        lowAttendanceLessons={actionItems.lowAttendanceLessons}
        labels={{
          title: t("adminActionItemsTitle"),
          tabPayments: t("adminTabPayments"),
          tabTrials: t("adminTabTrials"),
          tabLowAttendance: t("adminTabLowAttendance"),
          managePayment: t("adminManagePayment"),
          viewLesson: t("adminViewLesson"),
          emptyPayments: t("adminEmptyPayments"),
          emptyTrials: t("adminEmptyTrials"),
          emptyLowAttendance: t("adminEmptyLowAttendance"),
          closeModal: t("adminActionItemsCloseModal"),
          cardHint: t("adminActionItemsCardHint"),
        }}
      />

      {/* Secção 3: VISÃO GERAL - carregado dinamicamente para reduzir bundle inicial */}
      <OverviewChartsDynamic
        studentsGrowthByMonth={stats.studentsGrowthByMonth}
        revenueAccumulatedMonths={stats.revenueAccumulatedMonths}
        attendanceByModality30Days={stats.attendanceByModality30Days}
        modalityNames={modalityNames}
        schoolName={schoolName}
        labels={{
          growthTitle: t("adminChartGrowth"),
          revenueTitle: t("adminChartRevenue"),
          modalityTitle: t("adminChartModality"),
          noData: t("adminNoData"),
        }}
      />

    </>
  );
}
