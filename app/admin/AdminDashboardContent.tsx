import type { SupabaseClient } from "@supabase/supabase-js";
import dynamic from "next/dynamic";
import { getAdminDashboardStats } from "@/lib/admin-dashboard-stats";
import { getActionItemsData } from "@/lib/admin-action-items";
import { AdminSchoolFilter } from "./AdminSchoolFilter";
import { BusinessHealthStats } from "./_components/BusinessHealthStats";
import { ActionItems } from "./_components/ActionItems";
import { ManagementGrid } from "./_components/ManagementGrid";
import { getTranslations } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";

const OverviewCharts = dynamic(() => import("./_components/OverviewCharts").then((m) => ({ default: m.OverviewCharts })), {
  loading: () => (
    <div className="card" style={{ padding: 24, minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
      A carregar gráficos…
    </div>
  ),
  ssr: false,
});

type Props = {
  client: SupabaseClient;
  schoolId: string | null;
};

export async function AdminDashboardContent({ client, schoolId }: Props) {
  const [locale, stats, actionItems] = await Promise.all([
    getLocaleFromCookies(),
    getAdminDashboardStats(client, schoolId),
    getActionItemsData(client, schoolId),
  ]);
  const t = getTranslations(locale as "pt" | "en");

  const modalityNames: Record<string, string> = {};
  stats.studentsByModality.forEach((m) => {
    modalityNames[m.modalityCode] = m.modalityName;
  });

  const schoolName = schoolId ? stats.schools.find((s) => s.id === schoolId)?.name ?? "Todas" : "Todas";

  const managementGroups = [
    {
      title: t("adminGroupPeople"),
      items: [
        { href: "/admin/alunos", icon: "🧑‍🎓", label: t("navStudents") },
        { href: "/admin/coaches", icon: "👨‍🏫", label: t("navCoaches") },
        { href: "/admin/atletas", icon: "🤸", label: t("navAthletes") },
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
        { href: "/admin/cursos", icon: "📚", label: t("navCourses") },
        { href: "/admin/planos", icon: "💰", label: t("navPlans") },
        { href: "/admin/financeiro", icon: "💶", label: t("navFinance") },
        { href: "/admin/eventos", icon: "✨", label: t("navEventsAdmin") },
      ],
    },
    {
      title: t("adminGroupPlatform"),
      items: [
        { href: "/admin/configuracoes", icon: "⚙️", label: t("navSettings") },
        { href: "/admin/missoes", icon: "🎯", label: t("navMissions") },
        { href: "/admin/avaliacao", icon: "📊", label: t("navEvaluationCriteria") },
      ],
    },
  ];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <AdminSchoolFilter schools={stats.schools} currentSchoolId={schoolId} />
      </div>

      {/* Secção 1: SAÚDE DO NEGÓCIO */}
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
        }}
      />

      {/* Secção 3: VISÃO GERAL - carregado dinamicamente para reduzir bundle inicial */}
      <OverviewCharts
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

      {/* Secção 4: GESTÃO DA PLATAFORMA */}
      <ManagementGrid groups={managementGroups} title={t("adminManagementTitle")} />
    </>
  );
}
