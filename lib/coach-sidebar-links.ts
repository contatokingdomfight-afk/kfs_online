import "server-only";

import type { SidebarLink } from "@/components/Sidebar";
import type { MessageKey } from "@/lib/i18n";

type TFn = (key: MessageKey) => string;

/**
 * Barra lateral principal da área Coach (mesma lista usada no layout e em ecrãs de avaliação).
 */
export function getCoachShellSidebarLinks(
  t: TFn,
  options: { showAdminEntry: boolean; coachStudentId: string | null; isSchoolAssistant?: boolean }
): SidebarLink[] {
  const { showAdminEntry, coachStudentId, isSchoolAssistant } = options;
  if (isSchoolAssistant) {
    return [
      { label: t("navHome"), href: "/coach" },
      { label: t("navManageClasses"), href: "/coach/aula" },
      { label: t("navRoundTimer"), href: "/coach/round-timer" },
      { label: t("navAgenda"), href: "/coach/agenda" },
      { label: t("navEventsSchoolCheckIn"), href: "/coach/eventos" },
      { label: t("navSettings"), href: "/coach/configuracoes" as string },
      { label: t("myStudentArea"), href: "/dashboard" as string },
    ];
  }
  return [
    ...(showAdminEntry ? [{ label: "Admin", href: "/admin" as string }] : []),
    { label: t("navHome"), href: "/coach" },
    { label: t("navManageClasses"), href: "/coach/aula" },
    { label: t("navRoundTimer"), href: "/coach/round-timer" },
    { label: t("navAgenda"), href: "/coach/agenda" },
    { label: t("navEvents"), href: "/coach/eventos" },
    { label: t("navWeekTheme"), href: "/coach/tema-semana" },
    { label: t("navStudents"), href: "/coach/alunos" },
    { label: t("navAthletesCoach"), href: "/coach/atletas" },
    { label: t("navTrials"), href: "/coach/experimentais" },
    {
      label: t("navEvaluationDocs"),
      href: "/como-sou-avaliado",
      groupActiveHrefs: ["/como-sou-avaliado", "/sistema-pontuacao"],
    },
    { label: t("navModalityInsights"), href: "/coach/desempenho-modalidades" },
    { label: "Meus Cursos", href: "/coach/cursos" as string },
    { label: t("libraryTitle"), href: "/coach/biblioteca" as string },
    { label: "Financeiro", href: "/coach/financeiro" as string },
    { label: t("navSettings"), href: "/coach/configuracoes" as string },
    ...(coachStudentId ? [{ label: t("myStudentArea"), href: "/dashboard" as string }] : []),
  ];
}
