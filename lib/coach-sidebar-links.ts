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
      { label: t("navHome"), href: "/coach", icon: "🏠" },
      { label: t("navManageClasses"), href: "/coach/aula", icon: "🥋", section: t("coachGroupClasses") },
      { label: t("navRoundTimer"), href: "/coach/round-timer", icon: "⏱️", section: t("coachGroupClasses") },
      { label: t("navAgenda"), href: "/coach/agenda", icon: "📅", section: t("coachGroupClasses") },
      { label: t("navEventsSchoolCheckIn"), href: "/coach/eventos", icon: "✨", section: t("coachGroupClasses") },
      { label: "Arbitragem", href: "/coach/arbitragem" as string, icon: "🥊", section: t("coachGroupClasses") },
      { label: t("navSettings"), href: "/coach/configuracoes" as string, icon: "⚙️", section: t("coachGroupAccount") },
      { label: t("myStudentArea"), href: "/dashboard" as string, icon: "🎓", section: t("coachGroupAccount") },
    ];
  }
  return [
    ...(showAdminEntry ? [{ label: "Admin", href: "/admin" as string, icon: "🔐" }] : []),
    { label: t("navHome"), href: "/coach", icon: "🏠" },
    { label: t("navManageClasses"), href: "/coach/aula", icon: "🥋", section: t("coachGroupClasses") },
    { label: t("navRoundTimer"), href: "/coach/round-timer", icon: "⏱️", section: t("coachGroupClasses") },
    { label: t("navAgenda"), href: "/coach/agenda", icon: "📅", section: t("coachGroupClasses") },
    { label: t("navEvents"), href: "/coach/eventos", icon: "✨", section: t("coachGroupClasses") },
    { label: "Arbitragem", href: "/coach/arbitragem" as string, icon: "🥊", section: t("coachGroupClasses") },
    { label: t("navStudents"), href: "/coach/alunos", icon: "🧑‍🎓", section: t("coachGroupStudents") },
    { label: t("navAthletesCoach"), href: "/coach/atletas", icon: "🤸", section: t("coachGroupStudents") },
    { label: t("navTrials"), href: "/coach/experimentais", icon: "🧪", section: t("coachGroupStudents") },
    {
      label: t("navEvaluationDocs"),
      href: "/como-sou-avaliado",
      groupActiveHrefs: ["/como-sou-avaliado", "/sistema-pontuacao"],
      icon: "📊",
      section: t("coachGroupStudents"),
    },
    {
      label: t("navModalityInsights"),
      href: "/coach/desempenho-modalidades",
      icon: "📈",
      section: t("coachGroupStudents"),
    },
    { label: t("navWeekTheme"), href: "/coach/tema-semana", icon: "🗓️", section: t("coachGroupContent") },
    {
      label: t("navWeekThemeMonthly"),
      href: "/coach/tema-semana/mensal",
      icon: "📆",
      section: t("coachGroupContent"),
    },
    { label: "Meus Cursos", href: "/coach/cursos" as string, icon: "🎓", section: t("coachGroupContent") },
    { label: t("libraryTitle"), href: "/coach/biblioteca" as string, icon: "📚", section: t("coachGroupContent") },
    { label: "Financeiro", href: "/coach/financeiro" as string, icon: "💶", section: t("coachGroupAccount") },
    { label: t("navSettings"), href: "/coach/configuracoes" as string, icon: "⚙️", section: t("coachGroupAccount") },
    ...(coachStudentId
      ? [{ label: t("myStudentArea"), href: "/dashboard" as string, icon: "🎓", section: t("coachGroupAccount") }]
      : []),
  ];
}
