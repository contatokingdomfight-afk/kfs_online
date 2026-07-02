import type { SidebarLink } from "@/components/Sidebar";
import type { MessageKey } from "@/lib/i18n";

/**
 * Menu lateral do backoffice — usar apenas quando `getCurrentDbUser().role === "ADMIN"`.
 * Não incluir em layouts de aluno ou coach.
 */
export function getAdminBackofficeSidebarLinks(t: (key: MessageKey) => string): SidebarLink[] {
  return [
    { label: t("navHome"), href: "/admin" },
    { label: t("navStudents"), href: "/admin/alunos" },
    { label: t("navFamilies"), href: "/admin/familias" },
    { label: t("navAthletes"), href: "/admin/atletas" },
    { label: t("navCoaches"), href: "/admin/coaches" },
    { label: t("navTrials"), href: "/admin/experimentais" },
    { label: t("navLeads"), href: "/admin/leads" },
    { label: t("navSchools"), href: "/admin/escolas" },
    { label: t("navClasses"), href: "/admin/turmas" },
    { label: t("navModalities"), href: "/admin/modalidades" },
    { label: t("navLocations"), href: "/admin/locais" },
    { label: t("navPlans"), href: "/admin/planos" },
    { label: t("navCourses"), href: "/admin/cursos" },
    { label: t("navEventsAdmin"), href: "/admin/eventos" },
    {
      label: t("navEvaluationDocs"),
      href: "/como-sou-avaliado",
      groupActiveHrefs: ["/como-sou-avaliado", "/sistema-pontuacao"],
    },
    {
      label: t("navEvaluationCriteria"),
      href: "/admin/avaliacao",
      children: [
        { label: t("navGeneralDimensions"), href: "/admin/componentes-gerais" },
        { label: t("navModalityInsights"), href: "/admin/desempenho-modalidades" },
      ],
    },
    { label: t("navMissions"), href: "/admin/missoes" },
    { label: t("navFinance"), href: "/admin/financeiro" },
    { label: t("navLoja"), href: "/admin/loja" },
    { label: t("navSettings"), href: "/admin/configuracoes" },
    { label: t("navPermissions"), href: "/admin/permissoes" },
  ];
}
