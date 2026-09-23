import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Receipt,
  ShoppingBag,
  Banknote,
  LineChart,
  GraduationCap,
  Dumbbell,
  Whistle,
  FlaskConical,
  Handshake,
  ListChecks,
  School,
  Layers,
  CheckCircle2,
  Swords,
  MapPin,
  FileText,
  CreditCard,
  Book,
  Sparkles,
  ClipboardList,
  Target,
  Megaphone,
  TrendingUp,
  Settings,
  Lock,
} from "lucide-react";
import { getCachedSchools } from "@/lib/cached-reference-data";
import { getActionItemsData } from "@/lib/admin-action-items";
import { getTodayTrialClassesForAdmin } from "@/lib/today-trial-classes";
import { TodayTrialClassesHighlight } from "@/components/TodayTrialClassesHighlight";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { AdminSchoolFilter } from "./AdminSchoolFilter";
import { ActionItems } from "./_components/ActionItems";
import { ManagementGrid } from "./_components/ManagementGrid";
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
  const [locale, schools, actionItems, todayTrials] = await Promise.all([
    getLocaleFromCookies(),
    getCachedSchools(client),
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

  const financeShortcuts = canAccessFinanceiro(access)
    ? [
        { href: "/admin/dashboard", icon: LayoutDashboard, label: t("adminDashboardShortcut") },
        { href: "/admin/loja/vendas/novo", icon: Receipt, label: t("adminQuickRegisterSale") },
        { href: "/admin/loja", icon: ShoppingBag, label: t("navLoja") },
        { href: "/admin/financeiro", icon: Banknote, label: t("navFinance") },
        { href: "/admin/financeiro/relatorio", icon: LineChart, label: t("adminQuickFinanceReport") },
      ]
    : [];

  const managementGroups = [
    ...(financeShortcuts.length
      ? [{ title: t("adminGroupShortcuts"), items: financeShortcuts }]
      : []),
    {
      title: t("adminGroupPeople"),
      items: [
        { href: "/admin/alunos", icon: GraduationCap, label: t("navStudents") },
        { href: "/admin/atletas", icon: Dumbbell, label: t("navAthletes") },
        { href: "/admin/coaches", icon: Whistle, label: t("navCoaches") },
        { href: "/admin/experimentais", icon: FlaskConical, label: t("navTrials") },
        { href: "/admin/indicacoes", icon: Handshake, label: "Indicações" },
        { href: "/coach/cobertura-avaliacoes", icon: ListChecks, label: "Cobertura de avaliações" },
      ],
    },
    {
      title: t("adminGroupAcademic"),
      items: [
        { href: "/admin/escolas", icon: School, label: t("navSchools") },
        { href: "/admin/turmas", icon: Layers, label: t("navClasses") },
        { href: "/admin/presenca", icon: CheckCircle2, label: t("navPresence") },
        { href: "/admin/modalidades", icon: Swords, label: t("navModalities") },
        { href: "/admin/locais", icon: MapPin, label: t("navLocations") },
        { href: "/admin/documentos-adesao", icon: FileText, label: "Adesões pendentes" },
      ],
    },
    {
      title: t("adminGroupContentFinance"),
      items: [
        { href: "/admin/planos", icon: CreditCard, label: t("navPlans") },
        { href: "/admin/cursos", icon: Book, label: t("navCourses") },
        { href: "/admin/eventos", icon: Sparkles, label: t("navEventsAdmin") },
      ],
    },
    {
      title: t("adminGroupPlatform"),
      items: [
        { href: "/admin/avaliacao", icon: ClipboardList, label: t("navEvaluationCriteria") },
        { href: "/admin/missoes", icon: Target, label: t("navMissions") },
        { href: "/admin/tribo", icon: Megaphone, label: "Tribo" },
        { href: "/admin/metas", icon: TrendingUp, label: t("navGoals") },
        { href: "/admin/configuracoes", icon: Settings, label: t("navSettings") },
        { href: "/admin/permissoes", icon: Lock, label: t("navPermissions") },
      ],
    },
  ];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <AdminSchoolFilter schools={schools} currentSchoolId={schoolId} />
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
    </>
  );
}
