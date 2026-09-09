import type { SidebarLink } from "@/components/Sidebar";
import type { MessageKey } from "@/lib/i18n";

/**
 * Menu lateral do backoffice — usar apenas quando `getCurrentDbUser().role === "ADMIN"`.
 * Não incluir em layouts de aluno ou coach.
 */
export function getAdminBackofficeSidebarLinks(t: (key: MessageKey) => string): SidebarLink[] {
  return [
    { label: t("navHome"), href: "/admin", icon: "🏠" },
    { label: t("navDashboard"), href: "/admin/dashboard", icon: "📊", section: t("adminGroupShortcuts") },
    { label: t("navStudents"), href: "/admin/alunos", icon: "🧑‍🎓", section: t("adminGroupPeople") },
    { label: t("navFamilies"), href: "/admin/familias", icon: "👨‍👩‍👧", section: t("adminGroupPeople") },
    { label: t("navAthletes"), href: "/admin/atletas", icon: "🤸", section: t("adminGroupPeople") },
    { label: t("navCoaches"), href: "/admin/coaches", icon: "👨‍🏫", section: t("adminGroupPeople") },
    { label: t("navTrials"), href: "/admin/experimentais", icon: "🧪", section: t("adminGroupPeople") },
    { label: t("navSchools"), href: "/admin/escolas", icon: "🏫", section: t("adminGroupAcademic") },
    { label: t("navClasses"), href: "/admin/turmas", icon: "🥋", section: t("adminGroupAcademic") },
    { label: t("navPresence"), href: "/admin/presenca", icon: "✅", section: t("adminGroupAcademic") },
    { label: t("navModalities"), href: "/admin/modalidades", icon: "🥊", section: t("adminGroupAcademic") },
    { label: t("navLocations"), href: "/admin/locais", icon: "📍", section: t("adminGroupAcademic") },
    { label: "Arbitragem", href: "/coach/arbitragem", icon: "🏆", section: t("adminGroupAcademic") },
    { label: t("navPlans"), href: "/admin/planos", icon: "💳", section: t("adminGroupContentFinance") },
    { label: t("navCourses"), href: "/admin/cursos", icon: "📚", section: t("adminGroupContentFinance") },
    { label: t("navWeekTheme"), href: "/admin/tema-semana", icon: "🗓️", section: t("adminGroupContentFinance") },
    { label: t("navEventsAdmin"), href: "/admin/eventos", icon: "✨", section: t("adminGroupContentFinance") },
    { label: t("navFinance"), href: "/admin/financeiro", icon: "💶", section: t("adminGroupContentFinance") },
    { label: t("navLoja"), href: "/admin/loja", icon: "🛍️", section: t("adminGroupContentFinance") },
    {
      label: t("navEvaluationDocs"),
      href: "/como-sou-avaliado",
      groupActiveHrefs: ["/como-sou-avaliado", "/sistema-pontuacao"],
      icon: "📊",
      section: t("adminGroupPlatform"),
    },
    {
      label: t("navEvaluationCriteria"),
      href: "/admin/avaliacao",
      icon: "🎯",
      section: t("adminGroupPlatform"),
      children: [
        { label: t("navGeneralDimensions"), href: "/admin/componentes-gerais" },
        { label: t("navModalityInsights"), href: "/admin/desempenho-modalidades" },
      ],
    },
    { label: t("navMissions"), href: "/admin/missoes", icon: "🎯", section: t("adminGroupPlatform") },
    { label: t("navGoals"), href: "/admin/metas", icon: "📌", section: t("adminGroupPlatform") },
    { label: t("navSettings"), href: "/admin/configuracoes", icon: "⚙️", section: t("adminGroupPlatform") },
    { label: t("navPermissions"), href: "/admin/permissoes", icon: "🔐", section: t("adminGroupPlatform") },
  ];
}
