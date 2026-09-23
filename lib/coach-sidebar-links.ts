import "server-only";

import {
  Home,
  CalendarCheck,
  Timer,
  Calendar,
  Sparkles,
  Scale,
  Settings,
  GraduationCap,
  Shield,
  Dumbbell,
  FlaskConical,
  Gauge,
  LineChart,
  ListChecks,
  CalendarDays,
  CalendarRange,
  Book,
  BookOpen,
  Banknote,
} from "lucide-react";
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
      { label: t("navHome"), href: "/coach", icon: Home },
      { label: t("navManageClasses"), href: "/coach/aula", icon: CalendarCheck, section: t("coachGroupClasses") },
      { label: t("navRoundTimer"), href: "/coach/round-timer", icon: Timer, section: t("coachGroupClasses") },
      { label: t("navAgenda"), href: "/coach/agenda", icon: Calendar, section: t("coachGroupClasses") },
      { label: t("navEventsSchoolCheckIn"), href: "/coach/eventos", icon: Sparkles, section: t("coachGroupClasses") },
      { label: "Arbitragem", href: "/coach/arbitragem" as string, icon: Scale, section: t("coachGroupClasses") },
      { label: t("navSettings"), href: "/coach/configuracoes" as string, icon: Settings, section: t("coachGroupAccount") },
      { label: t("myStudentArea"), href: "/dashboard" as string, icon: GraduationCap, section: t("coachGroupAccount") },
    ];
  }
  return [
    ...(showAdminEntry ? [{ label: "Admin", href: "/admin" as string, icon: Shield }] : []),
    { label: t("navHome"), href: "/coach", icon: Home },
    { label: t("navManageClasses"), href: "/coach/aula", icon: CalendarCheck, section: t("coachGroupClasses") },
    { label: t("navRoundTimer"), href: "/coach/round-timer", icon: Timer, section: t("coachGroupClasses") },
    { label: t("navAgenda"), href: "/coach/agenda", icon: Calendar, section: t("coachGroupClasses") },
    { label: t("navEvents"), href: "/coach/eventos", icon: Sparkles, section: t("coachGroupClasses") },
    { label: "Arbitragem", href: "/coach/arbitragem" as string, icon: Scale, section: t("coachGroupClasses") },
    { label: t("navStudents"), href: "/coach/alunos", icon: GraduationCap, section: t("coachGroupStudents") },
    { label: t("navAthletesCoach"), href: "/coach/atletas", icon: Dumbbell, section: t("coachGroupStudents") },
    { label: t("navTrials"), href: "/coach/experimentais", icon: FlaskConical, section: t("coachGroupStudents") },
    {
      label: t("navEvaluationDocs"),
      href: "/como-sou-avaliado",
      groupActiveHrefs: ["/como-sou-avaliado", "/sistema-pontuacao"],
      icon: Gauge,
      section: t("coachGroupStudents"),
    },
    {
      label: t("navModalityInsights"),
      href: "/coach/desempenho-modalidades",
      icon: LineChart,
      section: t("coachGroupStudents"),
    },
    {
      label: "Cobertura de avaliações",
      href: "/coach/cobertura-avaliacoes" as string,
      icon: ListChecks,
      section: t("coachGroupStudents"),
    },
    { label: t("navWeekTheme"), href: "/coach/tema-semana", icon: CalendarDays, section: t("coachGroupContent") },
    {
      label: t("navWeekThemeMonthly"),
      href: "/coach/tema-semana/mensal",
      icon: CalendarRange,
      section: t("coachGroupContent"),
    },
    { label: "Meus Cursos", href: "/coach/cursos" as string, icon: Book, section: t("coachGroupContent") },
    { label: t("libraryTitle"), href: "/coach/biblioteca" as string, icon: BookOpen, section: t("coachGroupContent") },
    { label: "Financeiro", href: "/coach/financeiro" as string, icon: Banknote, section: t("coachGroupAccount") },
    { label: t("navSettings"), href: "/coach/configuracoes" as string, icon: Settings, section: t("coachGroupAccount") },
    ...(coachStudentId
      ? [{ label: t("myStudentArea"), href: "/dashboard" as string, icon: GraduationCap, section: t("coachGroupAccount") }]
      : []),
  ];
}
