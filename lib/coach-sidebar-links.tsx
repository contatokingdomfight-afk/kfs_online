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

const ICON_SIZE = 18;

/**
 * Barra lateral principal da área Coach (mesma lista usada no layout e em ecrãs de avaliação).
 *
 * Ficheiro `.tsx` (não `.ts`): os ícones têm de ser resolvidos aqui, em JSX — ver nota em
 * lib/admin-sidebar-links.tsx sobre a fronteira Server → Client com `<ResponsiveShell>`.
 */
export function getCoachShellSidebarLinks(
  t: TFn,
  options: { showAdminEntry: boolean; coachStudentId: string | null; isSchoolAssistant?: boolean }
): SidebarLink[] {
  const { showAdminEntry, coachStudentId, isSchoolAssistant } = options;
  if (isSchoolAssistant) {
    return [
      { label: t("navHome"), href: "/coach", icon: <Home size={ICON_SIZE} aria-hidden /> },
      { label: t("navManageClasses"), href: "/coach/aula", icon: <CalendarCheck size={ICON_SIZE} aria-hidden />, section: t("coachGroupClasses") },
      { label: t("navRoundTimer"), href: "/coach/round-timer", icon: <Timer size={ICON_SIZE} aria-hidden />, section: t("coachGroupClasses") },
      { label: t("navAgenda"), href: "/coach/agenda", icon: <Calendar size={ICON_SIZE} aria-hidden />, section: t("coachGroupClasses") },
      { label: t("navEventsSchoolCheckIn"), href: "/coach/eventos", icon: <Sparkles size={ICON_SIZE} aria-hidden />, section: t("coachGroupClasses") },
      { label: "Arbitragem", href: "/coach/arbitragem" as string, icon: <Scale size={ICON_SIZE} aria-hidden />, section: t("coachGroupClasses") },
      { label: t("navSettings"), href: "/coach/configuracoes" as string, icon: <Settings size={ICON_SIZE} aria-hidden />, section: t("coachGroupAccount") },
      { label: t("myStudentArea"), href: "/dashboard" as string, icon: <GraduationCap size={ICON_SIZE} aria-hidden />, section: t("coachGroupAccount") },
    ];
  }
  return [
    ...(showAdminEntry ? [{ label: "Admin", href: "/admin" as string, icon: <Shield size={ICON_SIZE} aria-hidden /> }] : []),
    { label: t("navHome"), href: "/coach", icon: <Home size={ICON_SIZE} aria-hidden /> },
    { label: t("navManageClasses"), href: "/coach/aula", icon: <CalendarCheck size={ICON_SIZE} aria-hidden />, section: t("coachGroupClasses") },
    { label: t("navRoundTimer"), href: "/coach/round-timer", icon: <Timer size={ICON_SIZE} aria-hidden />, section: t("coachGroupClasses") },
    { label: t("navAgenda"), href: "/coach/agenda", icon: <Calendar size={ICON_SIZE} aria-hidden />, section: t("coachGroupClasses") },
    { label: t("navEvents"), href: "/coach/eventos", icon: <Sparkles size={ICON_SIZE} aria-hidden />, section: t("coachGroupClasses") },
    { label: "Arbitragem", href: "/coach/arbitragem" as string, icon: <Scale size={ICON_SIZE} aria-hidden />, section: t("coachGroupClasses") },
    { label: t("navStudents"), href: "/coach/alunos", icon: <GraduationCap size={ICON_SIZE} aria-hidden />, section: t("coachGroupStudents") },
    { label: t("navAthletesCoach"), href: "/coach/atletas", icon: <Dumbbell size={ICON_SIZE} aria-hidden />, section: t("coachGroupStudents") },
    { label: t("navTrials"), href: "/coach/experimentais", icon: <FlaskConical size={ICON_SIZE} aria-hidden />, section: t("coachGroupStudents") },
    {
      label: t("navEvaluationDocs"),
      href: "/como-sou-avaliado",
      groupActiveHrefs: ["/como-sou-avaliado", "/sistema-pontuacao"],
      icon: <Gauge size={ICON_SIZE} aria-hidden />,
      section: t("coachGroupStudents"),
    },
    {
      label: t("navModalityInsights"),
      href: "/coach/desempenho-modalidades",
      icon: <LineChart size={ICON_SIZE} aria-hidden />,
      section: t("coachGroupStudents"),
    },
    {
      label: "Cobertura de avaliações",
      href: "/coach/cobertura-avaliacoes" as string,
      icon: <ListChecks size={ICON_SIZE} aria-hidden />,
      section: t("coachGroupStudents"),
    },
    { label: t("navWeekTheme"), href: "/coach/tema-semana", icon: <CalendarDays size={ICON_SIZE} aria-hidden />, section: t("coachGroupContent") },
    {
      label: t("navWeekThemeMonthly"),
      href: "/coach/tema-semana/mensal",
      icon: <CalendarRange size={ICON_SIZE} aria-hidden />,
      section: t("coachGroupContent"),
    },
    { label: "Meus Cursos", href: "/coach/cursos" as string, icon: <Book size={ICON_SIZE} aria-hidden />, section: t("coachGroupContent") },
    { label: t("libraryTitle"), href: "/coach/biblioteca" as string, icon: <BookOpen size={ICON_SIZE} aria-hidden />, section: t("coachGroupContent") },
    { label: "Financeiro", href: "/coach/financeiro" as string, icon: <Banknote size={ICON_SIZE} aria-hidden />, section: t("coachGroupAccount") },
    { label: t("navSettings"), href: "/coach/configuracoes" as string, icon: <Settings size={ICON_SIZE} aria-hidden />, section: t("coachGroupAccount") },
    ...(coachStudentId
      ? [{ label: t("myStudentArea"), href: "/dashboard" as string, icon: <GraduationCap size={ICON_SIZE} aria-hidden />, section: t("coachGroupAccount") }]
      : []),
  ];
}
